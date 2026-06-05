import { Link } from "react-router";
import { Search, History, TrendingUp, X } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import { PRODUCTS } from "../data/products";
import { useApp } from "../context/AppContext";

interface SearchDropdownProps {
  query: string;
  onSelect: () => void;
  onClose: () => void;
}

export function SearchDropdown({ query, onSelect, onClose }: SearchDropdownProps) {
  const { recentSearches, clearRecentSearches } = useApp();

  const popularCategories = CATEGORIES.slice(0, 4);
  const popularProducts = PRODUCTS.slice(0, 4);

  const hasRecent = recentSearches.length > 0;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-[#171717] border border-white/10 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
      <div className="p-4 grid gap-6 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
        
        {/* Left Column: Recent & Categories */}
        <div className="space-y-6">
          {/* Recent Searches */}
          {hasRecent && !query && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/40 flex items-center gap-1.5">
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
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#F4E9D8] hover:bg-[#222222] rounded-lg transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-[#D4C4A8]/30 group-hover:text-[#FE5E00]" />
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Popular Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/40 flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5" /> Popular Categories
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {popularCategories.map((cat) => {
                const Icon = cat.lucideIcon;
                return (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    onClick={onSelect}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-white/5 bg-[#222222] hover:border-[#FE5E00]/40 hover:bg-[#2A2A2A] transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.accentBg} ${cat.accentColor}`}>
                      {Icon && <Icon className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium text-[#F4E9D8] group-hover:text-[#FE5E00] transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Popular Products */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/40 mb-3">
            Popular Products
          </h4>
          <div className="space-y-2">
            {popularProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                onClick={onSelect}
                className="flex gap-3 p-2 rounded-xl hover:bg-[#222222] transition-colors group border border-transparent hover:border-white/5"
              >
                <div className="w-12 h-12 rounded-lg bg-[#222222] overflow-hidden shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div>
                  <p className="text-[10px] text-[#D4C4A8]/50 uppercase tracking-wide">{product.brand}</p>
                  <p className="text-sm font-medium text-[#F4E9D8] line-clamp-1 group-hover:text-[#FE5E00] transition-colors">
                    {product.name}
                  </p>
                  <p className="text-xs font-bold text-[#FE5E00] mt-0.5">₹{product.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="bg-[#222222] px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
        <p className="text-xs text-[#D4C4A8]/50">Press Enter to search all products</p>
        <button onClick={onClose} className="text-xs text-[#D4C4A8]/50 hover:text-[#F4E9D8] flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Close
        </button>
      </div>
    </div>
  );
}
