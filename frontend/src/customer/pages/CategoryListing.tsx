import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import {
  SlidersHorizontal, Shield, Zap,
  ChevronRight, FileText, ChevronLeft, ChevronDown, X,
  Package,
  ArrowRight, BarChart3, MapPin, Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { fetchNavCategories } from "../lib/navCategories";
import { useApp } from "../context/AppContext";
import { ListingProductCard } from "../components/ListingProductCard";
import { SandAggregatesQuoteModal } from "../components/SandAggregatesQuoteModal";
import { findVariationForFilterSelections } from "../lib/variationSelectors";
import {
  listingUnitPrice,
  listingPriceBounds,
  productMatchesPriceRange,
} from "../lib/wholesalePricing";

const PAGE_SIZE = 12;
const SAND_AGGREGATES_QUOTE_EVENT = "structbay:open-sand-aggregates-quote";

/** Treat blank / zero min as "no minimum" so filters and API stay in sync. */
function parsePriceMin(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parsePriceMax(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseNumericAttr(v: string): number | null {
  const m = String(v ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function numericBoundsFromOptions(options: any[]): { min: number; max: number } | null {
  const nums = (options || [])
    .map((o) => parseNumericAttr(String(o.value ?? o.label ?? "")))
    .filter((n): n is number => n != null);
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

interface StackedRangeSliderProps {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  format?: (n: number) => string;
  lowLabel?: string;
  highLabel?: string;
}

/** Two separate sliders — reliable on Windows touch/mouse (no overlapping range inputs). */
function StackedRangeSlider({
  min,
  max,
  low,
  high,
  onChange,
  format = (n) => String(n),
  lowLabel = "Minimum",
  highLabel = "Maximum",
}: StackedRangeSliderProps) {
  const trackMax = Math.max(min + 1, max);
  const lo = Math.min(Math.max(low, min), trackMax);
  const hi = Math.min(Math.max(high, min), trackMax);
  const safeLo = Math.min(lo, hi);
  const safeHi = Math.max(lo, hi);

  if (min >= trackMax) {
    return (
      <p className="text-xs text-sb-ink-muted/60 tabular-nums">
        All items at {format(min)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-[10px] text-sb-ink-muted/60 mb-1.5">
          <span>{lowLabel}</span>
          <span className="tabular-nums font-medium text-sb-ink/70">{format(safeLo)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={trackMax}
          step={1}
          value={safeLo}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(v, safeHi), safeHi);
          }}
          className="sf-range-single w-full"
          aria-label={lowLabel}
        />
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-sb-ink-muted/60 mb-1.5">
          <span>{highLabel}</span>
          <span className="tabular-nums font-medium text-sb-ink/70">{format(safeHi)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={trackMax}
          step={1}
          value={safeHi}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(safeLo, Math.max(v, safeLo));
          }}
          className="sf-range-single w-full"
          aria-label={highLabel}
        />
      </div>
    </div>
  );
}

function resolveBrandIds(names: string[], map: Record<string, string>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    let id = map[name];
    if (!id) {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(map)) {
        if (k.toLowerCase() === lower) {
          id = v;
          break;
        }
      }
    }
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function buildBrandNameMap(brands: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  brands.forEach((b: any) => {
    const id = b?._id ? String(b._id) : "";
    if (!id) return;
    if (b.name) map[b.name] = id;
    if (b.slug) map[b.slug] = id;
  });
  return map;
}

function brandMapFromProducts(data: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  data.forEach((p: any) => {
    const b = p.brand;
    if (!b) return;
    const id = typeof b === "object" ? String(b._id || "") : "";
    const name = typeof b === "object" ? b.name : String(b);
    if (id && name) map[name] = id;
    if (id && typeof b === "object" && b.slug) map[b.slug] = id;
  });
  return map;
}

const SORT_API_MAP: Record<string, string> = {
  default: "default",
  newest: "newest",
  priceLow: "price-asc",
  priceHigh: "price-desc",
  rating: "default",
  express: "default",
};

/** URL param vs API slug (encoding / casing). */
function categorySlugMatches(routeSlug: string | undefined, cat: { slug?: string }) {
  if (!routeSlug) return false;
  const a = decodeURIComponent(String(routeSlug)).trim().toLowerCase();
  const b = decodeURIComponent(String(cat?.slug ?? "")).trim().toLowerCase();
  return a.length > 0 && a === b;
}

const SORT_OPTIONS = [
  { value: "default",    label: "Most Popular" },
  { value: "newest",     label: "Newest" },
  { value: "priceLow",   label: "Price: Low to High" },
  { value: "priceHigh",  label: "Price: High to Low" },
  { value: "rating",     label: "Top Rated" },
  { value: "express",    label: "Express Delivery" },
];

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ title, children, defaultOpen = true }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-sb-ink/10 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/60">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-sb-ink-muted/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function categoryPageTitle(name: string | undefined, isShopAll: boolean, customHeadline?: string): string {
  const headline = String(customHeadline || "").trim();
  if (headline) return headline;
  if (isShopAll) return "Top quality construction materials";
  const label = (name || "products").trim();
  return `Top quality ${label.toLowerCase()} for construction`;
}

function isSandAggregatesCategory(value: string | undefined): boolean {
  const text = decodeURIComponent(String(value || ""))
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(/&/g, "and");
  return (
    /m[-\s]*sand/.test(text) ||
    (text.includes("sand") && text.includes("aggregate")) ||
    text.includes("aggregates")
  );
}

export function CategoryListing() {
  const { category } = useParams<{ category?: string }>();
  const { addToCart, updateQty, cart, city, cityId } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isShopAll = !category || category === "all";

  // ── API data state ──────────────────────────────────────────────────────────
  const [products, setProducts]     = useState<any[]>([]);
  const [catData, setCatData]       = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allBrands, setAllBrands]   = useState<any[]>([]);
  /** Admin-defined category filters (CategoryFilter.filters) — drives dynamic attribute filters. */
  const [categoryFilters, setCategoryFilters] = useState<any[]>([]);
  /** Selected attribute values per filter key (multi-select). */
  const [dynAttrSelections, setDynAttrSelections] = useState<Record<string, string[]>>({});
  /** Per-attribute numeric range (min/max) for RANGE filters. */
  const [dynRangeSelections, setDynRangeSelections] = useState<Record<string, { min: number; max: number }>>({});
  /** Catalog price bounds from API (city pricing). */
  const [catalogPriceBounds, setCatalogPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // ── Filter/sort state ───────────────────────────────────────────────────────
  const [sortBy, setSortBy]                 = useState("default");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin]             = useState("");
  const [priceMax, setPriceMax]             = useState("");
  const [showAssured, setShowAssured]       = useState(false);
  const [showExpress, setShowExpress]       = useState(false);
  const [inStockOnly, setInStockOnly]       = useState(false);
  const [sandQuoteOpen, setSandQuoteOpen]   = useState(false);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [page, setPage]                     = useState(1);
  /** Per-product slug → selected variation id for pricing / add-to-cart */
  const [varChoice, setVarChoice]           = useState<Record<string, string>>({});
  /** Category page: maps sidebar brand name → Mongo id for API `brand` filter */
  const brandNameToIdRef = useRef<Record<string, string>>({});
  const fetchGenRef = useRef(0);

  const [debouncedPriceMin, setDebouncedPriceMin] = useState("");
  const [debouncedPriceMax, setDebouncedPriceMax] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedPriceMin(priceMin);
      setDebouncedPriceMax(priceMax);
    }, 350);
    return () => window.clearTimeout(t);
  }, [priceMin, priceMax]);

  // ── Reset filters when category or city changes ───────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedBrands([]);
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
    setPriceMin("");
    setPriceMax("");
    setDebouncedPriceMin("");
    setDebouncedPriceMax("");
    setSelectedWeights([]);
    setVarChoice({});
    setDynAttrSelections({});
    setDynRangeSelections({});
    setCatalogPriceBounds(null);
    setAllBrands([]);
    brandNameToIdRef.current = {};
    setProducts([]);
    setTotalCount(0);
    setLoading(true);
  }, [category, cityId]);

  const categoryTitle = useMemo(() => {
    if (isShopAll) return "Shop All";
    const fromNav = allCategories.find((c: any) => categorySlugMatches(category, c));
    return fromNav?.name || catData?.name || decodeURIComponent(String(category || "Category"));
  }, [isShopAll, allCategories, category, catData?.name]);

  const isSandAggregates = useMemo(
    () => !isShopAll && (
      isSandAggregatesCategory(category) ||
      isSandAggregatesCategory(categoryTitle) ||
      isSandAggregatesCategory(location.pathname)
    ),
    [category, categoryTitle, isShopAll, location.pathname]
  );

  useEffect(() => {
    if (isSandAggregates) setSandQuoteOpen(true);
  }, [category, isSandAggregates, location.key]);

  useEffect(() => {
    const openQuote = () => setSandQuoteOpen(true);
    window.addEventListener(SAND_AGGREGATES_QUOTE_EVENT, openQuote);
    return () => window.removeEventListener(SAND_AGGREGATES_QUOTE_EVENT, openQuote);
  }, []);

  // ── Fetch data from API ────────────────────────────────────────────────────
  useEffect(() => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    const cid = cityId || undefined;

    if (isShopAll) {
      const params: Record<string, any> = {
        limit: 100,
        sort: SORT_API_MAP[sortBy] || sortBy,
        page,
      };
      if (cid) {
        params.cityId = cid;
        if (city) params.cityName = city;
      }
      if (showAssured) params.assured = "true";
      if (showExpress) params.express = "true";
      if (inStockOnly) params.availability = "in_stock";
      const brandIds = resolveBrandIds(selectedBrands, brandNameToIdRef.current);
      if (brandIds.length) params.brands = brandIds.join(",");
      const minP = parsePriceMin(debouncedPriceMin);
      const maxP = parsePriceMax(debouncedPriceMax);
      if (minP != null) params.minPrice = String(minP);
      if (maxP != null) params.maxPrice = String(maxP);

      api.getProducts(params)
        .then((res: any) => {
          if (gen !== fetchGenRef.current) return;
          const data = res.data || [];
          setProducts(data);
          setTotalCount(res.pagination?.total || data.length);
          setCategoryFilters([]);
          setCatData({
            name: "Shop All",
            slug: "all",
            longDescription: "Browse all premium construction materials from verified vendors.",
          });
          const brandNames = [...new Set(data.map((p: any) => p.brand?.name || p.brand).filter(Boolean))];
          setAllBrands((prev) => {
            const merged = new Set([...(prev.length ? prev : []), ...brandNames]);
            return [...merged].sort((a, b) => a.localeCompare(b));
          });
          brandNameToIdRef.current = {
            ...brandNameToIdRef.current,
            ...brandMapFromProducts(data),
          };
        })
        .finally(() => {
          if (gen === fetchGenRef.current) setLoading(false);
        });
    } else {
      const qp: Record<string, string> = {
        sort: SORT_API_MAP[sortBy] || sortBy,
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (cid) {
        qp.cityId = cid;
        if (city) qp.cityName = city;
      }
      if (showAssured) qp.assured = "true";
      if (showExpress) qp.express = "true";
      if (inStockOnly) qp.availability = "in_stock";
      const minP = parsePriceMin(debouncedPriceMin);
      const maxP = parsePriceMax(debouncedPriceMax);
      if (minP != null) qp.minPrice = String(minP);
      if (maxP != null) qp.maxPrice = String(maxP);
      const brandIds = resolveBrandIds(selectedBrands, brandNameToIdRef.current);
      if (brandIds.length) qp.brands = brandIds.join(",");
      Object.entries(dynAttrSelections).forEach(([k, vals]) => {
        if (vals?.length) qp[k] = vals.join(",");
      });
      Object.entries(dynRangeSelections).forEach(([k, range]) => {
        if (range?.min != null) qp[`${k}_min`] = String(range.min);
        if (range?.max != null) qp[`${k}_max`] = String(range.max);
      });

      api.getCategoryDetails(category!, qp)
        .then((res: any) => {
          if (gen !== fetchGenRef.current) return;
          const d = res.data || {};
          setCatData(d.category || null);
          setProducts(d.products || []);
          setTotalCount(d.pagination?.total ?? (d.products || []).length);
          setCategoryFilters(Array.isArray(d.filters) ? d.filters : []);
          if (d.priceBounds?.min != null && d.priceBounds?.max != null) {
            setCatalogPriceBounds({
              min: Number(d.priceBounds.min),
              max: Number(d.priceBounds.max),
            });
          } else {
            setCatalogPriceBounds(null);
          }
          const brands = d.brands || [];
          brandNameToIdRef.current = buildBrandNameMap(brands);
          setAllBrands(brands.map((b: any) => b.name || b.slug || "").filter(Boolean));
          if (!d.category) navigate("/shop", { replace: true });
        })
        .finally(() => {
          if (gen === fetchGenRef.current) setLoading(false);
        });
    }
  }, [category, cityId, isShopAll, sortBy, page, showAssured, showExpress, inStockOnly, selectedBrands, debouncedPriceMin, debouncedPriceMax, JSON.stringify(dynAttrSelections), JSON.stringify(dynRangeSelections), navigate]);

  // Quick-nav pills: city-scoped — only categories shoppable in selected city.
  useEffect(() => {
    fetchNavCategories({ cityId })
      .then(setAllCategories)
      .catch(() => setAllCategories([]));
  }, [category, cityId]);

  /** Reset per-card variant pick when sidebar filters change so filter + dropdown stay in sync. */
  useEffect(() => {
    setVarChoice({});
  }, [category, cityId, JSON.stringify(dynAttrSelections)]);

  const toggleDynFilter = (key: string, value: string) => {
    setDynAttrSelections((prev) => {
      const cur = prev[key] || [];
      const has = cur.includes(value);
      const nextVals = has ? cur.filter((x) => x !== value) : [...cur, value];
      const next = { ...prev };
      if (nextVals.length) next[key] = nextVals;
      else delete next[key];
      return next;
    });
    setPage(1);
  };

  const setDynRange = (key: string, min: number, max: number) => {
    setDynRangeSelections((prev) => ({ ...prev, [key]: { min, max } }));
    setPage(1);
  };

  const clearDynRange = (key: string) => {
    setDynRangeSelections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPage(1);
  };

  const shopAllPriceBounds = useMemo(() => {
    if (!isShopAll || !products.length) return null;
    const prices: number[] = [];
    products.forEach((p: any) => {
      const { min, max } = listingPriceBounds(p);
      if (min > 0) prices.push(min);
      if (max > 0) prices.push(max);
    });
    if (!prices.length) return null;
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [isShopAll, products]);

  const effectivePriceBounds = catalogPriceBounds || shopAllPriceBounds;

  const priceSliderValues = useMemo(() => {
    if (!effectivePriceBounds) return null;
    const catalogMin = effectivePriceBounds.min;
    const catalogMax = effectivePriceBounds.max;
    const singlePrice = catalogMin === catalogMax;
    let sliderMin = catalogMin;
    let sliderMax = catalogMax;
    if (singlePrice && catalogMin > 0) {
      const pad = Math.max(50, Math.round(catalogMin * 0.2));
      sliderMin = Math.max(0, catalogMin - pad);
      sliderMax = catalogMin + pad;
    }
    const hasPriceFilter = priceMin !== "" || priceMax !== "";
    const low = parsePriceMin(priceMin) ?? (singlePrice && !hasPriceFilter ? sliderMin : catalogMin);
    const high = parsePriceMax(priceMax) ?? (singlePrice && !hasPriceFilter ? sliderMax : catalogMax);
    const trackMax = Math.max(sliderMin + 1, sliderMax);
    return {
      min: sliderMin,
      max: trackMax,
      low: Math.min(Math.max(low, sliderMin), trackMax),
      high: Math.min(Math.max(high, sliderMin), trackMax),
      catalogMin,
      catalogMax,
      singlePrice,
    };
  }, [effectivePriceBounds, priceMin, priceMax]);

  const applyPriceRange = (low: number, high: number) => {
    if (!effectivePriceBounds || !priceSliderValues) return;
    const lo = Math.min(low, high);
    const hi = Math.max(low, high);
    const atMin = lo <= priceSliderValues.catalogMin;
    const atMax = hi >= priceSliderValues.catalogMax;
    setPriceMin(atMin ? "" : String(lo));
    setPriceMax(atMax ? "" : String(hi));
    setPage(1);
  };

  const weightFilterOptions = useMemo(() => {
    if (!isShopAll) return [];
    const weights = new Set<string>();
    products.forEach((p: any) => {
      for (const v of p.variations || []) {
        const w = v?.attributes?.weight;
        if (w != null && String(w).trim()) weights.add(String(w).trim());
      }
    });
    return [...weights].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [products, isShopAll]);

  const toggleWeight = (w: string) => {
    setSelectedWeights((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
    setPage(1);
  };

  // ── Client-side filters (stock, weight, sort — server handles brand/price/badges when city set) ───────
  let filteredProducts = [...products];
  const minP = parsePriceMin(priceMin);
  const maxP = parsePriceMax(priceMax);

  if (isShopAll) {
    if (selectedBrands.length > 0 && !cityId) {
      filteredProducts = filteredProducts.filter((p: any) =>
        selectedBrands.some((b) => {
          const name = p.brand?.name || p.brand || "";
          return name.toLowerCase() === b.toLowerCase();
        })
      );
    }
    if (!cityId && (minP != null || maxP != null)) {
      filteredProducts = filteredProducts.filter((p: any) => productMatchesPriceRange(p, minP, maxP));
    }
    if (sortBy === "priceLow") {
      filteredProducts = [...filteredProducts].sort(
        (a, b) => listingUnitPrice(a) - listingUnitPrice(b)
      );
    }
    if (sortBy === "priceHigh") {
      filteredProducts = [...filteredProducts].sort(
        (a, b) => listingUnitPrice(b) - listingUnitPrice(a)
      );
    }
    if (sortBy === "express") {
      filteredProducts = [...filteredProducts].sort(
        (a, b) => (b.isExpress || b.isStructbayDelivery ? 1 : 0) - (a.isExpress || a.isStructbayDelivery ? 1 : 0)
      );
    }
  }

  if (isShopAll && selectedWeights.length) {
    filteredProducts = filteredProducts.filter((p: any) =>
      (p.variations || []).some((v: any) =>
        selectedWeights.includes(String(v?.attributes?.weight ?? "").trim())
      )
    );
  }
  if (inStockOnly) {
    filteredProducts = filteredProducts.filter((p: any) => p.inStock !== false);
  }

  const clientFiltered =
    inStockOnly ||
    (isShopAll && selectedWeights.length > 0) ||
    (isShopAll && !cityId && (minP != null || maxP != null));
  const effectiveTotal = isShopAll || clientFiltered
    ? filteredProducts.length
    : totalCount;

  const totalPages = isShopAll || clientFiltered
    ? Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
    : Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));

  const paginated = isShopAll || clientFiltered
    ? filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredProducts;

  const toggleBrand = (b: string) =>
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const clearFilters = () => {
    setSelectedBrands([]);
    setPriceMin("");
    setPriceMax("");
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
    setSelectedWeights([]);
    setDynAttrSelections({});
    setDynRangeSelections({});
    setPage(1);
  };

  const dynAttrActiveCount = Object.values(dynAttrSelections).reduce((n, a) => n + (a?.length || 0), 0);
  const dynRangeActiveCount = Object.entries(dynRangeSelections).filter(([key, range]) => {
    if (!range || !effectivePriceBounds) return false;
    const f = categoryFilters.find((x: any) => String(x.key).toLowerCase() === key.toLowerCase());
    const bounds = numericBoundsFromOptions(f?.options || []);
    if (!bounds) return range.min != null || range.max != null;
    return range.min > bounds.min || range.max < bounds.max;
  }).length;
  const priceFilterActive =
    (minP != null ? 1 : 0) +
    (maxP != null ? 1 : 0);
  const activeFilters =
    selectedBrands.length +
    (showAssured ? 1 : 0) +
    (showExpress ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (isShopAll ? selectedWeights.length : 0) +
    priceFilterActive +
    dynAttrActiveCount +
    dynRangeActiveCount;

  if (!catData && !loading && !isShopAll) return null;

  const showFullSkeleton = loading && products.length === 0;
  const isRefreshing = loading && products.length > 0;
  const displayTotal = showFullSkeleton ? null : effectiveTotal;

  const FilterPanel = () => (
    <div>
      {activeFilters > 0 && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-[#E85A00] hover:text-[#CC4E00] font-semibold transition-colors mb-4">
          <X className="w-3 h-3" /> Clear all ({activeFilters})
        </button>
      )}

      <AccordionSection title="Quick badges">
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showAssured} onChange={e => { setShowAssured(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
            <Shield className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Assured only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showExpress} onChange={e => { setShowExpress(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
            <Zap className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Express delivery</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={inStockOnly} onChange={e => { setInStockOnly(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
            <Package className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">In stock only</span>
          </label>
        </div>
      </AccordionSection>

      <AccordionSection title="Brand">
        <div className="space-y-2">
          {allBrands.map((brand: any) => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => { toggleBrand(brand); setPage(1); }} className="w-4 h-4 rounded accent-[#E85A00]" />
              <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">{brand}</span>
            </label>
          ))}
          {allBrands.length === 0 && (
            <p className="text-xs text-sb-ink-muted/40">No brands for this category</p>
          )}
        </div>
      </AccordionSection>

      {!isShopAll &&
        (() => {
          const visibleFilters: any[] = [];
          const seenOptions = new Set<string>();
          const sortedFilters = [...categoryFilters]
            .filter((f: any) => f?.key && f?.isActive !== false)
            .sort((a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
          for (const f of sortedFilters) {
            const opts = f.options || [];
            if (f.type !== "RANGE" && opts.length > 0) {
              const sig = opts.map((o: any) => String(o.value ?? o.label ?? "").trim().toLowerCase()).sort().join("|");
              if (seenOptions.has(sig)) continue;
              seenOptions.add(sig);
            }
            visibleFilters.push(f);
          }
          return visibleFilters;
        })()
          .map((f: any) => {
            const fKey = String(f.key);
            const opts = f.options || [];
            const rangeBounds = f.type === "RANGE" ? numericBoundsFromOptions(opts) : null;
            const activeRange = dynRangeSelections[fKey.toLowerCase()] || dynRangeSelections[fKey];

            return (
              <AccordionSection key={fKey} title={f.label || fKey}>
                {f.type === "RANGE" && rangeBounds ? (
                  <div className="space-y-2">
                    <StackedRangeSlider
                      min={rangeBounds.min}
                      max={Math.max(rangeBounds.min + 1, rangeBounds.max)}
                      low={activeRange?.min ?? rangeBounds.min}
                      high={activeRange?.max ?? rangeBounds.max}
                      onChange={(low, high) => setDynRange(fKey.toLowerCase(), low, high)}
                      format={(n) => `${n}${fKey.toLowerCase() === "weight" ? " kg" : ""}`}
                    />
                    {activeRange && (
                      <button
                        type="button"
                        onClick={() => clearDynRange(fKey.toLowerCase())}
                        className="text-[10px] text-[#E85A00] font-semibold"
                      >
                        Reset {f.label || fKey}
                      </button>
                    )}
                  </div>
                ) : opts.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {opts.map((opt: any) => {
                      const val = String(opt.value ?? opt.label ?? "");
                      const label = String(opt.label ?? opt.value ?? "");
                      const checked = (dynAttrSelections[fKey] || dynAttrSelections[fKey.toLowerCase()] || []).includes(val);
                      return (
                        <label key={`${fKey}:${val}`} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDynFilter(fKey.toLowerCase(), val)}
                            className="w-4 h-4 rounded accent-[#E85A00]"
                          />
                          <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-sb-ink-muted/50">
                    No {f.label || fKey} options in this category yet.
                  </p>
                )}
              </AccordionSection>
            );
          })}

      <AccordionSection title="Price Range (₹)">
        {priceSliderValues ? (
          <div className="space-y-2">
            {priceSliderValues.singlePrice && (
              <p className="text-xs text-sb-ink-muted/70">
                Catalog range: ₹{priceSliderValues.catalogMin.toLocaleString("en-IN")}
                {cityId ? "" : " · select city for live pricing"}
              </p>
            )}
            <StackedRangeSlider
              min={priceSliderValues.min}
              max={priceSliderValues.max}
              low={priceSliderValues.low}
              high={priceSliderValues.high}
              onChange={applyPriceRange}
              format={(n) => `₹${n.toLocaleString("en-IN")}`}
            />
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => {
                  setPriceMin(e.target.value.replace(/[^\d]/g, ""));
                  setPage(1);
                }}
                className="w-full bg-gray-50 border border-sb-ink/15 rounded-lg px-2.5 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/40 focus:outline-none focus:border-[#E85A00] focus:ring-1 focus:ring-[#E85A00]/25 transition-colors"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => {
                  setPriceMax(e.target.value.replace(/[^\d]/g, ""));
                  setPage(1);
                }}
                className="w-full bg-gray-50 border border-sb-ink/15 rounded-lg px-2.5 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/40 focus:outline-none focus:border-[#E85A00] focus:ring-1 focus:ring-[#E85A00]/25 transition-colors"
              />
            </div>
            {(priceMin || priceMax) && (
              <button
                type="button"
                onClick={() => { setPriceMin(""); setPriceMax(""); setPage(1); }}
                className="text-[10px] text-[#E85A00] font-semibold"
              >
                Reset price
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-sb-ink-muted/50">
            {cityId ? "No priced products in this category for your city." : "Select a delivery city to filter by price."}
          </p>
        )}
      </AccordionSection>

      {isShopAll && weightFilterOptions.length > 0 && (
        <AccordionSection title="Weight / Pack">
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {weightFilterOptions.map((w) => (
              <label key={w} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedWeights.includes(w)}
                  onChange={() => toggleWeight(w)}
                  className="w-4 h-4 rounded accent-[#E85A00]"
                />
                <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">{w}</span>
              </label>
            ))}
          </div>
        </AccordionSection>
      )}
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      <SandAggregatesQuoteModal open={sandQuoteOpen} onClose={() => setSandQuoteOpen(false)} />

      {/* ── Simple category header (no banner image) ───────────────────────── */}
      <div className="sf-category-head">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="sf-category-head__crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/shop">Shop</Link>
            {!isShopAll && catData?.name && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600">{catData.name}</span>
              </>
            )}
          </nav>
          <h1 className="sf-category-head__title">
            {categoryPageTitle(categoryTitle, isShopAll, catData?.listingHeadline)}
          </h1>
          <p className="sf-category-head__meta">
            {displayTotal == null ? (
              <span className="text-gray-500">Loading products…</span>
            ) : (
              <>
                <span className="font-semibold text-gray-800">{displayTotal}</span> products
              </>
            )}
            {city ? (
              <>
                <span className="mx-1.5 text-gray-300">·</span>
                <MapPin className="w-3 h-3 inline -mt-0.5 text-[#E85A00]" aria-hidden />
                {" "}Delivering in {city}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* ── Category quick-nav ─────────────────────────────────────────────── */}
      <div className="sf-category-tabs border-b border-gray-100 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2">
          <Link
            to="/shop"
            className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
              isShopAll
                ? "bg-[#E85A00] text-white"
                : "text-sb-ink-muted/60 hover:text-sb-ink hover:bg-white-2 border border-sb-ink/10"
            }`}
          >
            All
          </Link>
          {allCategories.filter((c: any) => c?.slug).map((cat: any) => (
            <Link
              key={cat.slug || cat._id}
              to={`/category/${cat.slug}`}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                categorySlugMatches(category, cat)
                  ? "bg-[#E85A00] text-white"
                  : "text-sb-ink-muted/60 hover:text-sb-ink hover:bg-white-2 border border-sb-ink/10"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main content: filters + grid ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-6 items-start">

          {/* Desktop filter sidebar */}
          <aside className="sf-category-filters hidden lg:block w-56 shrink-0">
            <div className="sb-card !rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-sb-ink flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#E85A00]" /> Filters
                </h3>
                {activeFilters > 0 && (
                  <span className="bg-[#E85A00] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Sort + count bar */}
            <div className={`flex items-center justify-between mb-4 bg-white border border-gray-100 rounded-lg px-4 py-2.5 ${isRefreshing ? "opacity-80" : ""}`}>
              <span className="text-sm text-gray-500 flex items-center gap-2">
                {isRefreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E85A00]" aria-hidden />}
                <span>
                  {displayTotal == null ? (
                    <span className="text-gray-500">Loading products…</span>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-900">{displayTotal}</span> products
                      {activeFilters > 0 && <span className="ml-1.5 text-[#E85A00] text-xs">· {activeFilters} filter{activeFilters > 1 ? "s" : ""} applied</span>}
                    </>
                  )}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="lg:hidden flex items-center gap-1.5 text-xs border border-sb-ink/15 rounded-lg px-3 py-1.5 text-sb-ink-muted hover:border-[#E85A00] transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters {activeFilters > 0 && `(${activeFilters})`}
                </button>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(1); }}
                    className="bg-white-2 border border-white/12 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-sb-ink focus:outline-none focus:border-[#E85A00] appearance-none cursor-pointer transition-colors"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-sb-ink-muted/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Mobile filter */}
            {filterOpen && (
              <div className="lg:hidden bg-white border border-sb-ink/10 rounded-2xl p-4 mb-4">
                <FilterPanel />
              </div>
            )}

            {/* Loading state */}
            {showFullSkeleton && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-sb-ink/10 rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-white/5" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-2/3" />
                      <div className="h-4 bg-white/5 rounded" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && paginated.length === 0 && products.length === 0 && (
              <div className="text-center py-20 bg-white border border-sb-ink/10 rounded-2xl px-6">
                <BarChart3 className="w-12 h-12 text-sb-ink-muted/20 mx-auto mb-4" />
                <p className="font-semibold text-sb-ink mb-1">No products found</p>
                {activeFilters > 0 ? (
                  <>
                    <p className="text-sm text-sb-ink-muted/50 mb-4">Try adjusting your filters</p>
                    <button onClick={clearFilters} className="text-sm text-[#E85A00] hover:text-[#CC4E00] font-semibold underline transition-colors">
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-sb-ink-muted/60 max-w-md mx-auto text-left space-y-2 mt-3">
                    <p className="text-center mb-3">
                      {cityId
                        ? `No active products with ${city || "your city"} pricing in this category yet.`
                        : "Select a delivery city to see products with local pricing."}
                    </p>
                    {cityId && (
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Admin: product status must be <strong>Active</strong> (not Draft)</li>
                        <li>Set <strong>city price</strong> for {city || "Bengaluru"} in Cities tab (simple) or per variant (variant products)</li>
                        <li>Add <strong>stock quantity</strong> for that city to enable ordering</li>
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product grid */}
            {paginated.length > 0 && (
              <div className={`sf-listing-grid transition-opacity duration-200 ${isRefreshing ? "opacity-60 pointer-events-none" : ""}`}>
                {paginated.map((product: any) => {
                  const variations = product.variations || [];
                  const slug = product.slug || product._id || product.id;
                  const filterVid = findVariationForFilterSelections(variations, dynAttrSelections);
                  const selVid =
                    varChoice[slug]
                    || filterVid
                    || (variations[0]?._id ? String(variations[0]._id) : "");
                  const vidForCart = selVid || undefined;
                  const cartId = `${slug}::${vidForCart || "base"}`;
                  const cartLine = cart.find((i) => i.id === cartId);
                  const brandName = product.brand?.name || product.brand || "";

                  return (
                    <ListingProductCard
                      key={slug}
                      product={product}
                      categoryFilters={categoryFilters}
                      city={city}
                      selectedVariationId={selVid}
                      onVariationChange={(vid) => setVarChoice((v) => ({ ...v, [slug]: vid }))}
                      cartLine={cartLine}
                      onAdd={({ qty, variationId, variationLabel, unitPrice, pricingSnapshot, image }) => {
                        const id = `${slug}::${variationId || "base"}`;
                        addToCart({
                          id,
                          productSlug: slug,
                          variationId,
                          variationLabel,
                          name: product.name,
                          brand: brandName,
                          price: unitPrice,
                          qty,
                          unit: product.unit || "unit",
                          image,
                          pricingSnapshot: pricingSnapshot || undefined,
                          gstPercentage: Number.isFinite(Number(product.gstPercentage))
                            ? Number(product.gstPercentage)
                            : 18,
                        });
                      }}
                      onUpdateQty={(delta) => {
                        if (cartLine) updateQty(cartId, cartLine.qty + delta);
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-sb-ink-muted hover:border-[#E85A00] hover:text-[#E85A00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p === page
                        ? "bg-[#E85A00] text-white"
                        : "border border-white/12 text-sb-ink-muted hover:border-[#E85A00] hover:text-[#E85A00]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-sb-ink-muted hover:border-[#E85A00] hover:text-[#E85A00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Dark RFQ CTA ──────────────────────────────────────────── */}
            <div className="mt-8 bg-black rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
              <div>
                <p className="font-black text-white text-lg mb-1">Need {catData?.name} in bulk?</p>
                <p className="text-sm text-white/85">Get competitive quotes from multiple vendors. No minimum order limit.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  to="/rfq"
                  className="flex items-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_12px_rgba(232, 90, 0,0.25)]"
                >
                  <FileText className="w-4 h-4" /> Get RFQ
                </Link>
                <Link
                  to="/bulk"
                  className="flex items-center gap-2 border border-white/25 hover:border-[#E85A00] text-white hover:text-[#E85A00] px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  Bulk Order <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
