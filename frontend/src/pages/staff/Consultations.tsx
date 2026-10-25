import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { formatINR, formatTime, formatWeekdayDate } from "@/lib/format";
import type { ConsultationStatus, StaffConsultation } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { value: string; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "requested", label: "To confirm" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const STATUSES: { value: ConsultationStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const Consultations = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("upcoming");
  const [editing, setEditing] = useState<StaffConsultation | null>(null);
  const [note, setNote] = useState("");

  const qs = filter === "upcoming" ? "upcoming=true" : filter === "all" ? "" : `status=${filter}`;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff", "consultations", qs],
    queryFn: () => api.get<StaffConsultation[]>(`/staff/consultations/${qs ? `?${qs}` : ""}`),
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: ConsultationStatus; staff_note?: string }) =>
      api.patch<StaffConsultation>(`/staff/consultations/${id}/`, body),
    onSuccess: (updated) => {
      toast.success(`Booking for ${updated.customer_name || updated.customer_email} updated`);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditing(null);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Confirm requests, add notes for customers and mark visits complete."
      />

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
              filter === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="No consultations here" description="Bookings customers make appear in this list." />
      ) : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li
              key={c.id}
              className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[150px_1fr_190px]"
            >
              <div>
                <p className="font-serif text-lg">{formatWeekdayDate(c.date)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(c.time_slot)} · {c.mode_label}
                </p>
              </div>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="font-medium">{c.customer_name || "Customer"}</p>
                <p className="text-muted-foreground">
                  <a href={`mailto:${c.customer_email}`} className="hover:text-foreground">
                    {c.customer_email}
                  </a>
                  {c.customer_phone && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={`tel:${c.customer_phone}`} className="hover:text-foreground">
                        {c.customer_phone}
                      </a>
                    </>
                  )}
                </p>
                {c.address && <p className="text-muted-foreground">Site: {c.address}</p>}
                {c.estimate_reference && (
                  <p className="text-muted-foreground">
                    Estimate {c.estimate_reference}
                    {c.estimate_total !== null && ` · ${formatINR(c.estimate_total)}`}
                  </p>
                )}
                {c.notes && <p className="text-muted-foreground">Customer note: "{c.notes}"</p>}
                {c.staff_note && <p className="text-foreground">Studio note: {c.staff_note}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Select
                  value={c.status}
                  onValueChange={(status) => update.mutate({ id: c.id, status: status as ConsultationStatus })}
                >
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(c);
                    setNote(c.staff_note);
                  }}
                >
                  {c.staff_note ? "Edit note" : "Add note"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note for {editing?.customer_name || "customer"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The customer sees this in their dashboard, e.g. the designer's name or the video call link.
          </p>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editing && update.mutate({ id: editing.id, staff_note: note })}
              disabled={update.isPending}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consultations;
