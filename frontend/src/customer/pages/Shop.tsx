import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronRight, ArrowRight } from "lucide-react";

export function Shop() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/categories?status=ACTIVE&limit=50")
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#0D0D0D] min-h-screen">
      <div className="bg-[#171717] border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <nav className="flex items-center gap-1.5 text-xs text-[#D4C4A8]/50 mb-3">
            <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#F4E9D8] font-medium">Shop</span>
          </nav>
          <h1 className="text-3xl font-black text-[#F4E9D8] mb-2">All Categories</h1>
          <p className="text-[#D4C4A8]/60 text-sm">
            Browse construction materials across {categories.length} categories
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#171717] border border-white/8 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map(cat => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group bg-[#171717] border border-white/8 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all duration-300"
              >
                <div className="relative h-32 overflow-hidden bg-[#222222]">
                  {cat.image?.url
                    ? <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">{cat.icon || "🏗️"}</div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-[#171717]/40 to-transparent" />
                  {cat.icon && !cat.image?.url && (
                    <span className="absolute bottom-3 left-4 text-3xl">{cat.icon}</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-[#F4E9D8] text-lg group-hover:text-[#FE5E00] transition-colors">{cat.name}</h2>
                      {cat.description && (
                        <p className="text-[#D4C4A8]/60 text-sm mt-1 leading-relaxed line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/10 border border-[#FE5E00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#FE5E00] group-hover:border-[#FE5E00] transition-all">
                      <ArrowRight className="w-4 h-4 text-[#FE5E00] group-hover:text-[#0D0D0D] transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
                    <span className="text-xs font-semibold text-[#FE5E00]">Browse →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
