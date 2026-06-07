import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Shield, Zap, ChevronRight, Star, ArrowRight,
  Truck, HeadphonesIcon, Building2, ShoppingCart,
  TrendingUp, CheckCircle, PhoneCall, FileText,
  ChevronLeft, MapPin,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { CATEGORY_ICONS } from "../data/categories";

const HERO_BANNERS = [
  {
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&h=600&fit=crop",
    heading: "B2B Construction Materials, Simplified",
    subheading: "Order cement, steel, paints & 1000+ products with assured quality and express delivery.",
    ctaLabel: "Shop Now",
    ctaLink: "/shop",
  },
  {
    image: "https://images.unsplash.com/photo-1587163750009-30c06ff8d8ef?w=1400&h=600&fit=crop",
    heading: "Assured Quality Cement",
    subheading: "OPC 53, PPC & specialty cements from Ultratech, ACC, Ambuja — BIS certified, bulk discounts.",
    ctaLabel: "Buy Cement",
    ctaLink: "/category/cement",
  },
  {
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1400&h=600&fit=crop",
    heading: "Premium TMT Steel Bars",
    subheading: "Fe 500D TMT bars from TATA, SAIL, JSW with full MTC certificates and bulk pricing.",
    ctaLabel: "Buy Steel",
    ctaLink: "/category/steel",
  },
  {
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1400&h=600&fit=crop",
    heading: "Paints for Every Surface",
    subheading: "Interior, exterior & waterproofing solutions from Asian Paints, Berger, Dulux — best rates.",
    ctaLabel: "Buy Paints",
    ctaLink: "/category/paints",
  },
];

