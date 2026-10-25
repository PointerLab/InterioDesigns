import { Link } from "react-router-dom";
import { IconHeart } from "@/components/icons";
import { formatINRShort } from "@/lib/format";
import { useToggleSave } from "@/lib/queries";
import type { Design } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SaveButton({ design, className }: { design: Design; className?: string }) {
  const { toggle, isPending } = useToggleSave();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        toggle(design);
      }}
      disabled={isPending}
      aria-pressed={design.is_saved}
      aria-label={design.is_saved ? `Remove ${design.title} from saved designs` : `Save ${design.title}`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-card/95 shadow-sm transition-colors hover:bg-card",
        design.is_saved ? "text-primary" : "text-foreground",
        className,
      )}
    >
      <IconHeart filled={design.is_saved} className="h-[18px] w-[18px]" />
    </button>
  );
}

const DesignCard = ({ design }: { design: Design }) => (
  <article className="group">
    <Link to={`/designs/${design.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
        <img
          src={design.image}
          alt={design.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <SaveButton design={design} className="absolute right-3 top-3" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg text-foreground group-hover:text-primary">{design.title}</h3>
          <p className="text-sm text-muted-foreground">
            {design.room_label} · {design.style_label}
          </p>
        </div>
        <p className="shrink-0 pt-1 text-sm text-foreground">
          {formatINRShort(design.budget_min)}–{formatINRShort(design.budget_max).replace("₹", "")}
        </p>
      </div>
    </Link>
  </article>
);

export function DesignGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/3] animate-pulse rounded-md bg-muted" />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default DesignCard;
