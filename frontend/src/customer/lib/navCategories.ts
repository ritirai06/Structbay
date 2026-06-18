import { api } from "./api";

const NAV_CACHE_TTL_MS = 5 * 60 * 1000;
const navCache = new Map<string, { at: number; data: unknown[] }>();
const navInflight = new Map<string, Promise<unknown[]>>();

/** Deduplicate by slug and sort for nav menus (shop dropdown, pills, footer). */
export function normalizeNavCategories(list: unknown[], max?: number): any[] {
  const seen = new Set<string>();
  const out: any[] = [];

  for (const item of Array.isArray(list) ? list : []) {
    const c = item as { slug?: string };
    const slug = String(c?.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(item);
  }

  out.sort(
    (a, b) =>
      (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""))
  );

  return max != null && max > 0 ? out.slice(0, max) : out;
}

type NavCategoryOpts = {
  /** When set, only categories with sellable products in that city. */
  cityId?: string | null;
  max?: number;
};

async function loadCategories(opts?: NavCategoryOpts) {
  const cacheKey = `${opts?.cityId || "_all"}:${opts?.max ?? "all"}`;
  const hit = navCache.get(cacheKey);
  if (hit && Date.now() - hit.at < NAV_CACHE_TTL_MS) {
    return hit.data;
  }

  const pending = navInflight.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    const params: Record<string, string> = { status: "ACTIVE", limit: "100" };
    if (opts?.cityId) params.cityId = opts.cityId;
    const res = await api.getCategories(params);
    const list = (res as { data?: unknown[] })?.data;
    const normalized = normalizeNavCategories(list || [], opts?.max);
    navCache.set(cacheKey, { at: Date.now(), data: normalized });
    return normalized;
  })();

  navInflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    navInflight.delete(cacheKey);
  }
}

/** Nav menus — city-scoped when `cityId` is set (shop dropdown, pills, footer). */
export function fetchNavCategories(opts?: NavCategoryOpts) {
  return loadCategories(opts);
}

/** Homepage grid — all ACTIVE categories, not limited to city inventory. */
export function fetchAllActiveCategories(max?: number) {
  return loadCategories({ max });
}
