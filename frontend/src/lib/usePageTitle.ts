import { useEffect } from "react";
import { SITE } from "./site";

const DEFAULT_TITLE = `${SITE.name} | Interior Design & Renovation Estimates`;

/** Sets the browser tab title, e.g. "Packages | INTERIO". Without a title it uses the site default. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE.name}` : DEFAULT_TITLE;
  }, [title]);
}
