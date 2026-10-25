import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { useEstimates } from "@/lib/queries";

const Estimates = () => {
  const { data, isLoading, error, refetch } = useEstimates();

  return (
    <div className="space-y-8">
      <PageHeader
        title="My estimates"
        description="Every estimate you've saved. Open one to see the full breakdown, edit it or download a PDF."
        actions={
          <Button asChild>
            <Link to="/estimate">New estimate</Link>
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="No saved estimates yet"
          description="Work through the estimator and save the result. It will show up here."
          action={
            <Button asChild>
              <Link to="/estimate">Start an estimate</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Saved</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((estimate) => (
                  <TableRow key={estimate.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        to={`/dashboard/estimates/${estimate.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {estimate.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{estimate.reference}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {estimate.property_subtype || estimate.property_type_label} · {formatNumber(estimate.area_sqft)}{" "}
                      sq.ft
                      <p className="text-xs">{estimate.project_type_label}</p>
                    </TableCell>
                    <TableCell>{estimate.package_title}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(estimate.updated_at)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatINR(estimate.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.map((estimate) => (
              <li key={estimate.id}>
                <Link
                  to={`/dashboard/estimates/${estimate.id}`}
                  className="block rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{estimate.title}</p>
                    <p className="shrink-0 font-medium tabular-nums">{formatINR(estimate.total)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {estimate.reference} · {estimate.package_title} · {formatDate(estimate.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Estimates;
