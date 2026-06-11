import { Link, useSearchParams } from "react-router";
import { Search, Star, Shield, Zap, ShoppingCart, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

const SUGGESTIONS = ["Cement bags", "TMT steel bars", "Exterior paint", "CPVC pipes", "Hand tools"];

export function SearchResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { addToCart } = useApp();

  

  
  useEffect(() => {
    if (query) {
      setLoading(true);
      api.globalSearch(query).then(res => {
        setResults(res.data?.products || []);
      }).finally(() => setLoading(false));
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Search: "{query}"</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-foreground">
          {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
        </h1>
      </div>

      {results.length === 0 ? (
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
          {results.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group">
              <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-muted">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-2 left-2 flex gap-1 flex-col">
                  {product.assured && (
                    <span style={{ backgroundColor: "var(--sb-blue)" }} className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Assured
                    </span>
                  )}
                  {product.express && (
                    <span style={{ backgroundColor: "var(--sb-orange)" }} className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Express
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">{product.brand}</p>
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 mt-0.5 hover:text-primary">{product.name}</h3>
                </Link>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{product.rating}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-bold" style={{ color: "var(--sb-blue)" }}>₹{product.price.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground line-through">₹{product.mrp.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">per {product.unit}</p>
                {product.inStock && (
                  <button
                    onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty: 1, unit: product.unit, image: product.image })}
                    style={{ backgroundColor: "var(--sb-blue)" }}
                    className="w-full mt-3 py-2 rounded-xl text-white text-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
