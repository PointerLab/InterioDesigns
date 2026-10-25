import { Badge } from "@/components/ui/badge";
import type { ConsultationStatus } from "@/lib/types";

const VARIANTS = {
  requested: "warning",
  confirmed: "success",
  completed: "neutral",
  cancelled: "destructive",
} as const;

const StatusBadge = ({ status, label }: { status: ConsultationStatus; label?: string }) => (
  <Badge variant={VARIANTS[status]}>{label ?? status[0].toUpperCase() + status.slice(1)}</Badge>
);

export default StatusBadge;
