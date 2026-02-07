/**
 * usePageTitle Hook
 *
 * Sets the document title and restores the previous title on unmount.
 * Helps ensure every page has a unique, descriptive title for SEO and accessibility.
 *
 * Usage:
 *   usePageTitle('Dashboard');           // sets "Dashboard"
 *   usePageTitle('Dashboard', { suffix: ' | MyApp' }); // sets "Dashboard | MyApp"
 */

import { useEffect, useRef } from "react";

export interface UsePageTitleOptions {
  /** Suffix appended to the title (e.g. ' | MyApp') */
  suffix?: string;
}

/**
 * Set the document title for the current page.
 * Restores the previous title when the component unmounts.
 */
export function usePageTitle(title: string, options?: UsePageTitleOptions): void {
  const previousTitle = useRef<string | undefined>(undefined);
  const suffix = options?.suffix ?? "";

  useEffect(() => {
    previousTitle.current = document.title;
    document.title = `${title}${suffix}`;

    return () => {
      if (previousTitle.current !== undefined) {
        document.title = previousTitle.current;
      }
    };
  }, [title, suffix]);
}
