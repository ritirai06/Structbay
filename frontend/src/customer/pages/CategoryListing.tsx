import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  SlidersHorizontal, Star, Shield, Zap, ShoppingCart,
  ChevronRight, FileText, ChevronLeft, ChevronDown, X,
  ShieldCheck, BadgeCheck, Building2, Package,
  ArrowRight, BarChart3, Heart, GitCompare, MapPin,
  Plus, Minus,
} from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import {
  formatVariationLabel,
  firstImageUrl,
  topAttributeChipsForListing,
} from "../lib/productAttributes";

const PAGE_SIZE = 12;

/** URL param vs API slug (encoding / casing). */
function categorySlugMatches(routeSlug: string | undefined, cat: { slug?: string }) {
  if (!routeSlug) return false;
  const a = decodeURIComponent(String(routeSlug)).trim().toLowerCase();
  const b = decodeURIComponent(String(cat?.slug ?? "")).trim().toLowerCase();
  return a.length > 0 && a === b;
}

function unitPriceForListingProduct(p: any, variationId: string | null) {
  if (variationId && p.variationPricing?.length) {
    const row = p.variationPricing.find((x: any) => String(x.variation) === variationId);
    if (row) return Number(row.salePrice ?? row.regularPrice ?? 0);
  }
  const sale = p.pricing?.salePrice;
  const reg = p.pricing?.regularPrice;
  return Number(sale ?? reg ?? p.price ?? 0);
}

