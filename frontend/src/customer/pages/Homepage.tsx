import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router";
import {
  Shield, Zap, ChevronRight, Star, ArrowRight,
  Truck, HeadphonesIcon, Building2, ShoppingCart,
  TrendingUp, CheckCircle, PhoneCall, FileText,
  ChevronLeft, MapPin, LayoutGrid,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";

// ── Carousel ────────────────────────────────────────────────────────────────
function HeroCarousel({ banners, city }: { banners: any[]; city: string | null }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (transitioning || banners.length === 0) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(index); setTransitioning(false); }, 300);
  }, [transitioning, banners.length]);

  const next = useCallback(() => goTo((current + 1) % Math.max(banners.length, 1)), [current, goTo, banners.length]);
  const prev = useCallback(() => goTo((current - 1 + Math.max(banners.length, 1)) % Math.max(banners.length, 1)), [current, goTo, banners.length]);

  useEffect(() => {
    if (banners.length < 2) return;
    timerRef.current = setInterval(next, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, banners.length]);

  if (banners.length === 0) return (
    <section className="relative overflow-hidden bg-sb-nav" style={{ minHeight: 480 }}>
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="max-w-2xl">
          {city && (
            <div className="inline-flex items-center gap-2 bg-[#FE5E00]/15 border border-[#FE5E00]/30 text-[#FE5E00] text-xs px-3 py-1.5 rounded-full mb-5 font-semibold">
              <Zap className="w-3 h-3" /> Now delivering in {city}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-[1.1] tracking-tight text-sb-cream">
            B2B Construction Materials, <span className="text-[#FE5E00]">Simplified</span>
          </h1>
          <p className="text-sb-ink-muted/80 text-lg mb-8 leading-relaxed">Order cement, steel, paints & 1000+ products with assured quality and express delivery.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/shop" className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-7 py-3.5 rounded-2xl font-bold transition-colors shadow-[0_4px_20px_rgba(254,94,0,0.35)]">
              Shop Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/rfq" className="flex items-center gap-2 bg-transparent text-sb-ink border border-sb-ink/18 hover:border-[#FE5E00] hover:text-[#FE5E00] px-7 py-3.5 rounded-2xl font-semibold transition-all">
              Get Bulk Quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  const banner = banners[current];
  const heroImageSrc = (banner.image?.url || banner.imageUrl || "").trim();

  return (
    <section className="relative overflow-hidden bg-sb-nav" style={{ minHeight: 480 }}>
      <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: transitioning ? 0 : 1 }}>
        {heroImageSrc ? (
          <img src={heroImageSrc} alt="" className="w-full h-full object-cover" style={{ position: "absolute", inset: 0 }} />
        ) : null}
        <div className={`absolute inset-0 ${heroImageSrc ? "bg-gradient-to-r from-sb-nav via-sb-nav/80 to-transparent" : ""}`} />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 transition-opacity duration-500" style={{ opacity: transitioning ? 0 : 1 }}>
        <div className="max-w-2xl">
          {city && (
            <div className="inline-flex items-center gap-2 bg-[#FE5E00]/15 border border-[#FE5E00]/30 text-[#FE5E00] text-xs px-3 py-1.5 rounded-full mb-5 font-semibold">
              <Zap className="w-3 h-3" /> Now delivering in {city}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-[1.1] tracking-tight text-sb-cream">
            {banner.title}
          </h1>
          <p className="text-sb-ink-muted/80 text-lg mb-8 leading-relaxed">{banner.subtitle || banner.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link to={banner.buttonLink || "/shop"} className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-7 py-3.5 rounded-2xl font-bold transition-colors shadow-[0_4px_20px_rgba(254,94,0,0.35)]">
              {banner.buttonText || "Shop Now"} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/rfq" className="flex items-center gap-2 bg-transparent text-sb-ink border border-sb-ink/18 hover:border-[#FE5E00] hover:text-[#FE5E00] px-7 py-3.5 rounded-2xl font-semibold transition-all">
              Get Bulk Quote
            </Link>
          </div>
        </div>
      </div>
      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-sb-nav/55 border border-sb-ink/18 flex items-center justify-center text-sb-ink hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-sb-on-orange transition-all z-10" aria-label="Previous">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-sb-nav/55 border border-sb-ink/18 flex items-center justify-center text-sb-ink hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-sb-on-orange transition-all z-10" aria-label="Next">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-[#FE5E00]" : "w-2 h-2 bg-sb-cream/35 hover:bg-sb-cream/55"}`} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: any }) {
  const { addToCart, city } = useApp();
  const price = product.pricing?.salePrice || product.pricing?.regularPrice || 0;
  const mrp = product.pricing?.regularPrice || price;
  const discount = mrp && price < mrp ? Math.round((1 - price / mrp) * 100) : 0;
  const image = Array.isArray(product.images) ? product.images[0]?.url : product.image;
  const slug = product.slug || product._id;
  const brandName = product.brand?.name || product.brand || "";

  return (
    <div className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_24px_rgba(254,94,0,0.12)] transition-all duration-300 group">
      <Link to={`/products/${slug}`} className="relative aspect-square overflow-hidden bg-sb-surface block">
        {image && <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
        <div className="absolute top-2 left-2 flex gap-1 flex-col">
          {product.isAssured && (
            <span className="bg-sb-page text-[#C9A227] border border-[#C9A227]/40 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Shield className="w-2.5 h-2.5" /> Assured
            </span>
          )}
          {product.isExpress && (
            <span className="bg-[#FE5E00] text-sb-on-orange text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Zap className="w-2.5 h-2.5" /> Express
            </span>
          )}
        </div>
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-[#C9A227] text-sb-on-orange text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</div>
        )}
      </Link>
      <div className="p-3.5">
        <p className="text-xs text-sb-ink-muted/60">{brandName}</p>
        <h3 className="text-sm font-medium text-sb-ink line-clamp-2 mt-0.5 leading-snug">{product.name}</h3>
        {city && <p className="text-xs text-sb-ink-muted/60 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-sb-ink-muted/60" /> {city} price</p>}
        <div className="flex items-baseline gap-2 mt-1.5">
          {price > 0 ? (
            <>
              <span className="font-bold text-[#FE5E00]">₹{price.toLocaleString()}</span>
              {discount > 0 && <span className="text-xs text-sb-ink-muted/50 line-through">₹{mrp.toLocaleString()}</span>}
            </>
          ) : (
            <span className="text-xs text-sb-ink-muted/50">Price on request</span>
          )}
        </div>
        {price > 0 && <p className="text-[10px] text-sb-ink-muted/40 mt-0.5">excl. GST · GST at checkout</p>}
        <button
          onClick={() => addToCart({ id: slug, name: product.name, brand: brandName, price, qty: 1, unit: product.unit || "unit", image })}
          className="w-full mt-3 py-2 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function Homepage() {
  const { city, cityId } = useApp();

  const [banners, setBanners]           = useState<any[]>([]);
  const [categories, setCategories]     = useState<any[]>([]);
  const [brands, setBrands]             = useState<any[]>([]);
  const [topProducts, setTopProducts]   = useState<any[]>([]);
  const [assuredProducts, setAssuredProducts] = useState<any[]>([]);
  const [expressProducts, setExpressProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [blogs, setBlogs]               = useState<any[]>([]);

  // Fetch all data from APIs in parallel
  useEffect(() => {
    const cityParam = cityId || undefined;

    api.getActiveBanners()
      .then(d => setBanners((d.data || []).filter((b: any) => b.isLive !== false)))
      .catch(() => {});

    api.getCategories({ status: 'ACTIVE', limit: 20, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setCategories(d.data || []))
      .catch(() => {});

    api.getBrands({ status: 'ACTIVE', limit: 12, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setBrands(d.data || []))
      .catch(() => {});

    api.getProducts({ isTopSelling: 'true', limit: 8, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setTopProducts(d.data || []))
      .catch(() => {});

    api.getProducts({ assured: 'true', limit: 4, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setAssuredProducts(d.data || []))
      .catch(() => {});

    api.getProducts({ express: 'true', limit: 3, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setExpressProducts(d.data || []))
      .catch(() => {});

    api.getTestimonials()
      .then(d => setTestimonials(d.data || []))
      .catch(() => {});

    api.getBlogs(3)
      .then(d => setBlogs(d.data || []))
      .catch(() => {});
  }, [cityId]);

  return (
    <div className="bg-sb-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <DeliveryChargesNotice />
      </div>

      {/* ── Hero Carousel ──────────────────────────────────────────────────── */}
      <HeroCarousel banners={banners} city={city} />

      {/* ── Trust bar ──────────────────────────────────────────────────────── */}
      <section className="bg-sb-surface border-y border-sb-ink/10">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield,         label: "StructBay Assured", desc: "Quality verified products" },
            { icon: Zap,            label: "Express Delivery",  desc: "Delivery in 24-48 hrs" },
            { icon: Truck,          label: "Free Shipping",     desc: "On orders above ₹10,000" },
            { icon: HeadphonesIcon, label: "24/7 Support",      desc: "Expert assistance" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FE5E00]/15 border border-[#FE5E00]/20">
                <Icon className="w-5 h-5 text-[#FE5E00]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-sb-ink">{label}</p>
                <p className="text-xs text-sb-ink-muted/60">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="bg-sb-page max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-sb-ink">Browse Categories</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Find exactly what you need</p>
            </div>
            <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl p-4 text-center hover:border-[#FE5E00]/60 hover:bg-sb-surface-elevated hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all duration-250 group"
              >
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                  <div className="w-12 h-12 rounded-xl bg-sb-surface border border-sb-ink/8 flex items-center justify-center overflow-hidden">
                    {cat.image?.url
                      ? <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover" />
                      : <LayoutGrid className="w-6 h-6 text-sb-ink-muted/45" aria-hidden />
                    }
                  </div>
                </div>
                <p className="font-semibold text-sm text-sb-ink">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Why StructBay? ─────────────────────────────────────────────────── */}
      <section className="bg-sb-surface border-y border-sb-ink/10 py-14 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-sb-ink text-3xl font-black mb-3">Why Choose StructBay?</h2>
            <p className="text-sb-ink-muted/70 text-sm leading-relaxed mb-6">
              We bring transparency, quality, and speed to B2B construction procurement. Our trusted vendor network ensures you get genuine materials, exact weights, and GST-compliant billing for every order.
            </p>
            <Link to="/rfq" className="inline-flex items-center gap-2 border-2 border-sb-ink/12 text-sb-ink px-6 py-2.5 rounded-xl font-bold hover:bg-[#FE5E00] hover:border-[#FE5E00] hover:text-sb-on-orange transition-all">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: "10,000+", label: "Products" },
              { val: "500+",    label: "Verified Vendors" },
              { val: "24 Hrs",  label: "Express Delivery" },
            ].map(({ val, label }) => (
              <div key={label} className="bg-sb-surface-2 rounded-2xl p-5 border border-sb-ink/12">
                <h3 className="text-sb-ink font-black text-2xl mb-1">{val}</h3>
                <p className="text-sb-ink-muted/60 text-xs font-semibold uppercase tracking-wider">{label}</p>
              </div>
            ))}
            <div className="bg-[#FE5E00] rounded-2xl p-5 shadow-[0_8px_24px_rgba(254,94,0,0.2)]">
              <h3 className="text-sb-on-orange font-black text-2xl mb-1">100%</h3>
              <p className="text-sb-on-orange/80 text-xs font-bold uppercase tracking-wider">Assured Quality</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Selling Products ───────────────────────────────────────────── */}
      {topProducts.length > 0 && (
        <section className="bg-sb-surface py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-sb-ink">Top Selling Products</h2>
                <p className="text-sb-ink-muted/60 text-sm mt-1">
                  {city ? `Best deals in ${city}` : "Pick a city in the header for local pricing"}
                </p>
              </div>
              <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {topProducts.map(p => <ProductCard key={p._id || p.slug} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── StructBay Assured ──────────────────────────────────────────────── */}
      {assuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 bg-sb-surface-2 border border-sb-ink/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#C9A227]" />
            <div className="flex-1 pl-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-[#C9A227]" />
                <span className="font-bold text-lg text-[#C9A227]">StructBay Assured</span>
              </div>
              <h2 className="text-sb-ink mb-3">Quality You Can Trust</h2>
              <p className="text-sb-ink-muted/70 mb-6">Every Assured product undergoes rigorous quality checks. Only ISI-certified, BIS-compliant materials with verified brand authorization.</p>
              <div className="flex flex-wrap gap-2.5">
                {["BIS Certified", "ISI Marked", "Brand Verified", "Lab Tested"].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5 bg-[#C9A227]/10 border border-[#C9A227]/25 rounded-full px-3 py-1.5 text-sm text-[#C9A227]">
                    <CheckCircle className="w-3.5 h-3.5" /> {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[220px]">
              {assuredProducts.slice(0, 4).map(p => {
                const img = Array.isArray(p.images) ? p.images[0]?.url : p.image;
                return (
                  <Link key={p._id} to={`/products/${p.slug}`} className="bg-sb-surface rounded-xl p-2 border border-sb-ink/10 hover:border-[#C9A227]/40 transition-colors text-center">
                    {img && <img src={img} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-1" />}
                    <p className="text-xs text-sb-ink line-clamp-1">{p.name}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── StructBay Express ──────────────────────────────────────────────── */}
      {expressProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-[#FE5E00] to-[#E05200] relative overflow-hidden">
            <div className="relative flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-6 h-6 text-sb-on-orange" />
                <span className="text-sb-on-orange font-black text-lg">StructBay Express</span>
              </div>
              <h2 className="text-sb-on-orange mb-3">Delivered in 24–48 Hours</h2>
              <p className="text-sb-on-orange/75 mb-6">
                {city
                  ? `Express products are available for same/next-day delivery across ${city}. No waiting, no delays — construction never stops.`
                  : "Express products ship fast where service is available. Select your city in the header for accurate timelines and pricing."}
              </p>
              <Link to="/shop" className="inline-flex items-center gap-2 bg-sb-page text-[#FE5E00] px-6 py-3 rounded-2xl font-bold hover:bg-sb-surface transition-colors">
                Shop Express <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative flex gap-3">
              {expressProducts.slice(0, 3).map(p => {
                const img = Array.isArray(p.images) ? p.images[0]?.url : p.image;
                const price = p.pricing?.salePrice || p.pricing?.regularPrice || 0;
                return (
                  <Link key={p._id} to={`/products/${p.slug}`} className="bg-sb-nav/20 backdrop-blur rounded-xl p-3 hover:bg-sb-nav/30 transition-colors w-32 border border-sb-ink/18">
                    {img && <img src={img} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2" />}
                    <p className="text-xs text-sb-on-orange font-medium line-clamp-2">{p.name}</p>
                    {price > 0 && (
                      <>
                        <p className="text-sb-on-orange font-black text-sm mt-1">₹{price.toLocaleString()}</p>
                        <p className="text-[9px] text-sb-on-orange/65">excl. GST</p>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Our Brands ─────────────────────────────────────────────────────── */}
      {brands.length > 0 && (
        <section className="bg-sb-surface py-14 px-4 border-y border-sb-ink/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-sb-ink">Our Brands</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Authorized dealers for India's top construction brands</p>
            </div>
            <div className="bg-sb-surface-2 rounded-2xl border border-sb-ink/12 py-5 sb-marquee">
              <div className="sb-marquee__track items-center px-4">
                {[...brands, ...brands].map((brand, i) => (
                  <Link
                    key={`${brand.slug}-${i}`}
                    to={`/brands/${brand.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sb-ink/10 hover:border-[#FE5E00]/50 hover:bg-sb-surface-elevated transition-all shrink-0"
                  >
                    {brand.logo?.url
                      ? <img src={brand.logo.url} alt={brand.name} className="w-8 h-8 rounded-lg object-contain" />
                      : <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FE5E00] text-sb-on-orange font-black text-xs">{brand.name[0]}</div>
                    }
                    <span className="font-semibold text-sm text-sb-ink whitespace-nowrap">{brand.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banners Row ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-5">
        <div className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl p-6 flex flex-col justify-between hover:border-[#FE5E00]/40 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#FE5E00]/15 border border-[#FE5E00]/20"><Building2 className="w-5 h-5 text-[#FE5E00]" /></div>
            <h3 className="text-sb-ink mb-2">Bulk Orders</h3>
            <p className="text-sb-ink-muted/60 text-sm">Get exclusive pricing for orders above 100 MT. Dedicated account manager included.</p>
          </div>
          <Link to="/bulk-enquiry" className="mt-5 inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Request Bulk Pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl p-6 flex flex-col justify-between hover:border-[#C9A227]/40 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#C9A227]/15 border border-[#C9A227]/20"><FileText className="w-5 h-5 text-[#C9A227]" /></div>
            <h3 className="text-sb-ink mb-2">Concrete RFQ</h3>
            <p className="text-sb-ink-muted/60 text-sm">Get instant quotes for Ready Mix Concrete. Specify grade, quantity, and delivery address.</p>
          </div>
          <Link to="/rfq" className="mt-5 inline-flex items-center gap-2 bg-transparent border border-[#C9A227]/50 hover:bg-[#C9A227] text-[#C9A227] hover:text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            Get Concrete Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="rounded-2xl p-6 flex flex-col justify-between bg-gradient-to-br from-[#171717] to-[#222222] border border-sb-ink/12 hover:border-[#FE5E00]/30 transition-colors">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#FE5E00] border border-[#FE5E00]"><TrendingUp className="w-5 h-5 text-sb-on-orange" /></div>
            <h3 className="text-sb-ink mb-2">Builder Finance</h3>
            <p className="text-sb-ink-muted/60 text-sm">Get construction finance up to ₹5 Cr. Fast approval, competitive rates for builders.</p>
          </div>
          <Link to="/finance" className="mt-5 inline-flex items-center gap-2 bg-[#F4E9D8] text-sb-on-orange hover:bg-sb-cream-soft px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Apply for Finance <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Blog ───────────────────────────────────────────────────────────── */}
      {blogs.length > 0 && (
        <section className="bg-sb-page max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-sb-ink">Construction Guides & Insights</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Expert knowledge for smarter procurement</p>
            </div>
            <Link to="/blogs" className="flex items-center gap-1 text-sm font-semibold text-[#FE5E00] hover:text-[#E05200] transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {blogs.map(blog => (
              <Link
                key={blog._id || blog.slug}
                to={`/blogs/${blog.slug}`}
                className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl overflow-hidden hover:border-[#FE5E00]/40 hover:shadow-[0_4px_24px_rgba(254,94,0,0.1)] transition-all group"
              >
                <div className="aspect-video overflow-hidden">
                  {blog.featuredImage?.url
                    ? <img src={blog.featuredImage.url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full bg-sb-surface" />
                  }
                </div>
                <div className="p-4">
                  {blog.category && <span className="text-xs font-bold uppercase tracking-wide text-[#FE5E00]">{blog.category}</span>}
                  <h3 className="text-sm font-semibold mt-1.5 mb-2 line-clamp-2 text-sb-ink leading-snug">{blog.title}</h3>
                  <p className="text-xs text-sb-ink-muted/50">
                    {blog.publishDate ? new Date(blog.publishDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="bg-sb-surface border-y border-sb-ink/10 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-sb-ink">What Our Customers Say</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Trusted by builders and contractors across India</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {testimonials.map(t => (
                <div key={t._id} className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl p-6 hover:border-[#FE5E00]/30 transition-colors">
                  <div className="flex mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C9A227] text-[#C9A227]" />
                    ))}
                  </div>
                  <p className="text-sb-ink-muted/80 text-sm mb-4 leading-relaxed">"{t.review || t.message}"</p>
                  <div className="pt-3 border-t border-sb-ink/10">
                    <p className="text-sb-ink font-semibold text-sm">{t.customerName || t.name}</p>
                    <p className="text-sb-ink-muted/50 text-xs mt-0.5">{t.designation || t.role} {t.company ? `· ${t.company}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact CTA ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="bg-sb-surface-2 border border-sb-ink/12 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-sb-ink mb-2">Need Help with Your Procurement?</h2>
            <p className="text-sb-ink-muted/70">Our experts are available Mon–Sat, 9AM–7PM to help you source the right materials.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="tel:+917090570505" className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-5 py-3 rounded-2xl font-bold transition-colors shadow-[0_4px_16px_rgba(254,94,0,0.3)]">
              <PhoneCall className="w-4 h-4" /> Call Us
            </a>
            <Link to="/rfq" className="flex items-center gap-2 border border-sb-ink/14 hover:border-[#FE5E00] text-sb-ink hover:text-[#FE5E00] px-5 py-3 rounded-2xl font-semibold text-sm transition-all">
              <FileText className="w-4 h-4" /> Get Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
