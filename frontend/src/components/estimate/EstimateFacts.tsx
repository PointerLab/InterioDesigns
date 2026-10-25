import { formatNumber } from "@/lib/format";
import type { EstimateSummary } from "@/lib/types";

type FactsSource = Pick<
  EstimateSummary,
  | "property_type_label"
  | "property_subtype"
  | "project_type_label"
  | "scope_label"
  | "area_sqft"
  | "room_count"
  | "package_title"
  | "city"
>;

/** Grid of the choices an estimate was made with. */
const EstimateFacts = ({ estimate }: { estimate: FactsSource }) => {
  const facts = [
    ["Space", `${estimate.property_type_label}${estimate.property_subtype ? ` · ${estimate.property_subtype}` : ""}`],
    ["Project", estimate.project_type_label],
    ["Scope", estimate.scope_label],
    ["Area", `${formatNumber(estimate.area_sqft)} sq.ft · ${estimate.room_count} rooms`],
    ["Package", estimate.package_title],
    ["City", estimate.city || "Other city"],
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm sm:grid-cols-3">
      {facts.map(([label, value]) => (
        <div key={label} className="bg-card px-4 py-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default EstimateFacts;
