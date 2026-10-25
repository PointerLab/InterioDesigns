import { Link } from "react-router-dom";
import { SITE } from "@/lib/site";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { to: "/designs", label: "Design gallery" },
      { to: "/packages", label: "Packages" },
      { to: "/estimate", label: "Cost estimator" },
    ],
  },
  {
    title: "Studio",
    links: [
      { to: "/#about", label: "About us" },
      { to: "/#how-it-works", label: "How it works" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of service" },
    ],
  },
];

const SiteFooter = () => (
  <footer className="print-hide mt-24 border-t border-border bg-card">
    <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo />
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Interior design and renovation for homes, offices and shops, with transparent pricing from the first estimate.
        </p>
        <div className="mt-5 space-y-1 text-sm text-muted-foreground">
          <a href={`mailto:${SITE.email}`} className="block hover:text-foreground">
            {SITE.email}
          </a>
          <a href={SITE.phoneHref} className="block hover:text-foreground">
            {SITE.phone}
          </a>
        </div>
      </div>
      {COLUMNS.map((column) => (
        <div key={column.title}>
          <p className="text-sm font-medium text-foreground">{column.title}</p>
          <ul className="mt-4 space-y-2.5">
            {column.links.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-border">
      <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} INTERIO. All rights reserved.</p>
        <p>All prices are estimates. Final costs are confirmed after a site visit.</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
