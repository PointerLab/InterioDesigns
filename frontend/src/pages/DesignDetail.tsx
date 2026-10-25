import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import DesignCard, { SaveButton } from "@/components/common/DesignCard";
import { ErrorState, PageLoader } from "@/components/common/States";
import { IconArrowLeft, IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatINR, titleCase } from "@/lib/format";
import { queryKeys } from "@/lib/queries";
import type { Design } from "@/lib/types";
import NotFound from "./NotFound";

function estimateLink(design: Design) {
  const params = new URLSearchParams({ property: design.category, package: design.package_tier });
  if (design.room === "kitchen") params.set("scope", "kitchen");
  return `/estimate?${params}`;
}

const DesignDetail = () => {
  const { slug = "" } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.design(slug),
    queryFn: () => api.get<{ design: Design; related: Design[] }>(`/designs/${slug}/`),
  });

  if (isLoading) return <PageLoader />;
  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error || !data) {
    return (
      <div className="container-page py-12">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const { design, related } = data;

  return (
    <div className="container-page py-10">
      <Link
        to="/designs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" /> All designs
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-lg bg-muted">
          <img src={design.image} alt={design.title} className="aspect-[4/3] h-full w-full object-cover" />
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">
                {design.category_label} · {design.room_label}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-foreground md:text-4xl">{design.title}</h1>
            </div>
            <SaveButton design={design} className="mt-1 shrink-0 border border-border" />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Style</dt>
              <dd className="mt-0.5 font-medium">{design.style_label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Suggested package</dt>
              <dd className="mt-0.5 font-medium">{titleCase(design.package_tier)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Typical budget for this room</dt>
              <dd className="mt-0.5 font-medium">
                {formatINR(design.budget_min)} – {formatINR(design.budget_max)}
              </dd>
            </div>
          </dl>

          <p className="mt-6 leading-relaxed text-muted-foreground">{design.description}</p>

          {design.highlights.length > 0 && (
            <ul className="mt-6 space-y-2">
              {design.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link to={estimateLink(design)}>Estimate this look</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/dashboard/consultations?book=1">Talk to a designer</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The estimator opens with this space type and package selected.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="section-title">More {design.category_label.toLowerCase()} designs</h2>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <DesignCard key={item.id} design={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DesignDetail;
