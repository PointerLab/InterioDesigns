import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

/** Scrolls to the top on page change, or to #anchor when the URL has one. */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section has rendered.
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }));
      return;
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return null;
}

const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <main className="flex-1">
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);

export default PublicLayout;
