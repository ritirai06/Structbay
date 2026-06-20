import { api } from "./api";
import { fetchAllActiveCategories, fetchNavCategories, normalizeNavCategories } from "./navCategories";

const HOMEPAGE_CATEGORY_LIMIT = 14;

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

function catalogDedupeKey(row: any): string {
  return String(row?._id || row?.id || row?.slug || row?.sku || row?.name || "").trim().toLowerCase();
}

function uniqueCatalogRows<T>(rows: T[], limit?: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const row of rows) {
    const key = catalogDedupeKey(row);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(row);
    if (limit && out.length >= limit) break;
  }

  return out;
}

/** CMS featuredCategories (populated) take priority when configured. */
function categoriesFromCmsFeatured(cmsHome: Record<string, unknown>, limit: number): CmsCategory[] {
  const raw = cmsHome.featuredCategories;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return uniqueCatalogRows(normalizeNavCategories(
    raw.filter((c) => c && isActiveCatalogRow(c as CmsCategory)),
    limit
  ) as CmsCategory[], limit);
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
  return uniqueCatalogRows(await fetchAllActiveCategories(limit), limit);
}

/** Homepage brands: city-scoped first, then all ACTIVE brands. */
export async function loadHomepageBrands(cityId: string | null | undefined, limit = 24): Promise<any[]> {
  if (cityId) {
    try {
      const scoped = await api.getBrands({ status: "ACTIVE", limit: String(limit), cityId });
      const rows = (scoped as { data?: unknown[] }).data || [];
      if (rows.length > 0) return uniqueCatalogRows(rows, limit);
    } catch {
      /* fall through */
    }
  }

  const res = await api.getBrands({ status: "ACTIVE", limit: String(limit) });
  return uniqueCatalogRows(((res as { data?: unknown[] }).data || []) as any[], limit);
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
        if (rows.length > 0) return uniqueCatalogRows(rows, limit);
      } catch {
        /* try global */
      }
    }
    try {
      const rows = await fetchProductRows(base);
      if (rows.length > 0) return uniqueCatalogRows(rows, limit);
    } catch {
      /* next attempt */
    }
  }

  return [];
}
