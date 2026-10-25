import { formatINR, formatNumber } from "@/lib/format";
import type { EstimateLine, EstimateResult } from "@/lib/types";

function Row({ label, detail, amount, strong }: { label: string; detail?: string; amount: number; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? "font-medium text-foreground" : ""}`}>
      <div className="min-w-0">
        <p className={strong ? "" : "text-foreground"}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <p className="shrink-0 tabular-nums">{formatINR(amount)}</p>
    </div>
  );
}

function LineTable({ title, lines, total }: { title: string; lines: EstimateLine[]; total: number }) {
  if (!lines.length) return null;
  return (
    <div className="break-inside-avoid">
      <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="py-2 pr-3 text-foreground">{line.name}</td>
              <td className="whitespace-nowrap py-2 pr-3 text-right text-muted-foreground">
                {formatNumber(line.quantity)} {line.unit === "sq.ft" ? "sq.ft" : line.quantity === 1 ? "unit" : "units"}{" "}
                × {formatINR(line.unit_price)}
              </td>
              <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatINR(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-medium">
            <td className="pt-2" colSpan={2}>
              Total {title.toLowerCase()}
            </td>
            <td className="pt-2 text-right tabular-nums">{formatINR(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Full, itemised breakdown of a calculated estimate. */
const EstimateBreakdown = ({ result }: { result: EstimateResult }) => {
  const { location } = result;
  const locationPct = Math.round((location.multiplier - 1) * 100);

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-foreground p-6 text-background">
        <p className="text-sm text-background/70">Estimated total, including GST</p>
        <p className="mt-1 font-serif text-4xl tabular-nums md:text-5xl">{formatINR(result.total)}</p>
        <p className="mt-2 text-sm text-background/70">
          Expected range {formatINR(result.range.low)} – {formatINR(result.range.high)} · about {result.timeline.weeks}{" "}
          weeks
        </p>
      </div>

      <div>
        <h3 className="mb-1 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">Summary</h3>
        <div className="divide-y divide-border text-sm">
          <Row
            label={result.base.label}
            detail={`${formatNumber(result.base.area)} sq.ft × ${formatINR(result.base.rate)} (${result.package.title})`}
            amount={result.base.amount}
          />
          <Row
            label="Furniture & modular units"
            detail={
              result.furniture.items.length
                ? `${result.furniture.items.length} item types at ${result.package.title} grade`
                : "None selected"
            }
            amount={result.furniture.amount}
          />
          <Row
            label="Services & renovation"
            detail={result.services.items.length ? `${result.services.items.length} selected` : "None selected"}
            amount={result.services.amount}
          />
          <Row label="Subtotal" amount={result.subtotal} strong />
          <Row
            label={location.city ? `City adjustment (${location.city})` : "City adjustment"}
            detail={
              locationPct === 0
                ? "Base pricing applies"
                : `${locationPct > 0 ? "+" : ""}${locationPct}% for local labour and material costs`
            }
            amount={location.adjustment}
          />
          <Row label={`GST (${Math.round(result.gst.rate * 100)}%)`} amount={result.gst.amount} />
          <Row label="Estimated total" amount={result.total} strong />
        </div>
      </div>

      <LineTable title="Furniture" lines={result.furniture.items} total={result.furniture.amount} />
      <LineTable title="Services" lines={result.services.items} total={result.services.amount} />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Where the money goes
          </h3>
          <ul className="space-y-2.5 text-sm">
            {result.categories.map((category) => {
              const share = result.subtotal ? (category.amount / result.subtotal) * 100 : 0;
              return (
                <li key={category.key}>
                  <div className="flex justify-between gap-3">
                    <span>{category.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatINR(category.amount)} · {Math.round(share)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(share, 1)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Shares of the subtotal, before city adjustment and GST.</p>
        </div>

        <div>
          <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Timeline · {result.timeline.weeks} weeks
          </h3>
          <ol className="space-y-2.5 text-sm">
            {result.timeline.phases.map((phase, index) => (
              <li key={phase.name} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="flex-1">{phase.name}</span>
                <span className="text-muted-foreground">
                  {phase.weeks} {phase.weeks === 1 ? "week" : "weeks"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {result.notes.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
          <p className="font-medium">Some items were left out</p>
          <ul className="mt-1 list-disc pl-5">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
    </div>
  );
};

export default EstimateBreakdown;
