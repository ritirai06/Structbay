import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  SlidersHorizontal, Star, Shield, Zap, ShoppingCart,
  ChevronRight, FileText, ChevronLeft, ChevronDown, X,
  ShieldCheck, Truck, BadgeCheck, Building2, Package,
  ArrowRight, BarChart3, Heart, GitCompare, MapPin,
} from "lucide-react";
import { PRODUCTS } from "../data/products";
import { CATEGORIES, getCategoryBySlug } from "../data/categories";
import { useApp } from "../context/AppContext";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "popularity",  label: "Most Popular" },
  { value: "bestSeller",  label: "Best Seller" },
  { value: "priceLow",    label: "Price: Low to High" },
  { value: "priceHigh",   label: "Price: High to Low" },
  { value: "rating",      label: "Top Rated" },
  { value: "newest",      label: "Newest" },
  { value: "express",     label: "Express Delivery" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "StructBay Assured",  desc: "Quality verified",      color: "text-[#C9A227]",   bg: "bg-[#C9A227]/10 border-[#C9A227]/20" },
  { icon: Zap,         label: "Express Delivery",   desc: "In 24-48 hours",        color: "text-[#FE5E00]",   bg: "bg-[#FE5E00]/10 border-[#FE5E00]/20" },
  { icon: BadgeCheck,  label: "GST Billing",        desc: "On every order",        color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  { icon: Building2,   label: "Verified Vendors",   desc: "Background checked",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Package,     label: "Bulk Available",     desc: "No minimum order",      color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
];

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ title, children, defaultOpen = true }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/60">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#D4C4A8]/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function CategoryListing() {
  const { category } = useParams<{ category?: string }>();
  const { addToCart, city, wishlist, addToWishlist, removeFromWishlist, isWishlisted, addToCompare } = useApp();
  const navigate = useNavigate();

  const isShopAll = !category || category === "all";
  const catData = isShopAll 
    ? { name: "Shop All", slug: "all", bannerImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=300&fit=crop", longDescription: "Browse all premium construction materials from verified vendors.", productCount: PRODUCTS.length, seoTitle: "Shop All | StructBay", seoDescription: "Shop all B2B materials." }
    : getCategoryBySlug(category);

  useEffect(() => {
    if (!catData && !isShopAll) navigate("/shop", { replace: true });
  }, [catData, isShopAll, navigate]);

  useEffect(() => {
    if (catData) {
      document.title = catData.seoTitle;
      const desc = document.querySelector("meta[name='description']");
      if (desc) desc.setAttribute("content", catData.seoDescription);
    }
  }, [catData]);

  const [sortBy, setSortBy] = useState("popularity");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showAssured, setShowAssured] = useState(false);
  const [showExpress, setShowExpress] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setSelectedBrands([]);
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
  }, [category]);

  // Dynamic brand list for this category
  const allBrands = [...new Set(PRODUCTS.filter(p => isShopAll || p.category === category?.toLowerCase()).map(p => p.brand))];

  let products = PRODUCTS.filter(p => 
    (isShopAll || p.category === category?.toLowerCase()) && 
    (!p.availableCities || p.availableCities.includes(city || "Bengaluru"))
  );
  if (showAssured) products = products.filter(p => p.assured);
  if (showExpress) products = products.filter(p => p.express);
  if (inStockOnly)  products = products.filter(p => p.inStock);
  if (selectedBrands.length > 0) products = products.filter(p => selectedBrands.includes(p.brand));
  if (priceMin) products = products.filter(p => p.price >= Number(priceMin));
  if (priceMax) products = products.filter(p => p.price <= Number(priceMax));
  if (minRating > 0) products = products.filter(p => p.rating >= minRating);
  if (sortBy === "priceLow")  products = [...products].sort((a, b) => a.price - b.price);
  if (sortBy === "priceHigh") products = [...products].sort((a, b) => b.price - a.price);
  if (sortBy === "rating")    products = [...products].sort((a, b) => b.rating - a.rating);
  if (sortBy === "express")   products = [...products].sort((a, b) => (b.express ? 1 : 0) - (a.express ? 1 : 0));

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const paginated  = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleBrand = (b: string) =>
    setSelectedBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const clearFilters = () => {
    setSelectedBrands([]); setPriceMin(""); setPriceMax("");
    setShowAssured(false); setShowExpress(false); setInStockOnly(false);
    setMinRating(0); setPage(1);
  };

  const activeFilters =
    selectedBrands.length +
    (showAssured ? 1 : 0) +
    (showExpress ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0);

  if (!catData) return null;

  const FilterPanel = () => (
    <div>
      {activeFilters > 0 && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors mb-4">
          <X className="w-3 h-3" /> Clear all ({activeFilters})
        </button>
      )}

      <AccordionSection title="Quick Badges">
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showAssured} onChange={e => { setShowAssured(e.target.checked); setPage(1); }} className="w-4 h-4 rounded accent-[#C9A227]" />
            <Shield className="w-3.5 h-3.5 text-[#C9A227]" />
            <span className="text-sm text-[#D4C4A8]/80 group-hover:text-[#F4E9D8]">Assured Only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={showExpress} onChange={e => { setShowExpress(e.target.checked); setPage(1); }} className="w-4 h-4 rounded accent-[#FE5E00]" />
            <Zap className="w-3.5 h-3.5 text-[#FE5E00]" />
            <span className="text-sm text-[#D4C4A8]/80 group-hover:text-[#F4E9D8]">Express Delivery</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={inStockOnly} onChange={e => { setInStockOnly(e.target.checked); setPage(1); }} className="w-4 h-4 rounded accent-[#FE5E00]" />
            <Package className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm text-[#D4C4A8]/80 group-hover:text-[#F4E9D8]">In Stock Only</span>
          </label>
        </div>
      </AccordionSection>

      <AccordionSection title="Brand">
        <div className="space-y-2">
          {allBrands.map(brand => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => { toggleBrand(brand); setPage(1); }} className="w-4 h-4 rounded accent-[#FE5E00]" />
              <span className="text-sm text-[#D4C4A8]/80 group-hover:text-[#F4E9D8]">{brand}</span>
            </label>
          ))}
          {allBrands.length === 0 && (
            <p className="text-xs text-[#D4C4A8]/40">No brands for this category</p>
          )}
        </div>
      </AccordionSection>

      <AccordionSection title="Price Range (₹)">
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={priceMin}
            onChange={e => { setPriceMin(e.target.value); setPage(1); }}
            className="w-full bg-[#171717] border border-white/12 rounded-lg px-2.5 py-1.5 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
          <input type="number" placeholder="Max" value={priceMax}
            onChange={e => { setPriceMax(e.target.value); setPage(1); }}
            className="w-full bg-[#171717] border border-white/12 rounded-lg px-2.5 py-1.5 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
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
                  ? "bg-[#C9A227] text-[#0D0D0D] border-[#C9A227]"
                  : "border-white/15 text-[#D4C4A8]/70 hover:border-[#C9A227]/50"
              }`}
            >
              <Star className="w-3 h-3 fill-current" /> {r}+
            </button>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Availability" defaultOpen={false}>
        <div className="flex gap-2">
          <button
            onClick={() => { setInStockOnly(true); setPage(1); }}
            className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-all ${
              inStockOnly ? "bg-green-500/15 border-green-500/40 text-green-400" : "border-white/12 text-[#D4C4A8]/60 hover:border-white/25"
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => { setInStockOnly(false); setPage(1); }}
            className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-all ${
              !inStockOnly ? "bg-[#FE5E00]/15 border-[#FE5E00]/40 text-[#FE5E00]" : "border-white/12 text-[#D4C4A8]/60 hover:border-white/25"
            }`}
          >
            All
          </button>
        </div>
      </AccordionSection>
    </div>
  );

  return (
    <div className="bg-[#0D0D0D] min-h-screen">

      {/* ── Category Hero Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
        <div className="absolute inset-0">
          <img src={catData.bannerImage} alt={catData.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/88 to-[#0D0D0D]/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <nav className="flex items-center gap-1.5 text-xs text-[#D4C4A8]/50 mb-4">
            <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/shop" className="hover:text-[#FE5E00] transition-colors">Shop</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#F4E9D8] font-medium">{catData.name}</span>
          </nav>

          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#F4E9D8] mb-2">{catData.name}</h1>
              <p className="text-[#D4C4A8]/70 max-w-xl text-sm leading-relaxed">{catData.longDescription}</p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-xs text-[#D4C4A8]/50 bg-white/8 border border-white/10 px-3 py-1 rounded-full">
                  {catData.productCount}+ Products
                </span>
                {city && (
                  <span className="text-xs text-[#FE5E00] bg-[#FE5E00]/10 border border-[#FE5E00]/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPinIcon /> Delivering in {city}
                  </span>
                )}
              </div>
            </div>
            <Link
              to="/rfq"
              className="hidden md:flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-5 py-3 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_16px_rgba(254,94,0,0.3)] shrink-0"
            >
              <FileText className="w-4 h-4" /> Get Bulk Quote
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust badges bar — dark section ─────────────────────────────── */}
      <div className="bg-[#171717] border-y border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TRUST_BADGES.map(({ icon: Icon, label, desc, color, bg }) => (
              <div key={label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${bg}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${color}`}>{label}</p>
                  <p className="text-xs text-[#D4C4A8]/60">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category quick-nav ────────────────────────────────────────────── */}
      <div className="bg-[#171717] border-b border-white/8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2.5">
          <Link
            to={`/shop`}
            className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
              isShopAll
                ? "bg-[#FE5E00] text-[#0D0D0D]"
                : "text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:bg-[#222222] border border-white/8"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                cat.slug === category
                  ? "bg-[#FE5E00] text-[#0D0D0D]"
                  : "text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:bg-[#222222] border border-white/8"
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
            <div className="bg-[#171717] border border-white/8 rounded-2xl p-4 sticky top-28">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-[#F4E9D8] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#FE5E00]" /> Filters
                </h3>
                {activeFilters > 0 && (
                  <span className="bg-[#FE5E00] text-[#0D0D0D] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Sort + count bar */}
            <div className="flex items-center justify-between mb-4 bg-[#171717] border border-white/8 rounded-xl px-4 py-2.5">
              <span className="text-sm text-[#D4C4A8]/60">
                <span className="font-semibold text-[#F4E9D8]">{products.length}</span> products
                {activeFilters > 0 && <span className="ml-1.5 text-[#FE5E00] text-xs">· {activeFilters} filter{activeFilters > 1 ? "s" : ""} applied</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="lg:hidden flex items-center gap-1.5 text-xs border border-white/15 rounded-lg px-3 py-1.5 text-[#D4C4A8] hover:border-[#FE5E00] transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters {activeFilters > 0 && `(${activeFilters})`}
                </button>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(1); }}
                    className="bg-[#222222] border border-white/12 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-[#F4E9D8] focus:outline-none focus:border-[#FE5E00] appearance-none cursor-pointer transition-colors"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#D4C4A8]/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Mobile filter */}
            {filterOpen && (
              <div className="lg:hidden bg-[#171717] border border-white/8 rounded-2xl p-4 mb-4">
                <FilterPanel />
              </div>
            )}

            {/* Empty state */}
            {paginated.length === 0 ? (
              <div className="text-center py-20 bg-[#171717] border border-white/8 rounded-2xl">
                <BarChart3 className="w-12 h-12 text-[#D4C4A8]/20 mx-auto mb-4" />
                <p className="font-semibold text-[#F4E9D8] mb-1">No products found</p>
                <p className="text-sm text-[#D4C4A8]/50 mb-4">Try adjusting your filters</p>
                <button onClick={clearFilters} className="text-sm text-[#FE5E00] hover:text-[#E05200] font-semibold underline transition-colors">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map(product => {
                  const discount = Math.round((1 - product.price / product.mrp) * 100);
                  return (
                    <div key={product.id} className="bg-[#171717] border border-white/8 rounded-2xl overflow-hidden hover:border-[#FE5E00]/40 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all duration-300 group flex flex-col">
                      {/* Image */}
                      <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-[#222222] shrink-0 block">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1 flex-col">
                          {product.assured && (
                            <span className="bg-[#0D0D0D]/90 text-[#C9A227] border border-[#C9A227]/40 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              <Shield className="w-2.5 h-2.5" /> Assured
                            </span>
                          )}
                          {product.express && (
                            <span className="bg-[#FE5E00] text-[#0D0D0D] text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              <Zap className="w-2.5 h-2.5" /> Express
                            </span>
                          )}
                        </div>

                        {/* Discount */}
                        {discount > 0 && (
                          <div className="absolute top-2 right-2 bg-[#C9A227] text-[#0D0D0D] text-[10px] font-black px-2 py-0.5 rounded-full">
                            -{discount}%
                          </div>
                        )}

                        {/* Out of stock overlay */}
                        {!product.inStock && (
                          <div className="absolute inset-0 bg-[#0D0D0D]/65 flex items-center justify-center">
                            <span className="bg-[#222222] text-[#D4C4A8] text-xs font-semibold px-3 py-1 rounded-full border border-white/15">Out of Stock</span>
                          </div>
                        )}

                        {/* Wishlist & compare — hover */}
                        <div className="absolute top-2 right-2 mt-8 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.preventDefault(); isWishlisted(product.id) ? removeFromWishlist(product.id) : addToWishlist(product.id); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${isWishlisted(product.id) ? "bg-red-500/15 border-red-500/40 text-red-400" : "bg-[#0D0D0D]/70 border-white/20 text-[#D4C4A8] hover:text-red-400"}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isWishlisted(product.id) ? "fill-current" : ""}`} />
                          </button>
                          <button 
                            onClick={e => { e.preventDefault(); addToCompare(product.id); }}
                            className="w-7 h-7 rounded-full bg-[#0D0D0D]/70 border border-white/20 flex items-center justify-center text-[#D4C4A8] hover:text-[#FE5E00] transition-colors"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-[#D4C4A8]/50 font-medium uppercase tracking-wide">{product.brand}</p>
                          {product.vendorCount > 0 && (
                            <span className="text-[10px] text-[#D4C4A8]/60 bg-[#222222] border border-white/5 px-1.5 py-0.5 rounded-md">
                              {product.vendorCount} Vendors
                            </span>
                          )}
                        </div>
                        <Link to={`/product/${product.id}`}>
                          <h3 className="text-sm font-medium text-[#F4E9D8] line-clamp-2 mt-0.5 leading-snug hover:text-[#FE5E00] transition-colors">{product.name}</h3>
                        </Link>

                        {/* Rating */}
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-2.5 h-2.5 ${n <= Math.round(product.rating) ? "fill-[#C9A227] text-[#C9A227]" : "text-white/20"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-[#F4E9D8]">{product.rating}</span>
                          <span className="text-[10px] text-[#D4C4A8]/40">({product.reviews})</span>
                        </div>

                        {/* City + stock */}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            {city && <span className="text-[10px] text-[#D4C4A8]/50 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {city} price</span>}
                          </div>
                          <span className={`text-[10px] font-semibold ${product.inStock ? "text-green-400" : "text-red-400"}`}>
                            {product.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="font-black text-[#FE5E00]">₹{product.price.toLocaleString()}</span>
                          <span className="text-xs text-[#D4C4A8]/40 line-through">₹{product.mrp.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-[#D4C4A8]/40">per {product.unit}</p>

                        {/* Express ETA */}
                        {product.express && (
                          <p className="text-[10px] text-[#FE5E00] mt-1 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Delivery in 24-48 hrs
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-auto pt-3 flex gap-1.5">
                          {product.inStock ? (
                            <>
                              <button
                                onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty: 1, unit: product.unit, image: product.image })}
                                className="flex-1 py-2 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-xs font-bold transition-colors flex items-center justify-center gap-1"
                              >
                                <ShoppingCart className="w-3 h-3" /> Add
                              </button>
                              <Link
                                to="/rfq"
                                className="py-2 px-2.5 rounded-xl border border-white/15 hover:border-[#FE5E00]/50 text-[#D4C4A8] hover:text-[#FE5E00] transition-colors"
                                title="Get RFQ"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Link>
                            </>
                          ) : (
                            <button disabled className="flex-1 py-2 rounded-xl bg-[#222222] text-[#D4C4A8]/30 text-xs cursor-not-allowed border border-white/8">
                              Out of Stock
                            </button>
                          )}
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
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-[#D4C4A8] hover:border-[#FE5E00] hover:text-[#FE5E00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p === page
                        ? "bg-[#FE5E00] text-[#0D0D0D]"
                        : "border border-white/12 text-[#D4C4A8] hover:border-[#FE5E00] hover:text-[#FE5E00]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-white/12 text-[#D4C4A8] hover:border-[#FE5E00] hover:text-[#FE5E00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Dark RFQ CTA ─────────────────────────────────────────── */}
            <div className="mt-8 bg-[#1A1A1A] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
              <div>
                <p className="font-black text-[#F4E9D8] text-lg mb-1">Need {catData.name} in bulk?</p>
                <p className="text-sm text-[#D4C4A8]/60">Get competitive quotes from multiple vendors. No minimum order limit.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  to="/rfq"
                  className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_12px_rgba(254,94,0,0.25)]"
                >
                  <FileText className="w-4 h-4" /> Get RFQ
                </Link>
                <Link
                  to="/bulk"
                  className="flex items-center gap-2 border border-white/15 hover:border-[#FE5E00] text-[#F4E9D8] hover:text-[#FE5E00] px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
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

function MapPinIcon() {
  return <MapPin className="w-3 h-3 inline -mt-0.5" />;
}
