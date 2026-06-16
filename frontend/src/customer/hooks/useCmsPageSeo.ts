import { useEffect } from "react";

/**
 * Loads CMS SEO for a page key (e.g. `home`, `blog`) and applies document title / meta tags.
 */
export function useCmsPageSeo(page: string) {
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const r = await fetch(`/api/v1/cms/seo?page=${encodeURIComponent(page)}`, { signal: ac.signal });
        const j = (await r.json()) as {
          success?: boolean;
          data?: Array<{
            page?: string;
            metaTitle?: string;
            metaDescription?: string;
            canonicalUrl?: string;
            robotsDirective?: string;
          }>;
        };
        if (cancelled || !j.success || !Array.isArray(j.data)) return;
        const entry = j.data.find((x) => x.page === page);
        if (!entry) return;

        if (entry.metaTitle?.trim()) {
          document.title = entry.metaTitle.trim();
        }

        let desc = document.querySelector('meta[name="description"]');
        if (!desc) {
          desc = document.createElement("meta");
          desc.setAttribute("name", "description");
          document.head.appendChild(desc);
        }
        if (entry.metaDescription?.trim()) {
          desc.setAttribute("content", entry.metaDescription.trim());
        }

        let canonical = document.querySelector('link[rel="canonical"]');
        if (entry.canonicalUrl?.trim()) {
          if (!canonical) {
            canonical = document.createElement("link");
            canonical.setAttribute("rel", "canonical");
            document.head.appendChild(canonical);
          }
          canonical.setAttribute("href", entry.canonicalUrl.trim());
        }

        let robots = document.querySelector('meta[name="robots"]');
        if (entry.robotsDirective?.trim()) {
          if (!robots) {
            robots = document.createElement("meta");
            robots.setAttribute("name", "robots");
            document.head.appendChild(robots);
          }
          robots.setAttribute("content", entry.robotsDirective.trim());
        }
      } catch {
        /* non-blocking */
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [page]);
}
