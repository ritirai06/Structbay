import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronRight, ArrowRight, LayoutGrid } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

export function Shop() {
  const { cityId, city } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { status: "ACTIVE", limit: "50" };
    if (cityId) params.cityId = cityId;
    api
      .getCategories(params)
      .then((d: any) => setCategories(d.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  return (
    <div className="bg-sb-page min-h-screen">
      <div className="bg-sb-surface border-b border-sb-ink/10">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <nav className="flex items-center gap-1.5 text-xs text-sb-ink-muted/50 mb-3">
            <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-sb-ink font-medium">Shop</span>
          </nav>
          <h1 className="text-3xl font-black text-sb-ink mb-2">All Categories</h1>
          <p className="text-sb-ink-muted/60 text-sm">
            {city
              ? `Categories with available products in ${city} (${categories.length})`
              : `Browse construction materials across ${categories.length} categories`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-sb-ink-muted bg-sb-page border border-sb-ink/12 rounded-xl px-4 py-3 max-w-3xl">
            <span className="font-semibold text-sb-ink shrink-0">Product badges:</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A227]/35 bg-[#C9A227]/10 text-[#C9A227] px-2 py-0.5 font-bold">
              StructBay Assured
            </span>
            <span className="text-sb-ink-muted/80">Shown on shop tiles, categories, search & product pages.</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FE5E00] text-sb-on-orange px-2 py-0.5 font-bold">
              StructBay Express
            </span>
            <span className="text-sb-ink-muted/80">Same-day / priority where enabled.</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-sb-surface border border-sb-ink/10 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map(cat => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all duration-300"
              >
                <div className="relative h-32 overflow-hidden bg-sb-surface-2">
                  {cat.image?.url
                    ? <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : (
                      <div className="w-full h-full flex items-center justify-center bg-sb-surface-2">
                        <LayoutGrid className="w-12 h-12 text-sb-ink-muted/35" aria-hidden />
                      </div>
                    )
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-[#171717]/40 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-sb-ink text-lg group-hover:text-[#FE5E00] transition-colors">{cat.name}</h2>
                      {cat.description && (
                        <p className="text-sb-ink-muted/60 text-sm mt-1 leading-relaxed line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/10 border border-[#FE5E00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#FE5E00] group-hover:border-[#FE5E00] transition-all">
                      <ArrowRight className="w-4 h-4 text-[#FE5E00] group-hover:text-sb-on-orange transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-sb-ink/10">
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
