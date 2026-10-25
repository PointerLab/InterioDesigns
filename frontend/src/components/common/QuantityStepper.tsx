import { IconMinus, IconPlus } from "@/components/icons";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
}

const QuantityStepper = ({ value, onChange, min = 0, max = 99, disabled, label }: QuantityStepperProps) => {
  const button =
    "flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className={cn("inline-flex items-center rounded-md border border-input bg-card", disabled && "opacity-50")}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label}`}
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite" aria-label={`${label} quantity`}>
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label}`}
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default QuantityStepper;