const SORT_OPTIONS = [
  { value: "default",    label: "Most Popular" },
  { value: "newest",     label: "Newest" },
  { value: "priceLow",   label: "Price: Low to High" },
  { value: "priceHigh",  label: "Price: High to Low" },
  { value: "rating",     label: "Top Rated" },
  { value: "express",    label: "Express Delivery" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "StructBay Assured",  desc: "Quality verified",   color: "text-[#C9A227]", bg: "bg-[#C9A227]/10 border-[#C9A227]/20" },
  { icon: Zap,         label: "Express Delivery",   desc: "In 24-48 hours",     color: "text-[#FE5E00]", bg: "bg-[#FE5E00]/10 border-[#FE5E00]/20" },
  { icon: BadgeCheck,  label: "GST Billing",        desc: "On every order",     color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { icon: Building2,   label: "Verified Vendors",   desc: "Background checked", color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Package,     label: "Bulk Available",     desc: "No minimum order",   color: "text-purple-400",bg: "bg-purple-500/10 border-purple-500/20" },
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

export function CategoryListing() {
  const { category } = useParams<{ category?: string }>();
  const { addToCart, updateQty, cart, city, cityId, isWishlisted, addToWishlist, removeFromWishlist, addToCompare } = useApp();
  const navigate = useNavigate();

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
  const [minRating, setMinRating]           = useState(0);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [page, setPage]                     = useState(1);
  /** Per-product slug → selected variation id for pricing / add-to-cart */
  const [varChoice, setVarChoice]           = useState<Record<string, string>>({});
  /** Category page: maps sidebar brand name → Mongo id for API `brand` filter */
  const brandNameToIdRef = useRef<Record<string, string>>({});

  // ── Reset filters when category changes ───────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedBrands([]);
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
    setVarChoice({});
    setDynAttrSelections({});
    brandNameToIdRef.current = {};
  }, [category]);

  // ── Fetch data from API ────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const cid = cityId || undefined;

    if (isShopAll) {
      const params: Record<string, any> = {
        limit: 100,
        sort: sortBy,
        page,
      };
      if (cid) params.cityId = cid;
      if (showAssured) params.assured = "true";
      if (showExpress) params.express = "true";

      api.getProducts(params)
        .then((res: any) => {
          const data = res.data || [];
          setProducts(data);
          setTotalCount(res.pagination?.total || data.length);
          setCategoryFilters([]);
          setCatData({
            name: "Shop All",
            slug: "all",
            bannerImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=300&fit=crop",
            longDescription: "Browse all premium construction materials from verified vendors.",
          });
          const brandNames = [...new Set(data.map((p: any) => p.brand?.name || p.brand).filter(Boolean))];
          setAllBrands(brandNames as string[]);
          brandNameToIdRef.current = {};
        })
        .finally(() => setLoading(false));
    } else {
      const qp: Record<string, string> = {
        sort: sortBy,
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (cid) qp.cityId = cid;
      if (showAssured) qp.assured = "true";
      if (showExpress) qp.express = "true";
      if (priceMin) qp.minPrice = priceMin;
      if (priceMax) qp.maxPrice = priceMax;
      const brandIds = selectedBrands.map((n) => brandNameToIdRef.current[n]).filter(Boolean);
      if (brandIds.length) qp.brands = brandIds.join(",");
      Object.entries(dynAttrSelections).forEach(([k, vals]) => {
        if (vals?.length) qp[k] = vals.join(",");
      });

      api.getCategoryDetails(category!, qp)
        .then((res: any) => {
          const d = res.data || {};
          setCatData(d.category || null);
          setProducts(d.products || []);
          setTotalCount(d.pagination?.total || (d.products || []).length);
          setCategoryFilters(Array.isArray(d.filters) ? d.filters : []);
          const brands = d.brands || [];
          const map: Record<string, string> = {};
          brands.forEach((b: any) => {
            if (b?.name) map[b.name] = String(b._id);
          });
          brandNameToIdRef.current = map;
          setAllBrands(brands.map((b: any) => b.name || b.slug || ""));
          if (!d.category) navigate("/shop", { replace: true });
        })
        .finally(() => setLoading(false));
    }
  }, [category, cityId, isShopAll, sortBy, page, showAssured, showExpress, selectedBrands, priceMin, priceMax, JSON.stringify(dynAttrSelections)]);

  // Quick-nav pills: API `/category/:slug` does not return sibling list — always load categories.
  useEffect(() => {
    const params: Record<string, any> = { status: "ACTIVE", limit: 100 };
    const cid = cityId || undefined;
    if (cid) params.cityId = cid;
    api
      .getCategories(params)
      .then((res: any) => setAllCategories(res.data || []))
      .catch(() => setAllCategories([]));
  }, [cityId]);

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

  // ── Client-side filters (shop-all: full list; category page: only fields not on server) ───────
  let filteredProducts = [...products];
  if (isShopAll) {
    if (selectedBrands.length > 0)
      filteredProducts = filteredProducts.filter((p: any) =>
        selectedBrands.includes(p.brand?.name || p.brand)
      );
    if (priceMin)
      filteredProducts = filteredProducts.filter(
        (p: any) => (p.pricing?.regularPrice || p.price || 0) >= Number(priceMin)
      );
    if (priceMax)
      filteredProducts = filteredProducts.filter(
        (p: any) => (p.pricing?.regularPrice || p.price || 0) <= Number(priceMax)
      );
    if (inStockOnly) filteredProducts = filteredProducts.filter((p: any) => p.inStock !== false);
    if (sortBy === "priceLow")
      filteredProducts = [...filteredProducts].sort(
        (a, b) => (a.pricing?.regularPrice || a.price || 0) - (b.pricing?.regularPrice || b.price || 0)
      );
    if (sortBy === "priceHigh")
      filteredProducts = [...filteredProducts].sort(
        (a, b) => (b.pricing?.regularPrice || b.price || 0) - (a.pricing?.regularPrice || a.price || 0)
      );
    if (sortBy === "express")
      filteredProducts = [...filteredProducts].sort(
        (a, b) => (b.isExpress ? 1 : 0) - (a.isExpress ? 1 : 0)
      );
  } else {
    if (minRating > 0)
      filteredProducts = filteredProducts.filter((p: any) => Number(p.rating || 0) >= minRating);
    if (inStockOnly) filteredProducts = filteredProducts.filter((p: any) => p.inStock !== false);
  }

  const totalPages = isShopAll
    ? Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
    : Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));

  const paginated = isShopAll
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
    setMinRating(0);
    setDynAttrSelections({});
    setPage(1);
  };

  const dynAttrActiveCount = Object.values(dynAttrSelections).reduce((n, a) => n + (a?.length || 0), 0);
  const activeFilters =
    selectedBrands.length +
    (showAssured ? 1 : 0) +
    (showExpress ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0) +
    dynAttrActiveCount;

  if (!catData && !loading) return null;

  const FilterPanel = () => (
    <div>
      {activeFilters > 0 && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors mb-4">
          <X className="w-3 h-3" /> Clear all ({activeFilters})
        </button>
      )}

      <AccordionSection title="Quick badges">
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showAssured} onChange={e => { setShowAssured(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#C9A227]" />
            <Shield className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Assured only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showExpress} onChange={e => { setShowExpress(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#FE5E00]" />
            <Zap className="w-3.5 h-3.5 text-[#FE5E00]" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Express delivery</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={inStockOnly} onChange={e => { setInStockOnly(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#FE5E00]" />
            <Package className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
            <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">In stock only</span>
          </label>
        </div>
      </AccordionSection>

      <AccordionSection title="Brand">
        <div className="space-y-2">
          {allBrands.map((brand: any) => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => { toggleBrand(brand); setPage(1); }} className="w-4 h-4 rounded accent-[#FE5E00]" />
              <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">{brand}</span>
            </label>
          ))}
          {allBrands.length === 0 && (
            <p className="text-xs text-sb-ink-muted/40">No brands for this category</p>
          )}
        </div>
      </AccordionSection>

      {!isShopAll &&
        categoryFilters
          .filter((f: any) => f?.key && f?.isActive !== false)
          .sort((a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
          .map((f: any) => (
            <AccordionSection key={String(f.key)} title={f.label || f.key}>
              {f.type === "RANGE" ? (
                <p className="text-xs text-sb-ink-muted/50">Use the price range below. Advanced per-attribute ranges can be enabled from admin.</p>
              ) : (f.options || []).length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(f.options || []).map((opt: any) => {
                    const val = String(opt.value ?? opt.label ?? "");
                    const label = String(opt.label ?? opt.value ?? "");
                    const checked = (dynAttrSelections[String(f.key)] || []).includes(val);
                    return (
                      <label key={`${f.key}:${val}`} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDynFilter(String(f.key), val)}
                          className="w-4 h-4 rounded accent-[#FE5E00]"
                        />
                        <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">{label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-sb-ink-muted/50">
                  Add options in Admin → Category filters so shoppers can narrow by {f.label || f.key}. Variant values already exist on products.
                </p>
              )}
            </AccordionSection>
          ))}

      <AccordionSection title="Price Range (₹)">
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={priceMin}
            onChange={e => { setPriceMin(e.target.value); setPage(1); }}
            className="w-full bg-sb-surface border border-white/12 rounded-lg px-2.5 py-1.5 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
          <input type="number" placeholder="Max" value={priceMax}
            onChange={e => { setPriceMax(e.target.value); setPage(1); }}
            className="w-full bg-sb-surface border border-white/12 rounded-lg px-2.5 py-1.5 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
      </AccordionSection>

      <AccordionSection title="Minimum Rating" defaultOpen={false}>
        <div className="flex gap-1.5">
          {[3, 3.5, 4, 4.5].map(r => (
            <button
              key={r}
              onClick={() => { setMinRating(minRating === r ? 0 : r); setPage(1); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                minRating === r
                  ? "bg-[#C9A227] text-sb-on-orange border-[#C9A227]"
                  : "border-sb-ink/15 text-sb-ink-muted/70 hover:border-[#C9A227]/50"
              }`}
            >
              <Star className="w-3 h-3 fill-current" /> {r}+
            </button>
          ))}
        </div>
      </AccordionSection>
    </div>
  );

  return (
    <div className="bg-sb-page min-h-screen">

      {/* ── Category Hero Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
        <div className="absolute inset-0">
          <img
            src={catData?.bannerImage || catData?.image || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=300&fit=crop"}
            alt={catData?.name || ""}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sb-ink via-sb-ink/90 to-sb-ink/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <nav className="flex items-center gap-1.5 text-xs text-white/65 mb-4 flex-wrap">
            <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 text-white/40 shrink-0" />
            <Link to="/shop" className="hover:text-[#FE5E00] transition-colors">Shop</Link>
            {!isShopAll && (
              <>
                <ChevronRight className="w-3 h-3 text-white/40 shrink-0" />
                <span className="text-white font-medium">{catData?.name}</span>
              </>
            )}
          </nav>

          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black !text-white mb-2 drop-shadow-sm">{catData?.name}</h1>
              <p className="text-white/85 max-w-xl text-sm leading-relaxed">
                {catData?.description || catData?.longDescription || "Browse premium construction materials from verified vendors."}
              </p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-xs text-white/95 bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                  {totalCount}+ Products
                </span>
                {city && (
                  <span className="text-xs text-white/95 bg-white/10 border border-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#FE5E00]" /> Delivering in {city}
                  </span>
                )}
              </div>
            </div>
            <Link
              to="/rfq"
              className="hidden md:flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-5 py-3 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_16px_rgba(254,94,0,0.3)] shrink-0"
            >
              <FileText className="w-4 h-4" /> Get Bulk Quote
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust badges bar ──────────────────────────────────────────────── */}
      <div className="bg-sb-surface border-y border-sb-ink/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TRUST_BADGES.map(({ icon: Icon, label, desc, color, bg }) => (
              <div key={label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${bg}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${color}`}>{label}</p>
                  <p className="text-xs text-sb-ink-muted/60">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category quick-nav ─────────────────────────────────────────────── */}
      <div className="bg-sb-surface border-b border-sb-ink/10 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2.5">
          <Link
            to="/shop"
            className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
              isShopAll
                ? "bg-[#FE5E00] text-sb-on-orange"
                : "text-sb-ink-muted/60 hover:text-sb-ink hover:bg-sb-surface-2 border border-sb-ink/10"
            }`}
          >
            All
          </Link>
          {allCategories.filter((c: any) => c?.slug).map((cat: any) => (
            <Link
              key={cat.slug || cat._id}
              to={`/category/${cat.slug}`}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                categorySlugMatches(category, cat)
                  ? "bg-[#FE5E00] text-sb-on-orange"
                  : "text-sb-ink-muted/60 hover:text-sb-ink hover:bg-sb-surface-2 border border-sb-ink/10"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main content: filters + grid ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-4 sticky top-28">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-sb-ink flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#FE5E00]" /> Filters
                </h3>
                {activeFilters > 0 && (
                  <span className="bg-[#FE5E00] text-sb-on-orange text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Sort + count bar */}
            <div className="flex items-center justify-between mb-4 bg-sb-surface border border-sb-ink/10 rounded-xl px-4 py-2.5">
              <span className="text-sm text-sb-ink-muted/60">
                <span className="font-semibold text-sb-ink">{isShopAll ? filteredProducts.length : totalCount}</span> products
                {activeFilters > 0 && <span className="ml-1.5 text-[#FE5E00] text-xs">· {activeFilters} filter{activeFilters > 1 ? "s" : ""} applied</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="lg:hidden flex items-center gap-1.5 text-xs border border-sb-ink/15 rounded-lg px-3 py-1.5 text-sb-ink-muted hover:border-[#FE5E00] transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters {activeFilters > 0 && `(${activeFilters})`}
                </button>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(1); }}
                    className="bg-sb-surface-2 border border-white/12 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-sb-ink focus:outline-none focus:border-[#FE5E00] appearance-none cursor-pointer transition-colors"
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
              <div className="lg:hidden bg-sb-surface border border-sb-ink/10 rounded-2xl p-4 mb-4">
                <FilterPanel />
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden animate-pulse">
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
            {!loading && paginated.length === 0 && (
              <div className="text-center py-20 bg-sb-surface border border-sb-ink/10 rounded-2xl">
                <BarChart3 className="w-12 h-12 text-sb-ink-muted/20 mx-auto mb-4" />
                <p className="font-semibold text-sb-ink mb-1">No products found</p>
                <p className="text-sm text-sb-ink-muted/50 mb-4">Try adjusting your filters</p>
                <button onClick={clearFilters} className="text-sm text-[#FE5E00] hover:text-[#E05200] font-semibold underline transition-colors">
                  Clear all filters
                </button>
              </div>
            )}

            {/* Product grid */}
            {!loading && paginated.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((product: any) => {
                  const variations = product.variations || [];
                  const slug = product.slug || product._id || product.id;
                  const selVid = varChoice[slug] || (variations[0]?._id ? String(variations[0]._id) : "");
                  const unitP = unitPriceForListingProduct(product, selVid || null);
                  const regP = Number(product.pricing?.regularPrice ?? product.price ?? unitP);
                  const discount = regP && unitP < regP ? Math.round((1 - unitP / regP) * 100) : 0;
                  const image = firstImageUrl(product.images);
                  const brandName = product.brand?.name || product.brand || "";
                  const selectedVar = variations.find((v: any) => String(v._id) === selVid);
                  const attrChips = topAttributeChipsForListing(selectedVar || variations[0], categoryFilters, 5);
                  const showAssuredBadge = !!(product.isStructbayAssured || product.isAssured || product.displayStructbayAssured);
                  const showDeliveryBadge = !!(product.isStructbayDelivery || product.isExpress || product.displayStructbayDelivery);
                  const vidForCart = selVid || undefined;
                  const cartId = `${slug}::${vidForCart || "base"}`;
                  const cartLine = cart.find((i) => i.id === cartId);

                  return (
                    <div key={slug} className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/40 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all duration-300 group flex flex-col">
                      {/* Image */}
                      <Link to={`/products/${slug}`} className="relative aspect-square overflow-hidden bg-sb-surface-2 shrink-0 block">
                        {image ? (
                          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sb-ink-muted/35">
                            <Package className="w-14 h-14" aria-hidden />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1 flex-col">
                          {showAssuredBadge && (
                            <span className="bg-sb-page/90 text-[#C9A227] border border-[#C9A227]/40 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              <Shield className="w-2.5 h-2.5" /> Assured
                            </span>
                          )}
                          {showDeliveryBadge && (
                            <span className="bg-[#FE5E00] text-sb-on-orange text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              <Zap className="w-2.5 h-2.5" /> Delivery
                            </span>
                          )}
                        </div>

                        {/* Discount badge */}
                        {discount > 0 && (
                          <div className="absolute top-2 right-2 bg-[#C9A227] text-sb-on-orange text-[10px] font-black px-2 py-0.5 rounded-full">
                            -{discount}%
                          </div>
                        )}

                        {/* Wishlist & compare hover */}
                        <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.preventDefault(); isWishlisted(slug) ? removeFromWishlist(slug) : addToWishlist(slug); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${isWishlisted(slug) ? "bg-red-500/15 border-red-500/40 text-red-400" : "bg-sb-page/70 border-sb-ink/18 text-sb-ink-muted hover:text-red-400"}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isWishlisted(slug) ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={e => { e.preventDefault(); addToCompare(slug); }}
                            className="w-7 h-7 rounded-full bg-sb-page/70 border border-sb-ink/18 flex items-center justify-center text-sb-ink-muted hover:text-[#FE5E00] transition-colors"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-[10px] text-sb-ink-muted/50 font-medium uppercase tracking-wide">{brandName}</p>
                        <Link to={`/products/${slug}`}>
                          <h3 className="text-sm font-medium text-sb-ink line-clamp-2 mt-0.5 leading-snug hover:text-[#FE5E00] transition-colors">{product.name}</h3>
                        </Link>

                        {/* City tag */}
                        {city && (
                          <span className="text-[10px] text-sb-ink-muted/50 flex items-center gap-0.5 mt-1">
                            <MapPin className="w-2.5 h-2.5" /> {city} price
                          </span>
                        )}

                        {attrChips.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {attrChips.map((c) => (
                              <span
                                key={`${c.label}:${c.value}`}
                                className="text-[10px] leading-tight px-1.5 py-0.5 rounded-md bg-sb-page border border-sb-ink/10 text-sb-ink-muted"
                              >
                                <span className="text-sb-ink-muted/55">{c.label}: </span>
                                <span className="font-semibold text-sb-ink">{c.value}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {variations.length > 0 && (
                          <label className="block mt-2">
                            <span className="sr-only">Variant</span>
                            <select
                              value={selVid}
                              onChange={e => setVarChoice(v => ({ ...v, [slug]: e.target.value }))}
                              className="w-full mt-1 text-[11px] bg-sb-surface-2 border border-white/12 rounded-lg px-2 py-1.5 text-sb-ink focus:outline-none focus:border-[#FE5E00]"
                            >
                              {variations.map((v: any) => (
                                <option key={v._id} value={String(v._id)}>{formatVariationLabel(v)}</option>
                              ))}
                            </select>
                          </label>
                        )}

                        {/* Price (ex-GST at listing — GST at checkout) */}
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          {discount > 0 ? (
                            <>
                              <span className="font-black text-[#FE5E00]">₹{Number(unitP).toLocaleString()}</span>
                              <span className="text-xs text-sb-ink-muted/40 line-through">₹{Number(regP).toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="font-black text-[#FE5E00]">₹{Number(unitP).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-sb-ink-muted/40">per {product.unit || "unit"} · excl. GST</p>

                        {/* Express ETA */}
                        {product.isExpress && (
                          <p className="text-[10px] text-[#FE5E00] mt-1 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Delivery in 24-48 hrs
                          </p>
                        )}

                        {/* Actions: Add → inline − qty + when line is in cart */}
                        <div className="mt-auto pt-3 flex gap-1.5 items-stretch">
                          {cartLine ? (
                            <div className="flex-1 flex items-stretch rounded-xl border-2 border-[#FE5E00]/60 bg-sb-surface-2 overflow-hidden min-h-[2.25rem]">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() => updateQty(cartId, cartLine.qty - 1)}
                                className="w-9 shrink-0 flex items-center justify-center text-[#FE5E00] hover:bg-[#FE5E00]/15 active:bg-[#FE5E00]/25 transition-colors"
                              >
                                <Minus className="w-4 h-4 stroke-[2.5]" />
                              </button>
                              <span className="flex-1 min-w-0 flex items-center justify-center text-sm font-black text-sb-ink tabular-nums border-x border-[#FE5E00]/25">
                                {cartLine.qty}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => updateQty(cartId, cartLine.qty + 1)}
                                className="w-9 shrink-0 flex items-center justify-center text-[#FE5E00] hover:bg-[#FE5E00]/15 active:bg-[#FE5E00]/25 transition-colors"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                addToCart({
                                  id: cartId,
                                  productSlug: slug,
                                  variationId: vidForCart,
                                  variationLabel: selectedVar ? formatVariationLabel(selectedVar) : undefined,
                                  name: product.name,
                                  brand: brandName,
                                  price: unitP,
                                  qty: 1,
                                  unit: product.unit || "unit",
                                  image: image || "",
                                });
                              }}
                              className="flex-1 py-2 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" /> Add
                            </button>
                          )}
                          <Link
                            to="/rfq"
                            className="py-2 px-2.5 rounded-xl border border-sb-ink/15 hover:border-[#FE5E00]/50 text-sb-ink-muted hover:text-[#FE5E00] transition-colors flex items-center justify-center shrink-0"
                            title="Get RFQ"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
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
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-sb-ink-muted hover:border-[#FE5E00] hover:text-[#FE5E00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p === page
                        ? "bg-[#FE5E00] text-sb-on-orange"
                        : "border border-white/12 text-sb-ink-muted hover:border-[#FE5E00] hover:text-[#FE5E00]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-sb-ink-muted hover:border-[#FE5E00] hover:text-[#FE5E00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Dark RFQ CTA ──────────────────────────────────────────── */}
            <div className="mt-8 bg-[#1A1A1A] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
              <div>
                <p className="font-black text-white text-lg mb-1">Need {catData?.name} in bulk?</p>
                <p className="text-sm text-white/85">Get competitive quotes from multiple vendors. No minimum order limit.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  to="/rfq"
                  className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_12px_rgba(254,94,0,0.25)]"
                >
                  <FileText className="w-4 h-4" /> Get RFQ
                </Link>
                <Link
                  to="/bulk"
                  className="flex items-center gap-2 border border-white/25 hover:border-[#FE5E00] text-white hover:text-[#FE5E00] px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
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
