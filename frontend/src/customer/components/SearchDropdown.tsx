import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, History, TrendingUp, X, Loader2, Award, LayoutGrid } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

interface SearchDropdownProps {
  query: string;
  onSelect: () => void;
  onClose: () => void;
}

export function SearchDropdown({ query, onSelect, onClose }: SearchDropdownProps) {
  const { recentSearches, clearRecentSearches, cityId, city } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const catP: Record<string, string> = { status: "ACTIVE", limit: "8" };
    const brandP: Record<string, string> = { status: "ACTIVE", limit: "10" };
    const prodP: Record<string, string> = { limit: "4", isTopSelling: "true" };
    if (cityId) {
      catP.cityId = cityId;
      brandP.cityId = cityId;
      prodP.cityId = cityId;
    }
    Promise.all([
      api.getCategories(catP).then((r: any) => r.data || []),
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
  }, [cityId, query]);

  const hasRecent = recentSearches.length > 0;
  const showExplorer = !query.trim();

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-sb-surface border border-sb-ink/12 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
      <div className="p-4 grid gap-6 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
        <div className="space-y-6">
          {hasRecent && showExplorer && (
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
                  className="text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors"
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
                    <Search className="w-3.5 h-3.5 text-sb-ink-muted/30 group-hover:text-[#FE5E00]" />
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {showExplorer && (
            <>
              {city && (
                <p className="text-[10px] text-[#FE5E00]/85 font-medium">
                  Categories &amp; brands available in {city}
                </p>
              )}
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FE5E00]" /> Loading…
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
                            className="flex items-center gap-2.5 p-2 rounded-xl border border-sb-ink/8 bg-sb-surface-2 hover:border-[#FE5E00]/40 hover:bg-[#2A2A2A] transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] border border-sb-ink/12 overflow-hidden shrink-0 flex items-center justify-center">
                              {cat.image?.url ? (
                                <img src={cat.image.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <LayoutGrid className="w-4 h-4 text-sb-ink-muted/45" aria-hidden />
                              )}
                            </div>
                            <span className="text-sm font-medium text-sb-ink group-hover:text-[#FE5E00] transition-colors line-clamp-2">
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
                            className="text-xs px-2.5 py-1 rounded-full border border-sb-ink/12 bg-sb-surface-2 text-sb-ink-muted hover:border-[#FE5E00]/50 hover:text-[#FE5E00] transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/40 mb-3">
            {city ? `Top selling in ${city}` : "Top selling"}
          </h4>
          {showExplorer && loading ? (
            <div className="flex items-center gap-2 text-xs text-sb-ink-muted/50 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#FE5E00]" />
            </div>
          ) : showExplorer && products.length === 0 ? (
            <p className="text-xs text-sb-ink-muted/45">No products to show. Pick a city or add catalogue stock.</p>
          ) : showExplorer ? (
            <div className="space-y-2">
              {products.map((product: any) => {
                const slug = product.slug || product._id;
                const img = product.images?.[0]?.url || product.images?.[0];
                const price =
                  Number(product.pricing?.salePrice ?? product.pricing?.regularPrice ?? product.price ?? 0) || 0;
                const brandName = product.brand?.name || product.brand || "";
                return (
                  <Link
                    key={product._id}
                    to={`/product/${slug}`}
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
                      <p className="text-sm font-medium text-sb-ink line-clamp-2 group-hover:text-[#FE5E00] transition-colors">
                        {product.name}
                      </p>
                      <p className="text-xs font-bold text-[#FE5E00] mt-0.5">₹{price.toLocaleString("en-IN")}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-sb-ink-muted/50">Type and press Enter to search.</p>
          )}
        </div>
      </div>

      <div className="bg-sb-surface-2 px-4 py-2.5 border-t border-sb-ink/8 flex items-center justify-between">
        <p className="text-xs text-sb-ink-muted/50">Press Enter to search all products{city ? ` in ${city}` : ""}</p>
        <button type="button" onClick={onClose} className="text-xs text-sb-ink-muted/50 hover:text-sb-ink flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Close
        </button>
      </div>
    </div>
  );
}
