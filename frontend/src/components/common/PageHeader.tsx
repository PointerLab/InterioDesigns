import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const PageHeader = ({ eyebrow, title, description, actions, className }: PageHeaderProps) => (
  <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
    <div>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-serif text-3xl text-foreground md:text-4xl">{title}</h1>
      {description && <div className="mt-2 max-w-2xl text-muted-foreground">{description}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
