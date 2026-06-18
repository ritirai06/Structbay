import { Link, useSearchParams } from "react-router";
import { Search, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { ListingProductCard } from "../components/ListingProductCard";

const SUGGESTIONS = ["Cement bags", "TMT steel bars", "Exterior paint", "CPVC pipes", "Hand tools"];

export function SearchResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [varChoice, setVarChoice] = useState<Record<string, string>>({});
  const [showAssured, setShowAssured] = useState(false);
  const [showExpress, setShowExpress] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { addToCart, updateQty, cart, city, cityId } = useApp();

  useEffect(() => {
    setVarChoice({});
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
  }, [query]);

  const q = query.trim();
  const canSearch = q.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const qp: Record<string, string> = {};
    if (cityId) qp.cityId = cityId;
    if (showAssured) qp.assured = "true";
    if (showExpress) qp.express = "true";
    api.globalSearch(q, Object.keys(qp).length ? qp : undefined)
      .then((res) => {
        setResults(res.data?.products || []);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q, cityId, showAssured, showExpress, canSearch]);

  const filteredResults = useMemo(() => {
    if (!inStockOnly) return results;
    return results.filter((p: any) => p.inStock !== false);
  }, [results, inStockOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Search{q ? `: "${q}"` : ""}</span>
      </nav>

      {!q ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/35" strokeWidth={1.25} aria-hidden />
          <h2 className="text-foreground mb-2 text-xl font-semibold">Search the catalogue</h2>
          <p className="text-muted-foreground text-sm">Use the search bar above. Enter at least two characters (for example &quot;cement&quot; or &quot;TMT&quot;) to see products, categories, and brands.</p>
        </div>
      ) : q.length < 2 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/35" strokeWidth={1.25} aria-hidden />
          <h2 className="text-foreground mb-2 text-xl font-semibold">Keep typing</h2>
          <p className="text-muted-foreground text-sm">Search needs at least two characters. You entered one character for &quot;{query}&quot;.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-foreground">
              {loading ? "Searching…" : `${filteredResults.length} result${filteredResults.length !== 1 ? "s" : ""} for "${q}"`}
            </h1>
            {city && <p className="text-sm text-muted-foreground mt-1">Prices for {city}</p>}
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick badges</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={showAssured} onChange={(e) => setShowAssured(e.target.checked)} className="w-4 h-4 rounded border-border accent-amber-600" />
                <span className="text-sm text-foreground/80">Assured only</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={showExpress} onChange={(e) => setShowExpress(e.target.checked)} className="w-4 h-4 rounded border-border accent-orange-500" />
                <span className="text-sm text-foreground/80">Express delivery</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="w-4 h-4 rounded border-border accent-emerald-600" />
                <span className="text-sm text-foreground/80">In stock only</span>
              </label>
            </div>
          </div>

          {filteredResults.length === 0 && !loading ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/35" strokeWidth={1.25} aria-hidden />
              <h2 className="text-foreground mb-2">No results found</h2>
              <p className="text-muted-foreground mb-6">Try different keywords or browse our categories</p>
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Suggested Searches</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="px-4 py-2 bg-white border border-border rounded-full text-sm hover:border-primary transition-colors">
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="sf-listing-grid">
              {filteredResults.map((product: any) => {
                const variations = product.variations || [];
                const slug = product.slug || product._id || product.id;
                const selVid = varChoice[slug] || (variations[0]?._id ? String(variations[0]._id) : "");
                const vidForCart = selVid || undefined;
                const cartId = `${slug}::${vidForCart || "base"}`;
                const cartLine = cart.find((i) => i.id === cartId);
                const brandName = product.brand?.name || product.brand || "";

                return (
                  <ListingProductCard
                    key={slug}
                    product={product}
                    categoryFilters={[]}
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
        </>
      )}
    </div>
  );
}
