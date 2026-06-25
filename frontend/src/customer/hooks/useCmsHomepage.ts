import { useEffect, useState } from "react";
import { fetchCmsHomepage } from "../lib/api";

/**
 * Hook to fetch and cache the CMS homepage data.
 * Returns { cms, loading, error, refresh }
 */
export function useCmsHomepage() {
  const [cms, setCms] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Used to force refresh (bust cache)
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = () => setRefreshIndex((i) => i + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCmsHomepage()
      .then((data) => {
        if (!cancelled) {
          setCms(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load CMS data");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  return { cms, loading, error, refresh };
}