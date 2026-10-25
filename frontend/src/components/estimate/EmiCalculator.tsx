import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthlyEmi } from "@/lib/emi";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const TENURES = [12, 24, 36, 48, 60];

/** Rough monthly instalments for financing an estimate. */
const EmiCalculator = ({ total }: { total: number }) => {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(11);
  const [months, setMonths] = useState(36);

  const loan = Math.round(total * (1 - downPct / 100));
  const emi = monthlyEmi(loan, rate, months);
  const interest = emi * months - loan;

  return (
    <div className="print-hide rounded-lg border border-border bg-card p-5 md:p-8">
      <h2 className="font-sans text-base font-medium">Pay in monthly instalments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        An estimate only. Your bank or lender sets the actual rate and terms.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <div>
          <Label htmlFor="emi-down" className="mb-1.5 block text-sm font-medium">
            Down payment (%)
          </Label>
          <Input
            id="emi-down"
            type="number"
            min={0}
            max={90}
            value={downPct}
            onChange={(e) => setDownPct(Math.min(90, Math.max(0, Number(e.target.value) || 0)))}
          />
        </div>
        <div>
          <Label htmlFor="emi-rate" className="mb-1.5 block text-sm font-medium">
            Interest rate (% a year)
          </Label>
          <Input
            id="emi-rate"
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Tenure</p>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {TENURES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={months === value}
                onClick={() => setMonths(value)}
                className={cn(
                  "rounded-md border px-2.5 py-2 text-xs transition-colors",
                  months === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/30",
                )}
              >
                {value / 12} yr
              </button>
            ))}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Monthly EMI</dt>
          <dd className="mt-1 font-serif text-2xl text-foreground tabular-nums">{formatINR(emi)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Down payment</dt>
          <dd className="mt-1 tabular-nums">{formatINR(total - loan)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Loan amount</dt>
          <dd className="mt-1 tabular-nums">{formatINR(loan)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total interest</dt>
          <dd className="mt-1 tabular-nums">{formatINR(interest)}</dd>
        </div>
      </dl>
    </div>
  );
};

export default EmiCalculator;
