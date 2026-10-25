import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import { ErrorState, PageLoader } from "@/components/common/States";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { useCatalog } from "@/lib/queries";
import type { Catalog, EstimateInput, EstimateResult, PackageTier } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

// A common reference project so packages can be compared on a real number.
const SAMPLE_ITEMS: [string, number][] = [
  ["Modular Kitchen", 1],
  ["Wardrobe", 2],
  ["Bed with Storage", 2],
  ["TV Unit", 1],
  ["Sofa (3-seater)", 1],
];

function samplePayload(catalog: Catalog, tier: PackageTier): EstimateInput {
  return {
    property_type: "residential",
    property_subtype: "2 BHK",
    project_type: "new",
    scope: "full",
    area_sqft: 800,
    room_count: 4,
    package_tier: tier,
    city: "",
    furniture: SAMPLE_ITEMS.flatMap(([name, quantity]) => {
      const item = catalog.furniture_items.find((i) => i.name === name);
      return item ? [{ id: item.id, quantity }] : [];
    }),
    services: [],
  };
}

const FURNITURE_GRADE: Record<PackageTier, string> = {
  basic: "Standard laminates, basic hardware",
  standard: "Premium laminates, soft-close hardware",
  premium: "Acrylic, veneer and custom builds",
};

const Packages = () => {
  usePageTitle("Packages");
  const { data: catalog, isLoading, error, refetch } = useCatalog();

  const samples = useQueries({
    queries: (catalog?.packages ?? []).map((pkg) => ({
      queryKey: ["estimate-preview", "sample", pkg.tier],
      queryFn: () => api.post<EstimateResult>("/estimates/preview/", samplePayload(catalog!, pkg.tier)),
      staleTime: 5 * 60_000,
    })),
  });

  if (isLoading) return <PageLoader />;
  if (error || !catalog) {
    return (
      <div className="container-page py-12">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const packages = catalog.packages;
  const rows: { label: string; values: string[] }[] = [
    { label: "Design, civil & finishing", values: packages.map((p) => `${formatINR(p.rate_per_sqft)} / sq.ft`) },
    {
      label: "Furniture pricing",
      values: packages.map((p) =>
        p.furniture_multiplier === 1 ? "Base price" : `+${Math.round((p.furniture_multiplier - 1) * 100)}% on base`,
      ),
    },
    { label: "Furniture finish", values: packages.map((p) => FURNITURE_GRADE[p.tier]) },
    { label: "Typical timeline", values: packages.map((p) => `From ${p.base_timeline_weeks} weeks`) },
    {
      label: "Warranty",
      values: packages.map((p) => `${p.warranty_years} ${p.warranty_years === 1 ? "year" : "years"}`),
    },
  ];

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Packages"
        title="Three ways to build your space"
        description="Every package covers design, civil work, false ceiling, lighting and finishing. What changes is the material grade, the level of customisation and the warranty."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {packages.map((pkg, index) => {
          const sample = samples[index]?.data;
          return (
            <article key={pkg.tier} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <h2 className="font-serif text-2xl text-foreground">{pkg.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{pkg.tagline}</p>
              <p className="mt-5 font-serif text-3xl text-foreground">
                {formatINR(pkg.rate_per_sqft)}
                <span className="font-sans text-sm text-muted-foreground"> / sq.ft</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 border-t border-border pt-5">
                {pkg.inclusions.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-foreground">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-md bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">Sample 2 BHK (800 sq.ft) with furniture</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {sample ? formatINR(sample.total) : samples[index]?.isError ? "Unavailable" : "Calculating..."}
                </p>
              </div>
              <Button asChild className="mt-5" variant={pkg.tier === "standard" ? "default" : "outline"}>
                <Link to={`/estimate?package=${pkg.tier}`}>Estimate with {pkg.title.replace(" Package", "")}</Link>
              </Button>
            </article>
          );
        })}
      </div>

      <section className="mt-16">
        <h2 className="section-title">Side by side</h2>
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-1/4 px-5 py-4 font-medium text-muted-foreground" scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {packages.map((pkg) => (
                  <th key={pkg.tier} className="px-5 py-4 font-serif text-lg font-normal text-foreground" scope="col">
                    {pkg.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-5 py-3.5 text-left font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={packages[i].tier} className="px-5 py-3.5 text-foreground">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-5 py-3.5 text-left font-normal text-muted-foreground">
                  Sample 2 BHK total
                </th>
                {packages.map((pkg, i) => (
                  <td key={pkg.tier} className="px-5 py-3.5 font-medium tabular-nums text-foreground">
                    {samples[i]?.data ? formatINR(samples[i].data!.total) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sample includes a modular kitchen, two wardrobes, two storage beds, a TV unit and a sofa, at base city pricing
          with 18% GST. Your estimate will differ.
        </p>
      </section>
    </div>
  );
};

export default Packages;
