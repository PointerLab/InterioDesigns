import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState, PageLoader } from "@/components/common/States";
import EstimateBreakdown from "@/components/estimate/EstimateBreakdown";
import { IconArrowLeft, IconCalendar, IconDownload, IconPencil, IconPrinter, IconTrash } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { queryKeys, useEstimate } from "@/lib/queries";
import { SITE } from "@/lib/site";
import type { Estimate } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";
import NotFound from "../NotFound";

const EstimateDetail = () => {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: estimate, isLoading, error, refetch } = useEstimate(id || null);
  usePageTitle(estimate?.title ?? "Estimate");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");

  const downloadPdf = useMutation({
    mutationFn: () => api.download(`/estimates/${id}/pdf/`, `INTERIO-${estimate?.reference ?? id}.pdf`),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const rename = useMutation({
    mutationFn: (value: string) => api.patch<Estimate>(`/estimates/${id}/`, { title: value }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.estimate(id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates });
      setRenaming(false);
      toast.success("Estimate renamed");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/estimates/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates });
      queryClient.removeQueries({ queryKey: queryKeys.estimate(id) });
      toast.success("Estimate deleted");
      navigate("/dashboard/estimates");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!id) return <NotFound />;
  if (isLoading) return <PageLoader />;
  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error || !estimate) return <ErrorState error={error} onRetry={() => refetch()} />;

  const facts = [
    ["Space", `${estimate.property_type_label}${estimate.property_subtype ? ` · ${estimate.property_subtype}` : ""}`],
    ["Project", estimate.project_type_label],
    ["Scope", estimate.scope_label],
    ["Area", `${formatNumber(estimate.area_sqft)} sq.ft · ${estimate.room_count} rooms`],
    ["Package", estimate.package_title],
    ["City", estimate.city || "Other city"],
  ];

  const handleRename = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim()) rename.mutate(title.trim());
  };

  return (
    <div>
      {/* Printed header, used by "Download PDF" */}
      <div className="print-only mb-8 border-b border-border pb-4">
        <p className="font-serif text-2xl tracking-[0.12em]">INTERIO</p>
        <p className="text-sm text-muted-foreground">
          {SITE.email} · {SITE.phone} · {SITE.address.slice(1).join(", ")}
        </p>
        <p className="mt-4 text-sm">
          Prepared for {user?.name} ({user?.email}) on {formatDate(new Date().toISOString())}
        </p>
      </div>

      <Link
        to="/dashboard/estimates"
        className="print-hide inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" /> All estimates
      </Link>

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <p className="eyebrow">{estimate.reference}</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground md:text-4xl">{estimate.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved {formatDate(estimate.created_at)}
            {estimate.updated_at.slice(0, 16) !== estimate.created_at.slice(0, 16) &&
              ` · updated ${formatDate(estimate.updated_at)}`}
          </p>
        </div>
        <div className="print-hide flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/dashboard/consultations?book=1&estimate=${estimate.id}`}>
              <IconCalendar /> Book consultation
            </Link>
          </Button>
          <Button variant="outline" onClick={() => downloadPdf.mutate()} disabled={downloadPdf.isPending}>
            <IconDownload /> {downloadPdf.isPending ? "Preparing PDF..." : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <IconPrinter /> Print
          </Button>
          <Button asChild variant="outline">
            <Link to={`/estimate?edit=${estimate.id}`}>
              <IconPencil /> Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setTitle(estimate.title);
              setRenaming(true);
            }}
          >
            Rename
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete estimate"
              >
                <IconTrash />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this estimate?</AlertDialogTitle>
                <AlertDialogDescription>
                  {estimate.reference} "{estimate.title}" will be removed from your account. Consultations linked to it
                  are kept. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => remove.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="print-plain mt-8 rounded-lg border border-border bg-card p-5 md:p-8">
        <EstimateBreakdown result={estimate.result} />
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <form onSubmit={handleRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename estimate</DialogTitle>
            </DialogHeader>
            <Input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              aria-label="Estimate name"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || rename.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstimateDetail;
