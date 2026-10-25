import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/States";
import EstimateBreakdown from "@/components/estimate/EstimateBreakdown";
import { IconDownload, IconSearch } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { StaffEstimate, StaffEstimateDetail } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

const ALL = "all";

function LeadDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", "estimate", id],
    queryFn: () => api.get<StaffEstimateDetail>(`/staff/estimates/${id}/`),
    enabled: Boolean(id),
  });
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (lead: StaffEstimateDetail) => {
    setDownloading(true);
    try {
      await api.download(`/estimates/${lead.id}/pdf/`, `INTERIO-${lead.reference}.pdf`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {isLoading || !data ? (
          <>
            <DialogTitle className="sr-only">Estimate details</DialogTitle>
            {error ? <ErrorState error={error} /> : <PageLoader />}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">
                {data.reference} · {data.title}
              </DialogTitle>
              <DialogDescription>
                {data.customer_name} ·{" "}
                <a href={`mailto:${data.customer_email}`} className="text-primary hover:underline">
                  {data.customer_email}
                </a>
                {data.customer_phone && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={`tel:${data.customer_phone}`} className="text-primary hover:underline">
                      {data.customer_phone}
                    </a>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {data.property_type_label} {data.property_subtype && `(${data.property_subtype})`} ·{" "}
              {data.project_type_label} · {data.scope_label} · {formatNumber(data.area_sqft)} sq.ft ·{" "}
              {data.package_title} · {data.city || "Other city"}
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={() => handleDownload(data)} disabled={downloading}>
                <IconDownload /> {downloading ? "Preparing PDF..." : "Quotation PDF"}
              </Button>
            </div>
            <EstimateBreakdown result={data.result} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Leads = () => {
  usePageTitle("Estimates & leads");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pkg, setPkg] = useState(ALL);
  const [property, setProperty] = useState(ALL);
  const [openId, setOpenId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pkg !== ALL) params.set("package", pkg);
  if (property !== ALL) params.set("property_type", property);
  const qs = params.toString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff", "estimates", qs],
    queryFn: () => api.get<StaffEstimate[]>(`/staff/estimates/${qs ? `?${qs}` : ""}`),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.download(
        `/staff/estimates/export/${qs ? `?${qs}` : ""}`,
        `interio-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const total = data?.reduce((sum, row) => sum + Number(row.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estimates & leads"
        description="Every estimate customers have saved, with their contact details."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exporting || !data?.length}>
            <IconDownload /> {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, title or city"
            className="pl-9"
          />
        </div>
        <Select value={pkg} onValueChange={setPkg}>
          <SelectTrigger className="sm:w-44" aria-label="Package">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All packages</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={property} onValueChange={setProperty}>
          <SelectTrigger className="sm:w-44" aria-label="Property type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All spaces</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="office">Office</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="No estimates found" description="Try clearing the search or filters." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.length} estimates · {formatINR(total)} total value
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Saved</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setOpenId(row.id)}>
                    <TableCell>
                      <button type="button" className="text-left font-medium hover:text-primary">
                        {row.title}
                      </button>
                      <p className="text-xs text-muted-foreground">{row.reference}</p>
                    </TableCell>
                    <TableCell>
                      {row.customer_name}
                      <p className="text-xs text-muted-foreground">{row.customer_email}</p>
                      {row.customer_phone && <p className="text-xs text-muted-foreground">{row.customer_phone}</p>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.property_subtype || row.property_type_label} · {formatNumber(row.area_sqft)} sq.ft
                      <p className="text-xs">{row.city || "Other city"}</p>
                    </TableCell>
                    <TableCell>{row.package_title}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatINR(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <LeadDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};

export default Leads;
