import { Link } from "react-router";
import { ChevronRight, ArrowRight } from "lucide-react";
import { CATEGORIES } from "../data/categories";

export function Shop() {
  return (
    <div className="bg-[#0D0D0D] min-h-screen">
      {/* Header banner */}
      <div className="bg-[#171717] border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <nav className="flex items-center gap-1.5 text-xs text-[#D4C4A8]/50 mb-3">
            <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#F4E9D8] font-medium">Shop</span>
          </nav>
          <h1 className="text-3xl font-black text-[#F4E9D8] mb-2">All Categories</h1>
          <p className="text-[#D4C4A8]/60 text-sm">Browse 1,200+ construction materials across {CATEGORIES.length} categories</p>
        </div>
      </div>

      {/* Category grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="group bg-[#171717] border border-white/8 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all duration-300"
            >
              {/* Banner thumbnail */}
              <div className="relative h-32 overflow-hidden">
                <img src={cat.bannerImage} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-[#171717]/40 to-transparent" />
                <span className="absolute bottom-3 left-4 text-3xl">{cat.icon}</span>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#F4E9D8] text-lg group-hover:text-[#FE5E00] transition-colors">{cat.name}</h2>
                    <p className="text-[#D4C4A8]/60 text-sm mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/10 border border-[#FE5E00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#FE5E00] group-hover:border-[#FE5E00] transition-all">
                    <ArrowRight className="w-4 h-4 text-[#FE5E00] group-hover:text-[#0D0D0D] transition-colors" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
                  <span className="text-xs text-[#D4C4A8]/40">{cat.productCount}+ products</span>
                  <span className="text-xs font-semibold text-[#FE5E00]">Browse →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
