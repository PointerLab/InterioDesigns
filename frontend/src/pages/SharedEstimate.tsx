import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/States";
import EstimateBreakdown from "@/components/estimate/EstimateBreakdown";
import EstimateFacts from "@/components/estimate/EstimateFacts";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { SharedEstimate } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

/** Read-only estimate opened from a share link. */
const SharedEstimatePage = () => {
  const { token = "" } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["shared-estimate", token],
    queryFn: () => api.get<SharedEstimate>(`/shared/${token}/`),
  });
  usePageTitle(data?.title ?? "Shared estimate");

  if (isLoading) return <PageLoader />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="This link isn't shared any more"
          description="The person who shared this estimate has turned the link off. You can make your own estimate in a few minutes."
          action={
            <Button asChild>
              <Link to="/estimate">Get your own estimate</Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <p className="eyebrow">Shared estimate · {data.reference}</p>
      <h1 className="mt-1 font-serif text-3xl text-foreground md:text-4xl">{data.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {formatDate(data.updated_at)}</p>

      <div className="mt-8">
        <EstimateFacts estimate={data} />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5 md:p-8">
        <EstimateBreakdown result={data.result} />
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-lg border border-border bg-muted p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Planning something similar?</p>
          <p className="text-sm text-muted-foreground">Price your own space, or talk it through with a designer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/estimate">Get your own estimate</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedEstimatePage;
