import { api } from "./api";
import { fetchAllActiveCategories, fetchNavCategories, normalizeNavCategories } from "./navCategories";

const HOMEPAGE_CATEGORY_LIMIT = 10;

type CmsCategory = {
  _id?: string;
  name?: string;
  slug?: string;
  status?: string;
  sortOrder?: number;
  image?: { url?: string };
};

function isActiveCatalogRow(row: { status?: string } | null | undefined): boolean {
  const s = String(row?.status || "ACTIVE").toUpperCase();
  return s === "ACTIVE";
}

/** CMS featuredCategories (populated) take priority when configured. */
function categoriesFromCmsFeatured(cmsHome: Record<string, unknown>, limit: number): CmsCategory[] {
  const raw = cmsHome.featuredCategories;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return normalizeNavCategories(
    raw.filter((c) => c && isActiveCatalogRow(c as CmsCategory)),
    limit
  ) as CmsCategory[];
}

/**
 * Homepage categories: CMS featured → city-scoped → all ACTIVE.
 * Admin-created ACTIVE categories appear even before city pricing/inventory is set up.
 */
export async function loadHomepageCategories(
  cmsHome: Record<string, unknown>,
  cityId: string | null | undefined,
  limit = HOMEPAGE_CATEGORY_LIMIT
): Promise<any[]> {
  const fromCms = categoriesFromCmsFeatured(cmsHome, limit);
  if (fromCms.length > 0) return fromCms;

  if (cityId) {
    try {
      const cityScoped = await fetchNavCategories({ cityId, max: limit });
      if (cityScoped.length > 0) return cityScoped;
    } catch {
      /* fall through */
    }
  }

  return fetchAllActiveCategories(limit);
}

/** Homepage brands: city-scoped first, then all ACTIVE brands. */
export async function loadHomepageBrands(cityId: string | null | undefined, limit = 24): Promise<any[]> {
  if (cityId) {
    try {
      const scoped = await api.getBrands({ status: "ACTIVE", limit: String(limit), cityId });
      const rows = (scoped as { data?: unknown[] }).data || [];
      if (rows.length > 0) return rows;
    } catch {
      /* fall through */
    }
  }

  const res = await api.getBrands({ status: "ACTIVE", limit: String(limit) });
  return (res as { data?: unknown[] }).data || [];
}

type ProductFetchParams = Record<string, string>;

async function fetchProductRows(params: ProductFetchParams): Promise<any[]> {
  const res = await api.getProducts(params);
  return (res as { data?: unknown[] }).data || [];
}

/**
 * Homepage products: try top-selling → featured → newest.
 * Tries with cityId first (local pricing), then global ACTIVE catalog.
 */
export async function loadHomepageProducts(cityId: string | null | undefined, limit = 8): Promise<any[]> {
  const attempts: ProductFetchParams[] = [
    { isTopSelling: "true", limit: String(limit), sort: "default" },
    { isFeatured: "true", limit: String(limit), sort: "default" },
    { limit: String(limit), sort: "newest" },
  ];

  for (const base of attempts) {
    if (cityId) {
      try {
        const rows = await fetchProductRows({ ...base, cityId, catalog: "homepage" });
        if (rows.length > 0) return rows;
      } catch {
        /* try global */
      }
    }
    try {
      const rows = await fetchProductRows(base);
      if (rows.length > 0) return rows;
    } catch {
      /* next attempt */
    }
  }

  return [];
}
