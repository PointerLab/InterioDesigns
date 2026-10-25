import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}

/** Label + control + inline error, used by every form. */
const Field = ({ id, label, error, hint, optional, children }: FieldProps) => (
  <div>
    <Label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
      <span>{label}</span>
      {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
    </Label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="field-error">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    )}
  </div>
);

export default Field;
