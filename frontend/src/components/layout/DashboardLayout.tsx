import { NavLink, Outlet } from "react-router-dom";
import { IconExternal } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ACCOUNT_LINKS, STAFF_LINKS } from "./nav";

interface DashboardLayoutProps {
  variant: "customer" | "staff";
}

const DashboardLayout = ({ variant }: DashboardLayoutProps) => {
  const links = variant === "staff" ? STAFF_LINKS : ACCOUNT_LINKS;
  const root = variant === "staff" ? "/staff" : "/dashboard";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="container-page py-8 print:max-w-none print:p-0 md:py-10">
      <div className="grid gap-8 print:block lg:grid-cols-[210px_1fr]">
        <aside className="print-hide">
          <p className="mb-3 hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground lg:block">
            {variant === "staff" ? "Staff panel" : "My account"}
          </p>
          <nav
            className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
            aria-label={variant === "staff" ? "Staff" : "Account"}
          >
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === root} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            {variant === "staff" && (
              <a
                href="/admin/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Pricing & catalog <IconExternal className="h-3.5 w-3.5" />
              </a>
            )}
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export default DashboardLayout;