function HeroCarousel({ city }: { city: string | null }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const next = useCallback(() => goTo((current + 1) % HERO_BANNERS.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + HERO_BANNERS.length) % HERO_BANNERS.length), [current, goTo]);

  useEffect(() => {
    timerRef.current = setInterval(next, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next]);

  const banner = HERO_BANNERS[current];

  return (
    <section className="relative overflow-hidden bg-[#0D0D0D]" style={{ minHeight: 480 }}>
      {/* Background image with fade */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        <img
          src={banner.image}
          alt={banner.heading}
          className="w-full h-full object-cover"
          style={{ position: "absolute", inset: 0 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/85 to-[#0D0D0D]/40" />
      </div>

      {/* Content */}
      <div
        className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 transition-opacity duration-500"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        <div className="max-w-2xl">
          {city && (
            <div className="inline-flex items-center gap-2 bg-[#FE5E00]/15 border border-[#FE5E00]/30 text-[#FE5E00] text-xs px-3 py-1.5 rounded-full mb-5 font-semibold">
              <Zap className="w-3 h-3" /> Now delivering in {city}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-black mb-5 leading-[1.1] tracking-tight text-[#F4E9D8]">
            {banner.heading.split(",").map((part, i, arr) => (
              <span key={i}>
                {i === arr.length - 1 ? <span className="text-[#FE5E00]">{part}</span> : part + ","}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-[#D4C4A8]/80 text-lg mb-8 leading-relaxed">{banner.subheading}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={banner.ctaLink}
              className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-7 py-3.5 rounded-2xl font-bold transition-colors shadow-[0_4px_20px_rgba(254,94,0,0.35)]"
            >
              {banner.ctaLabel} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/rfq"
              className="flex items-center gap-2 bg-transparent text-[#F4E9D8] border border-white/20 hover:border-[#FE5E00] hover:text-[#FE5E00] px-7 py-3.5 rounded-2xl font-semibold transition-all"
            >
              Get Bulk Quote
            </Link>
          </div>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0D0D0D]/60 border border-white/20 flex items-center justify-center text-[#F4E9D8] hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-[#0D0D0D] transition-all z-10"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0D0D0D]/60 border border-white/20 flex items-center justify-center text-[#F4E9D8] hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-[#0D0D0D] transition-all z-10"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2 bg-[#FE5E00]"
                : "w-2 h-2 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

import { CATEGORIES as CAT_DATA } from "../data/categories";
import { PRODUCTS as ALL_PRODUCTS, type Product } from "../data/products";

const BRANDS = ["Ultratech", "ACC", "Ambuja", "JK Cement", "Asian Paints", "TATA Steel", "Pidilite", "Supreme"];

const TESTIMONIALS = [
  { name: "Rajesh Kumar",  role: "Builder, Bengaluru",       text: "StructBay has transformed how we procure materials. The prices are competitive and delivery is always on time.", rating: 5, company: "Kumar Constructions" },
  { name: "Priya Sharma",  role: "Procurement Manager",      text: "The bulk ordering feature and RFQ system has saved us 15% on material costs. Highly recommended for large projects.", rating: 5, company: "Infra Projects Ltd." },
  { name: "Venkat Reddy",  role: "Contractor, Hyderabad",    text: "Excellent platform. The Assured badge gives me confidence about quality. Invoice downloads are a lifesaver for GST.", rating: 4, company: "VR Builders" },
];

const BLOGS = [
  { title: "Top 5 Cement Brands for High-Rise Construction in 2025",    category: "Buying Guide",     date: "Dec 12, 2025", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=250&fit=crop" },
  { title: "How to Calculate Steel Requirements for Your Project",       category: "Industry Insight", date: "Dec 5, 2025",  image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=250&fit=crop" },
  { title: "GST on Construction Materials: A Complete Guide",            category: "Legal & Finance",  date: "Nov 28, 2025", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop" },
];

function ProductCard({ product }: { product: Product }) {
  const { addToCart, city } = useApp();
  const discount = Math.round((1 - product.price / product.mrp) * 100);

  return (
    <div className="bg-[#222222] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_24px_rgba(254,94,0,0.12)] transition-all duration-300 group">
      <div className="relative aspect-square overflow-hidden bg-[#171717]">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-2 left-2 flex gap-1 flex-col">
          {product.assured && (
            <span className="bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227]/40 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Shield className="w-2.5 h-2.5" /> Assured
            </span>
          )}
          {product.express && (
            <span className="bg-[#FE5E00] text-[#0D0D0D] text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Zap className="w-2.5 h-2.5" /> Express
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 bg-[#C9A227] text-[#0D0D0D] text-xs font-bold px-2 py-0.5 rounded-full">
          -{discount}%
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-xs text-[#D4C4A8]/60">{product.brand}</p>
        <h3 className="text-sm font-medium text-[#F4E9D8] line-clamp-2 mt-0.5 leading-snug">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1.5">
          <Star className="w-3 h-3 fill-[#C9A227] text-[#C9A227]" />
          <span className="text-xs font-medium text-[#F4E9D8]">{product.rating}</span>
          <span className="text-xs text-[#D4C4A8]/50">({product.reviews})</span>
        </div>
        {city && (
          <p className="text-xs text-[#D4C4A8]/60 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-[#D4C4A8]/60" /> {city} price</p>
        )}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-bold text-[#FE5E00]">₹{product.price.toLocaleString()}</span>
          <span className="text-xs text-[#D4C4A8]/50 line-through">₹{product.mrp.toLocaleString()}</span>
          <span className="text-xs text-[#D4C4A8]/50">/ {product.unit}</span>
        </div>
        <button
          onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty: 1, unit: product.unit, image: product.image })}
          className="w-full mt-3 py-2 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
        </button>
      </div>
    </div>
  );
}

export function Homepage() {
  const { city } = useApp();
  const navigate = useNavigate();

  if (!city) { navigate("/city-selection"); return null; }

  // Filter products by current city
  const cityProducts = ALL_PRODUCTS.filter(p => !p.availableCities || p.availableCities.includes(city));

  return (
    <div className="bg-[#0D0D0D] min-h-screen">

      {/* ── Hero Carousel ────────────────────────────────────────────── */}
      <HeroCarousel city={city} />

      {/* ── Trust bar ───────────────────────────────────────────────────── */}
      <section className="bg-[#171717] border-y border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield,          label: "StructBay Assured",  desc: "Quality verified products" },
            { icon: Zap,             label: "Express Delivery",   desc: "Delivery in 24-48 hrs" },
            { icon: Truck,           label: "Free Shipping",      desc: "On orders above ₹10,000" },
            { icon: HeadphonesIcon,  label: "24/7 Support",       desc: "Expert assistance" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FE5E00]/15 border border-[#FE5E00]/20">
                <Icon className="w-5 h-5 text-[#FE5E00]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#F4E9D8]">{label}</p>
                <p className="text-xs text-[#D4C4A8]/60">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <section className="bg-[#0D0D0D] max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-[#F4E9D8]">Browse Categories</h2>
            <p className="text-[#D4C4A8]/60 text-sm mt-1">Find exactly what you need</p>
          </div>
          <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CAT_DATA.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug];
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="bg-[#222222] border border-white/10 rounded-2xl p-4 text-center hover:border-[#FE5E00]/60 hover:bg-[#2A2A2A] hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all duration-250 group"
              >
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                  <div className="w-12 h-12 rounded-xl bg-[#171717] border border-white/5 flex items-center justify-center text-[#FE5E00]">
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                </div>
                <p className="font-semibold text-sm text-[#F4E9D8]">{cat.name}</p>
                <p className="text-xs text-[#D4C4A8]/50 mt-0.5">{cat.productCount}+ Products</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Why StructBay? (Dark Section) ──────────────────────────────── */}
      <section className="bg-[#171717] border-y border-white/8 py-14 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-[#F4E9D8] text-3xl font-black mb-3">Why Choose StructBay?</h2>
            <p className="text-[#D4C4A8]/70 text-sm leading-relaxed mb-6">
              We bring transparency, quality, and speed to B2B construction procurement. 
              Our trusted vendor network ensures you get genuine materials, exact weights, 
              and GST-compliant billing for every order.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 border-2 border-white/10 text-[#F4E9D8] px-6 py-2.5 rounded-xl font-bold hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-[#0D0D0D] transition-all"
            >
              Learn More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#222222] rounded-2xl p-5 border border-white/10">
              <h3 className="text-[#F4E9D8] font-black text-2xl mb-1">10,000+</h3>
              <p className="text-[#D4C4A8]/60 text-xs font-semibold uppercase tracking-wider">Products</p>
            </div>
            <div className="bg-[#222222] rounded-2xl p-5 border border-white/10">
              <h3 className="text-[#F4E9D8] font-black text-2xl mb-1">500+</h3>
              <p className="text-[#D4C4A8]/60 text-xs font-semibold uppercase tracking-wider">Verified Vendors</p>
            </div>
            <div className="bg-[#222222] rounded-2xl p-5 border border-white/10">
              <h3 className="text-[#F4E9D8] font-black text-2xl mb-1">24 Hrs</h3>
              <p className="text-[#D4C4A8]/60 text-xs font-semibold uppercase tracking-wider">Express Delivery</p>
            </div>
            <div className="bg-[#FE5E00] rounded-2xl p-5 shadow-[0_8px_24px_rgba(254,94,0,0.2)]">
              <h3 className="text-[#0D0D0D] font-black text-2xl mb-1">100%</h3>
              <p className="text-[#0D0D0D]/80 text-xs font-bold uppercase tracking-wider">Assured Quality</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Selling Products ─────────────────────────────────────────── */}
      <section className="bg-[#171717] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-[#F4E9D8]">Top Selling Products</h2>
              <p className="text-[#D4C4A8]/60 text-sm mt-1">Best deals in {city}</p>
            </div>
            <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cityProducts.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* ── StructBay Assured Banner ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 bg-[#222222] border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#C9A227]" />
          <div className="flex-1 pl-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-[#C9A227]" />
              <span className="font-bold text-lg text-[#C9A227]">StructBay Assured</span>
            </div>
            <h2 className="text-[#F4E9D8] mb-3">Quality You Can Trust</h2>
            <p className="text-[#D4C4A8]/70 mb-6">Every Assured product undergoes rigorous quality checks. Only ISI-certified, BIS-compliant materials with verified brand authorization.</p>
            <div className="flex flex-wrap gap-2.5">
              {["BIS Certified", "ISI Marked", "Brand Verified", "Lab Tested"].map(badge => (
                <span key={badge} className="flex items-center gap-1.5 bg-[#C9A227]/10 border border-[#C9A227]/25 rounded-full px-3 py-1.5 text-sm text-[#C9A227]">
                  <CheckCircle className="w-3.5 h-3.5" /> {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            {cityProducts.filter(p => p.assured).slice(0, 4).map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-[#171717] rounded-xl p-2 border border-white/8 hover:border-[#C9A227]/40 transition-colors text-center">
                <img src={p.image} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-1" />
                <p className="text-xs text-[#F4E9D8] line-clamp-1">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── StructBay Express ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-[#FE5E00] to-[#E05200] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop')", backgroundSize: "cover" }} />
          <div className="relative flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-6 h-6 text-[#0D0D0D]" />
              <span className="text-[#0D0D0D] font-black text-lg">StructBay Express</span>
            </div>
            <h2 className="text-[#0D0D0D] mb-3">Delivered in 24–48 Hours</h2>
            <p className="text-[#0D0D0D]/70 mb-6">Express products are available for same/next-day delivery across {city}. No waiting, no delays — construction never stops.</p>
            <Link to="/shop" className="inline-flex items-center gap-2 bg-[#0D0D0D] text-[#FE5E00] px-6 py-3 rounded-2xl font-bold hover:bg-[#171717] transition-colors">
              Shop Express <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative flex gap-3">
            {cityProducts.filter(p => p.express).slice(0, 3).map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-[#0D0D0D]/20 backdrop-blur rounded-xl p-3 hover:bg-[#0D0D0D]/30 transition-colors w-32 border border-white/20">
                <img src={p.image} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                <p className="text-xs text-[#0D0D0D] font-medium line-clamp-2">{p.name}</p>
                <p className="text-[#0D0D0D] font-black text-sm mt-1">₹{p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Brands ──────────────────────────────────────────────────── */}
      <section className="bg-[#171717] py-14 px-4 border-y border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-[#F4E9D8]">Our Brands</h2>
            <p className="text-[#D4C4A8]/60 text-sm mt-1">Authorized dealers for India's top construction brands</p>
          </div>
          <div className="bg-[#222222] rounded-2xl border border-white/10 p-6 overflow-hidden">
            <div className="flex gap-4 items-center justify-center flex-wrap">
              {BRANDS.map(brand => (
                <Link
                  key={brand}
                  to={`/brand/${brand.toLowerCase().replace(" ", "-")}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 hover:border-[#FE5E00]/50 hover:bg-[#2A2A2A] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FE5E00] text-[#0D0D0D] font-black text-xs">
                    {brand[0]}
                  </div>
                  <span className="font-semibold text-sm text-[#F4E9D8]">{brand}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banners Row ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-5">
        {/* Bulk Order */}
        <div className="bg-[#222222] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-[#FE5E00]/40 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#FE5E00]/15 border border-[#FE5E00]/20">
              <Building2 className="w-5 h-5 text-[#FE5E00]" />
            </div>
            <h3 className="text-[#F4E9D8] mb-2">Bulk Orders</h3>
            <p className="text-[#D4C4A8]/60 text-sm">Get exclusive pricing for orders above 100 MT. Dedicated account manager included.</p>
          </div>
          <Link
            to="/bulk"
            className="mt-5 inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Request Bulk Pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* RFQ */}
        <div className="bg-[#222222] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-[#C9A227]/40 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#C9A227]/15 border border-[#C9A227]/20">
              <FileText className="w-5 h-5 text-[#C9A227]" />
            </div>
            <h3 className="text-[#F4E9D8] mb-2">Concrete RFQ</h3>
            <p className="text-[#D4C4A8]/60 text-sm">Get instant quotes for Ready Mix Concrete. Specify grade, quantity, and delivery address.</p>
          </div>
          <Link
            to="/rfq"
            className="mt-5 inline-flex items-center gap-2 bg-transparent border border-[#C9A227]/50 hover:bg-[#C9A227] text-[#C9A227] hover:text-[#0D0D0D] px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Get Concrete Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Finance */}
        <div className="rounded-2xl p-6 flex flex-col justify-between bg-gradient-to-br from-[#171717] to-[#222222] border border-white/10 hover:border-[#FE5E00]/30 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#FE5E00] border border-[#FE5E00]">
              <TrendingUp className="w-5 h-5 text-[#0D0D0D]" />
            </div>
            <h3 className="text-[#F4E9D8] mb-2">Builder Finance</h3>
            <p className="text-[#D4C4A8]/60 text-sm">Get construction finance up to ₹5 Cr. Fast approval, competitive rates for builders.</p>
          </div>
          <Link
            to="/finance"
            className="mt-5 inline-flex items-center gap-2 bg-[#F4E9D8] text-[#0D0D0D] hover:bg-[#EADCC6] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Apply for Finance <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Blog ────────────────────────────────────────────────────────── */}
      <section className="bg-[#0D0D0D] max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-[#F4E9D8]">Construction Guides & Insights</h2>
            <p className="text-[#D4C4A8]/60 text-sm mt-1">Expert knowledge for smarter procurement</p>
          </div>
          <Link to="/blog" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {BLOGS.map(blog => (
            <Link
              key={blog.title}
              to="/blog/article"
              className="bg-[#222222] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/40 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all group"
            >
              <div className="aspect-video overflow-hidden">
                <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4">
                <span className="text-xs font-bold uppercase tracking-wide text-[#FE5E00]">{blog.category}</span>
                <h3 className="text-sm font-semibold mt-1.5 mb-2 line-clamp-2 text-[#F4E9D8] leading-snug">{blog.title}</h3>
                <p className="text-xs text-[#D4C4A8]/50">{blog.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="bg-[#171717] border-y border-white/8 py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[#F4E9D8]">What Our Customers Say</h2>
            <p className="text-[#D4C4A8]/60 text-sm mt-1">Trusted by builders and contractors across South India</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-[#222222] border border-white/10 rounded-2xl p-6 hover:border-[#FE5E00]/30 transition-colors">
                <div className="flex mb-3">
                  {Array(t.rating).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#C9A227] text-[#C9A227]" />
                  ))}
                </div>
                <p className="text-[#D4C4A8]/80 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                <div className="pt-3 border-t border-white/8">
                  <p className="text-[#F4E9D8] font-semibold text-sm">{t.name}</p>
                  <p className="text-[#D4C4A8]/50 text-xs mt-0.5">{t.role} · {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="bg-[#222222] border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-[#F4E9D8] mb-2">Need Help with Your Procurement?</h2>
            <p className="text-[#D4C4A8]/70">Our experts are available Mon–Sat, 9AM–7PM to help you source the right materials.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a
              href="tel:+918045678900"
              className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-5 py-3 rounded-2xl font-bold transition-colors shadow-[0_4px_16px_rgba(254,94,0,0.3)]"
            >
              <PhoneCall className="w-4 h-4" /> Call Us
            </a>
            <Link
              to="/rfq"
              className="flex items-center gap-2 border border-white/15 hover:border-[#FE5E00] text-[#F4E9D8] hover:text-[#FE5E00] px-5 py-3 rounded-2xl font-semibold text-sm transition-all"
            >
              <FileText className="w-4 h-4" /> Get Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
