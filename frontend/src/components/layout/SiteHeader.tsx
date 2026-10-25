import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { IconChevronDown, IconMenu } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { ACCOUNT_LINKS, MAIN_LINKS } from "./nav";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm transition-colors hover:text-foreground",
    isActive ? "font-medium text-foreground" : "text-muted-foreground",
  );

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const SiteHeader = () => {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const loginHref = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header className="print-hide sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {MAIN_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted md:flex"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                    {initials(user.name) || "U"}
                  </span>
                  <span className="max-w-[9rem] truncate">{user.name.split(" ")[0]}</span>
                  <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ACCOUNT_LINKS.map((link) => (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link to={link.to}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                {user.is_staff && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/staff">Staff panel</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            status !== "loading" && (
              <Link
                to={loginHref}
                className="hidden px-2 text-sm text-muted-foreground hover:text-foreground md:inline"
              >
                Sign in
              </Link>
            )
          )}

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/estimate">Get an estimate</Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <IconMenu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-0 p-0">
              <SheetTitle className="border-b border-border px-5 py-4 text-left font-serif text-lg">Menu</SheetTitle>
              <nav className="flex flex-col px-2 py-3" aria-label="Mobile">
                {MAIN_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-border px-2 py-3">
                {user ? (
                  <>
                    <p className="px-3 pb-2 text-xs uppercase tracking-wide text-muted-foreground">{user.name}</p>
                    {ACCOUNT_LINKS.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-3 py-2.5 text-foreground hover:bg-muted"
                      >
                        {link.label}
                      </Link>
                    ))}
                    {user.is_staff && (
                      <Link
                        to="/staff"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-3 py-2.5 text-foreground hover:bg-muted"
                      >
                        Staff panel
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-md px-3 py-2.5 text-left text-foreground hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-3">
                    <Button asChild variant="outline" onClick={() => setMobileOpen(false)}>
                      <Link to={loginHref}>Sign in</Link>
                    </Button>
                    <Button asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/signup">Create account</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
