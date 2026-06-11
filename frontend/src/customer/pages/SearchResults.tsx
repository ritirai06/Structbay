import { Link, useSearchParams } from "react-router";
import { Star, Shield, Zap, ShoppingCart, ChevronRight, ChevronDown, Package } from "lucide-react";
import { api } from "../lib/api";
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";

const SUGGESTIONS = ["Cement bags", "TMT steel bars", "Exterior paint", "CPVC pipes", "Hand tools"];

function formatVariationLabel(v: { attributes?: Record<string, string> }) {
  return Object.values(v.attributes || {}).filter(Boolean).join(" · ") || "Option";
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

function listingImage(p: any) {
  if (Array.isArray(p.images) && p.images[0]) {
    const first = p.images[0];
    return typeof first === "string" ? first : first?.url;
  }
  return p.image || p.imageUrl;
}

export function SearchResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [varChoice, setVarChoice] = useState<Record<string, string>>({});
  const [showAssured, setShowAssured] = useState(false);
  const [showExpress, setShowExpress] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { addToCart, city, cityId } = useApp();

  useEffect(() => {
    setVarChoice({});
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
  }, [query]);

  useEffect(() => {
    if (query) {
      setLoading(true);
      const qp: Record<string, string> = {};
      if (cityId) qp.cityId = cityId;
      if (showAssured) qp.assured = "true";
      if (showExpress) qp.express = "true";
      api.globalSearch(query, Object.keys(qp).length ? qp : undefined)
        .then(res => {
          setResults(res.data?.products || []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query, cityId, showAssured, showExpress]);

  const filteredResults = useMemo(() => {
    if (!inStockOnly) return results;
    return results.filter((p: any) => p.inStock !== false);
  }, [results, inStockOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Search: "{query}"</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-foreground">
          {loading ? "Searching…" : `${filteredResults.length} result${filteredResults.length !== 1 ? "s" : ""} for "${query}"`}
        </h1>
        {city && <p className="text-sm text-muted-foreground mt-1">Prices for {city}</p>}
      </div>

      {query.length >= 2 && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick badges</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={showAssured} onChange={e => setShowAssured(e.target.checked)} className="w-4 h-4 rounded border-border accent-amber-600" />
              <Shield className="w-3.5 h-3.5 text-amber-600" aria-hidden />
              <span className="text-sm text-foreground/80">Assured only</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={showExpress} onChange={e => setShowExpress(e.target.checked)} className="w-4 h-4 rounded border-border accent-orange-500" />
              <Zap className="w-3.5 h-3.5 text-orange-500" aria-hidden />
              <span className="text-sm text-foreground/80">Express delivery</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="w-4 h-4 rounded border-border accent-emerald-600" />
              <Package className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
              <span className="text-sm text-foreground/80">In stock only</span>
            </label>
          </div>
        </div>
      )}

      {filteredResults.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-foreground mb-2">No results found</h2>
          <p className="text-muted-foreground mb-6">Try different keywords or browse our categories</p>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Suggested Searches</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="px-4 py-2 bg-white border border-border rounded-full text-sm hover:border-primary transition-colors">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredResults.map(product => {
            const slug = product.slug || product._id || product.id;
            const variations = product.variations || [];
            const selVid = varChoice[slug] || (variations[0]?._id ? String(variations[0]._id) : "");
            const unitP = unitPriceForListingProduct(product, selVid || null);
            const regP = Number(product.pricing?.regularPrice ?? product.price ?? unitP);
            const discount = regP && unitP < regP ? Math.round((1 - unitP / regP) * 100) : 0;
            const image = listingImage(product);
            const brandName = product.brand?.name || product.brand || "";
            const selectedVar = variations.find((v: any) => String(v._id) === selVid);
            const inStock = product.inStock !== false;

            return (
              <div key={slug} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                <Link to={`/products/${slug}`} className="block relative aspect-square overflow-hidden bg-muted">
                  {image && <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                  <div className="absolute top-2 left-2 flex gap-1 flex-col">
                    {product.isAssured && (
                      <span style={{ backgroundColor: "var(--sb-blue)" }} className="text-sb-cream text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Assured
                      </span>
                    )}
                    {product.isExpress && (
                      <span style={{ backgroundColor: "var(--sb-orange)" }} className="text-sb-cream text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Express
                      </span>
                    )}
                  </div>
                </Link>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-xs text-muted-foreground">{brandName}</p>
                  <Link to={`/products/${slug}`}>
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mt-0.5 hover:text-primary">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{product.rating ?? "—"}</span>
                  </div>

                  {variations.length > 0 && (
                    <label className="block mt-2">
                      <span className="sr-only">Variant</span>
                      <div className="relative">
                        <select
                          value={selVid}
                          onChange={e => setVarChoice(v => ({ ...v, [slug]: e.target.value }))}
                          className="w-full appearance-none border border-border rounded-xl px-2 py-2 pr-7 text-xs bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {variations.map((v: any) => (
                            <option key={v._id} value={String(v._id)}>{formatVariationLabel(v)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                      </div>
                    </label>
                  )}

                  <div className="flex items-baseline gap-2 mt-1.5">
                    {discount > 0 ? (
                      <>
                        <span className="font-bold" style={{ color: "var(--sb-blue)" }}>₹{Number(unitP).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground line-through">₹{Number(regP).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="font-bold" style={{ color: "var(--sb-blue)" }}>₹{Number(unitP).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">per {product.unit || "unit"} · excl. GST</p>

                  {inStock && (
                    <button
                      onClick={() => {
                        const vid = selVid || undefined;
                        const cartId = `${slug}::${vid || "base"}`;
                        addToCart({
                          id: cartId,
                          productSlug: slug,
                          variationId: vid,
                          variationLabel: selectedVar ? formatVariationLabel(selectedVar) : undefined,
                          name: product.name,
                          brand: brandName,
                          price: unitP,
                          qty: 1,
                          unit: product.unit || "unit",
                          image,
                        });
                      }}
                      style={{ backgroundColor: "var(--sb-blue)" }}
                      className="w-full mt-3 py-2 rounded-xl text-sb-cream text-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
