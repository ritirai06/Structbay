import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, History, TrendingUp, X, Loader2, Award, LayoutGrid, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { fetchNavCategories } from "../lib/navCategories";
import { productHref } from "../lib/productRoutes";

interface SearchDropdownProps {
  query: string;
  onSelect: () => void;
  onClose: () => void;
}

const MIN_SEARCH_CHARS = 2;
const TYPEAHEAD_DEBOUNCE_MS = 280;

function productRowPrice(product: any): number {
  const sale = product.pricing?.salePrice;
  const reg = product.pricing?.regularPrice;
  return Number(sale ?? reg ?? product.price ?? 0) || 0;
}

export function SearchDropdown({ query, onSelect, onClose }: SearchDropdownProps) {
  const { recentSearches, clearRecentSearches, cityId, city } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [taCategories, setTaCategories] = useState<any[]>([]);
  const [taBrands, setTaBrands] = useState<any[]>([]);
  const [taProducts, setTaProducts] = useState<any[]>([]);
  const [taLoading, setTaLoading] = useState(false);

  const trimmed = query.trim();
  const showExplorer = !trimmed;

  useEffect(() => {
    if (!showExplorer) {
      return;
    }
    setLoading(true);
    const brandP: Record<string, string> = { status: "ACTIVE", limit: "10" };
    const prodP: Record<string, string> = { limit: "4", isTopSelling: "true" };
    if (cityId) {
      brandP.cityId = cityId;
      prodP.cityId = cityId;
    }
    Promise.all([
      fetchNavCategories({ cityId, max: 8 }),
      api.getBrands(brandP).then((r: any) => r.data || []),
      api.getProducts(prodP).then((r: any) => r.data || []),
    ])
      .then(([c, b, p]) => {
        setCategories(c);
        setBrands(b);
        setProducts(p);
      })
      .catch(() => {
        setCategories([]);
        setBrands([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [cityId, showExplorer]);

  useEffect(() => {
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setTaCategories([]);
      setTaBrands([]);
      setTaProducts([]);
      setTaLoading(false);
      return;
    }

    setTaLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = cityId ? { cityId } : undefined;
      api
        .globalSearch(trimmed, params)
        .then((res: any) => {
          if (cancelled) return;
          const d = res?.data || {};
          setTaProducts(Array.isArray(d.products) ? d.products : []);
          setTaCategories(Array.isArray(d.categories) ? d.categories : []);
          setTaBrands(Array.isArray(d.brands) ? d.brands : []);
        })
        .catch(() => {
          if (cancelled) return;
          setTaProducts([]);
          setTaCategories([]);
          setTaBrands([]);
        })
        .finally(() => {
          if (!cancelled) setTaLoading(false);
        });
    }, TYPEAHEAD_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, cityId]);

  const hasRecent = recentSearches.length > 0;
  const encodedQ = encodeURIComponent(trimmed);
  const hasTypeaheadHits = taCategories.length + taBrands.length + taProducts.length > 0;

  function renderProductLink(product: any) {
    const slug = product.slug || product._id;
    const img = product.images?.[0]?.url || product.images?.[0];
    const price = productRowPrice(product);
    const brandName = product.brand?.name || product.brand || "";
    return (
      <Link
        key={product._id}
        to={productHref(slug)}
        onClick={onSelect}
        className="flex gap-3 p-2 rounded-xl hover:bg-sb-surface-2 transition-colors group border border-transparent hover:border-sb-ink/8"
      >
        <div className="w-12 h-12 rounded-lg bg-sb-surface-2 overflow-hidden shrink-0 border border-sb-ink/10">
          {img ? (
            <img
              src={typeof img === "string" ? img : img.url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sb-ink-muted/30 text-[10px]">IMG</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-sb-ink-muted/50 uppercase tracking-wide truncate">{brandName}</p>
          <p className="text-sm font-medium text-sb-ink line-clamp-2 group-hover:text-[#E85A00] transition-colors">{product.name}</p>
          <p className="text-xs font-bold text-[#E85A00] mt-0.5">₹{price.toLocaleString("en-IN")}</p>
        </div>
      </Link>
    );
  }

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-sb-surface border border-sb-ink/12 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
      role="listbox"
      aria-label="Search suggestions"
    >
      <div className="p-4 grid gap-6 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
        {showExplorer ? (
          <>
            <div className="space-y-6">
              {hasRecent && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" /> Recent Searches
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearRecentSearches();
                      }}
                      className="text-xs text-[#E85A00] hover:text-[#CC4E00] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((term) => (
                      <Link
                        key={term}
                        to={`/search?q=${encodeURIComponent(term)}`}
                        onClick={onSelect}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-sb-ink hover:bg-sb-surface-2 rounded-lg transition-colors group"
                      >
                        <Search className="w-3.5 h-3.5 text-sb-ink-muted/30 group-hover:text-[#E85A00]" />
                        {term}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {city && (
                <p className="text-[10px] text-[#E85A00]/85 font-medium">Categories &amp; brands available in {city}</p>
              )}
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E85A00]" /> Loading…
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-3.5 h-3.5" /> Categories
                    </h4>
                    {categories.length === 0 ? (
                      <p className="text-xs text-sb-ink-muted/45">
                        {cityId
                          ? "No categories with stock in this city yet. Try another city or check pricing & inventory."
                          : "Select a delivery city for a localized catalogue."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {categories.slice(0, 8).map((cat: any) => (
                          <Link
                            key={cat._id || cat.slug}
                            to={`/category/${cat.slug}`}
                            onClick={onSelect}
                            className="flex items-center gap-2.5 p-2 rounded-xl border border-sb-ink/8 bg-sb-surface-2 hover:border-[#E85A00]/40 hover:bg-black transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-black border border-white/12 overflow-hidden shrink-0 flex items-center justify-center">
                              {cat.image?.url ? (
                                <img src={cat.image.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <LayoutGrid className="w-4 h-4 text-sb-ink-muted/45" aria-hidden />
                              )}
                            </div>
                            <span className="text-sm font-medium text-sb-ink group-hover:text-[#E85A00] transition-colors line-clamp-2">
                              {cat.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 flex items-center gap-1.5 mb-3">
                      <Award className="w-3.5 h-3.5" /> Brands
                    </h4>
                    {brands.length === 0 ? (
                      <p className="text-xs text-sb-ink-muted/45">No brands for this view.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {brands.slice(0, 10).map((b: any) => (
                          <Link
                            key={b._id || b.slug}
                            to={`/brand/${b.slug}`}
                            onClick={onSelect}
                            className="text-xs px-2.5 py-1 rounded-full border border-sb-ink/12 bg-sb-surface-2 text-sb-ink-muted hover:border-[#E85A00]/50 hover:text-[#E85A00] transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 mb-3">
                {city ? `Top selling in ${city}` : "Top selling"}
              </h4>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E85A00]" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-xs text-sb-ink-muted/45">No products to show. Pick a city or add catalogue stock.</p>
              ) : (
                <div className="space-y-2">{products.map((product: any) => renderProductLink(product))}</div>
              )}
            </div>
          </>
        ) : trimmed.length < MIN_SEARCH_CHARS ? (
          <div className="md:col-span-2 text-center py-8 px-4">
            <p className="text-sm text-sb-ink">Keep typing…</p>
            <p className="text-xs text-sb-ink-muted/60 mt-2">Use at least {MIN_SEARCH_CHARS} characters to search the catalogue (same as full results).</p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {taLoading ? (
                <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E85A00]" /> Searching…
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 flex items-center gap-1.5 mb-2">
                      <LayoutGrid className="w-3.5 h-3.5" /> Categories
                    </h4>
                    {taCategories.length === 0 ? (
                      <p className="text-xs text-sb-ink-muted/45">No category name matches.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {taCategories.map((cat: any) => (
                          <Link
                            key={cat._id || cat.slug}
                            to={`/category/${cat.slug}`}
                            onClick={onSelect}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-sb-ink hover:bg-sb-surface-2 border border-transparent hover:border-sb-ink/10"
                          >
                            <span className="truncate">{cat.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-sb-ink-muted/40 shrink-0" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 flex items-center gap-1.5 mb-2">
                      <Award className="w-3.5 h-3.5" /> Brands
                    </h4>
                    {taBrands.length === 0 ? (
                      <p className="text-xs text-sb-ink-muted/45">No brand name matches.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {taBrands.map((b: any) => (
                          <Link
                            key={b._id || b.slug}
                            to={`/brand/${b.slug}`}
                            onClick={onSelect}
                            className="text-xs px-2.5 py-1 rounded-full border border-sb-ink/12 bg-sb-surface-2 text-sb-ink-muted hover:border-[#E85A00]/50 hover:text-[#E85A00] transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 mb-2">Products</h4>
              {taLoading ? (
                <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E85A00]" />
                </div>
              ) : taProducts.length === 0 ? (
                <p className="text-xs text-sb-ink-muted/45">
                  No product matches{city ? ` in ${city}` : ""}. Try another spelling or browse categories.
                </p>
              ) : (
                <div className="space-y-2">{taProducts.map((product: any) => renderProductLink(product))}</div>
              )}
              {!taLoading && (
                <Link
                  to={`/search?q=${encodedQ}`}
                  onClick={onSelect}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: "var(--sb-orange)" }}
                >
                  {hasTypeaheadHits ? "View all results" : "Open search results"} <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-sb-surface-2 px-4 py-2.5 border-t border-sb-ink/8 flex items-center justify-between gap-3">
        <p className="text-xs text-sb-ink-muted/50">
          {trimmed.length >= MIN_SEARCH_CHARS
            ? `Press Enter for full results${city ? ` in ${city}` : ""}.`
            : `Enter at least ${MIN_SEARCH_CHARS} characters, then press Enter or the search button.`}
        </p>
        <button type="button" onClick={onClose} className="text-xs text-sb-ink-muted/50 hover:text-sb-ink flex items-center gap-1 shrink-0">
          <X className="w-3.5 h-3.5" /> Close
        </button>
      </div>
    </div>
  );
}
