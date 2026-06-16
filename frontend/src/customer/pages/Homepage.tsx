import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  Shield, Zap, ChevronRight, Star, ArrowRight,
  Truck, HeadphonesIcon, Building2, ShoppingCart,
  TrendingUp, CheckCircle, PhoneCall, FileText,
  ChevronLeft, MapPin, LayoutGrid, X,
  Package, PaintBucket, Grid3x3, PlugZap, Droplets,
  PanelsTopLeft, Wrench, Hammer, FlaskConical, Fan,
  HardHat, CircleDot, Boxes, Layers,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { useCmsPageSeo } from "../hooks/useCmsPageSeo";
import { HeroDeliverTo } from "../components/HeroDeliverTo";

const ANNOUNCEMENT_DISMISS_DAY_KEY = "structbay_announcement_dismiss_day_map";

/** Local calendar day YYYY-MM-DD (for per-day popup dismiss). */
function calendarDayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readAnnouncementDismissDayMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_DISMISS_DAY_KEY);
    const o = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function isAnnouncementDismissedToday(id: string): boolean {
  const today = calendarDayISO();
  return readAnnouncementDismissDayMap()[String(id)] === today;
}

function dismissAnnouncementsForToday(ids: string[]) {
  const today = calendarDayISO();
  const map = { ...readAnnouncementDismissDayMap() };
  ids.forEach((id) => {
    map[String(id)] = today;
  });
  try {
    localStorage.setItem(ANNOUNCEMENT_DISMISS_DAY_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** CMS may save hex without `#`; invalid values fall through so we default for photo heroes. */
function normalizeCssColor(raw: string | null | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) return `#${s}`;
  return s;
}

/** Branded fallback when no CMS / banner image is configured (never show an empty hero). */
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2400&q=82";

const DEFAULT_TAGLINE = "India's premier construction materials marketplace";

const DEFAULT_SUB =
  "Procure cement, steel, paints, electricals, plumbing, hardware, plywood and more from verified vendors across India.";

const ROTATING_HEADLINES = [
  "Click. Buy. Build.",
  "Everything your site needs.",
  "Construction procurement simplified.",
  "Trusted materials. Trusted vendors.",
];

const HERO_TRUST_POINTS = [
  "StructBay Assured",
  "StructBay Delivery",
  "GST invoice",
  "Verified vendors",
  "Bulk procurement support",
];

type HeroSlide = {
  id: string;
  imageUrl: string;
  title: string;
  sub: string;
  shopLabel: string;
  shopHref: string;
  secondaryHref: string;
  overlayOpacity: number | null;
  titleColor: string | null;
  subtitleColor: string | null;
};

function buildHeroSlides(rawBanners: any[], cms: Record<string, unknown>): HeroSlide[] {
  const cmsBg = String(cms.heroBackgroundImageUrl || "").trim();
  const cmsTitle = String(cms.heroTitle || "").trim();
  const cmsSub = String(cms.heroSubtitle || "").trim();
  const cmsCta = String(cms.heroCtaText || "").trim() || "Shop Now";
  const defaultTitle = "Build Better.\nBuild Smarter.";

  const live = (rawBanners || []).filter((b: any) => {
    if (!b || b.status === "INACTIVE") return false;
    if (b.isLive === false) return false;
    return true;
  });

  const mapBanner = (b: any, i: number): HeroSlide => {
    const img = (b.image?.url || b.imageUrl || "").trim() || cmsBg || DEFAULT_HERO_IMAGE;
    const titleRaw = String(b.title || "").trim();
    const title = titleRaw.length >= 3 ? titleRaw : cmsTitle || defaultTitle;
    const sub =
      [b.subtitle, b.description]
        .map((x: any) => String(x || "").trim())
        .filter(Boolean)
        .join(" — ") || cmsSub || DEFAULT_SUB;
    return {
      id: String(b._id || `slide-${i}`),
      imageUrl: img,
      title,
      sub,
      shopLabel: String(b.buttonText || "").trim() || cmsCta,
      shopHref: String(b.buttonLink || "/shop").trim() || "/shop",
      secondaryHref: "/rfq",
      overlayOpacity: b.overlayOpacity ?? null,
      titleColor: b.titleColor || null,
      subtitleColor: b.subtitleColor || null,
    };
  };

  if (live.length > 0) return live.map(mapBanner);

  return [
    {
      id: "fallback-cms",
      imageUrl: cmsBg || DEFAULT_HERO_IMAGE,
      title: cmsTitle || defaultTitle,
      sub: cmsSub || DEFAULT_SUB,
      shopLabel: cmsCta,
      shopHref: "/shop",
      secondaryHref: "/rfq",
      overlayOpacity: 52,
      titleColor: null,
      subtitleColor: null,
    },
  ];
}

/** 40–60% readable overlay on the left; CMS `overlayOpacity` 0–100 tunes strength. */
function heroReadableOverlay(opacityPct: number | null | undefined): CSSProperties {
  const pct =
    opacityPct != null && Number.isFinite(Number(opacityPct))
      ? Math.min(100, Math.max(0, Number(opacityPct)))
      : 52;
  const left = 0.42 + (pct / 100) * 0.38;
  const mid = left * 0.62;
  return {
    background: `linear-gradient(105deg, rgba(2,6,23,${Math.min(0.88, left)}) 0%, rgba(15,23,42,${mid}) 45%, rgba(15,23,42,0.22) 72%, rgba(2,6,23,0.05) 100%)`,
  };
}

function parseHeroTitle(title: string): { line1: string; line2: string | null } {
  const t = title.replace(/\\n/g, "\n").trim();
  const parts = t.split("\n").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { line1: parts[0], line2: parts.slice(1).join(" ") };
  const dot = t.indexOf(".");
  if (dot > 0 && dot < t.length - 1) {
    return { line1: t.slice(0, dot + 1).trim(), line2: t.slice(dot + 1).trim() };
  }
  return { line1: t || "Build Better.", line2: null };
}

function StructBayHero({
  rawBanners,
  cms,
  city,
  cityId,
}: {
  rawBanners: any[];
  cms: Record<string, unknown>;
  city: string | null;
  cityId: string | null;
}) {
  const slides = buildHeroSlides(rawBanners, cms);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [rotateIdx, setRotateIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const n = slides.length;
  const slide = slides[Math.min(current, n - 1)] || slides[0];
  const { line1, line2 } = parseHeroTitle(slide.title);

  useEffect(() => {
    setCurrent((c) => Math.min(c, Math.max(n - 1, 0)));
  }, [n]);

  const goTo = useCallback(
    (index: number) => {
      if (transitioning || n === 0) return;
      setTransitioning(true);
      setTimeout(() => {
        setCurrent(((index % n) + n) % n);
        setTransitioning(false);
      }, 280);
    },
    [transitioning, n]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (n < 2) return;
    timerRef.current = setInterval(next, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, n]);

  useEffect(() => {
    rotateRef.current = setInterval(() => {
      setRotateIdx((i) => (i + 1) % ROTATING_HEADLINES.length);
    }, 4500);
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current);
    };
  }, []);

  const titleColor = normalizeCssColor(slide.titleColor) || "#ffffff";
  const subColor = normalizeCssColor(slide.subtitleColor) || "rgba(255,255,255,0.88)";

  return (
    <section className="relative overflow-hidden bg-slate-950 min-h-[min(92vh,780px)] flex flex-col">
      {/* Full-bleed background — always an image */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}>
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading={current === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-slate-950/35" aria-hidden />
          <div className="absolute inset-0 pointer-events-none" style={heroReadableOverlay(slide.overlayOpacity)} />
        </div>
      </div>

      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 pt-10 pb-28 lg:pb-16 lg:pt-14">
        <div className="flex flex-col justify-center min-h-[min(78vh,640px)] max-w-3xl mx-auto lg:mx-0">
          {/* Copy + pincode + CTAs — single column (background already shows the hero image) */}
          <div className="text-center lg:text-left">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide mb-5 ${
                city
                  ? "border-[#FE5E00]/40 bg-[#FE5E00]/15 text-[#FDBA74]"
                  : "border-white/25 bg-white/10 text-white/90"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#FE5E00]" aria-hidden />
              {city ? `Now delivering in ${city}` : "StructBay — verified vendors · GST-compliant procurement"}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]">
              <span style={{ color: titleColor }}>{line1}</span>
              {line2 ? (
                <>
                  <br />
                  <span className="text-[#FE5E00]">{line2}</span>
                </>
              ) : null}
            </h1>

            <p className="mt-4 text-lg sm:text-xl font-semibold text-[#FDBA74] min-h-[1.75rem] transition-all duration-300">
              {ROTATING_HEADLINES[rotateIdx]}
            </p>

            <p className="mt-3 text-sm sm:text-base font-semibold text-white/90 tracking-tight">{DEFAULT_TAGLINE}</p>

            <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose mx-auto lg:mx-0" style={{ color: subColor }}>
              {slide.sub}
            </p>

            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-sm text-white/90 max-w-lg mx-auto lg:mx-0">
              {HERO_TRUST_POINTS.map((pt) => (
                <li key={pt} className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-[#4ade80]" aria-hidden />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-center lg:justify-start">
              <HeroDeliverTo cityId={cityId} />
            </div>

            {/* CTAs — sticky on small screens */}
            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-white/10 bg-slate-950/90 backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0 supports-[padding:max(0px)]:pb-[max(12px,env(safe-area-inset-bottom))]">
              <Link
                to={slide.shopHref}
                className="inline-flex flex-1 min-w-[140px] sm:flex-none items-center justify-center gap-2 min-h-[48px] px-7 py-3.5 rounded-2xl font-bold bg-[#FE5E00] hover:bg-[#E05200] text-white border border-[#FE5E00] shadow-[0_4px_20px_rgba(254,94,0,0.35)] transition-colors"
              >
                {slide.shopLabel} <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
              </Link>
              <Link
                to={slide.secondaryHref}
                className="inline-flex flex-1 min-w-[140px] sm:flex-none items-center justify-center gap-2 min-h-[48px] px-7 py-3.5 rounded-2xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors"
              >
                Get Quote <ArrowRight className="w-4 h-4 shrink-0 text-slate-700" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-[#FE5E00] hover:border-[#FE5E00] transition-all z-20"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-[#FE5E00] hover:border-[#FE5E00] transition-all z-20"
            aria-label="Next banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-24 lg:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? "w-7 h-2 bg-[#FE5E00]" : "w-2 h-2 bg-white/35 hover:bg-white/55"
                }`}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** Fallback illustration when category has no CMS image (slug/name keyword match). */
function categoryAccentIcon(cat: { name?: string; slug?: string }): LucideIcon {
  const key = `${cat.slug || ""} ${cat.name || ""}`.toLowerCase();
  if (key.includes("cement")) return Package;
  if (key.includes("steel") || key.includes("tmt") || key.includes("rebar")) return CircleDot;
  if (key.includes("brick")) return Boxes;
  if (key.includes("sand") || key.includes("aggregate")) return Layers;
  if (key.includes("paint")) return PaintBucket;
  if (key.includes("electrical") || key.includes("wire") || key.includes("switch")) return PlugZap;
  if (key.includes("plumb") || key.includes("pipe") || key.includes("sanitary") || key.includes("bath")) return Droplets;
  if (key.includes("tile") || key.includes("floor")) return Grid3x3;
  if ((key.includes("plywood") || key.includes("wood")) && !key.includes("hardware")) return PanelsTopLeft;
  if (key.includes("hardware")) return Wrench;
  if (key.includes("tool")) return Hammer;
  if (key.includes("chemical") || key.includes("waterproof")) return FlaskConical;
  if (key.includes("light") || key.includes("fan")) return Fan;
  if (key.includes("safety")) return HardHat;
  return LayoutGrid;
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
          onClick={() =>
            addToCart({
              id: slug,
              productSlug: String(slug),
              name: product.name,
              brand: brandName,
              price,
              qty: 1,
              unit: product.unit || "unit",
              image,
            })
          }
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
  useCmsPageSeo("home");
  const { city, cityId } = useApp();

  const [banners, setBanners]           = useState<any[]>([]);
  const [categories, setCategories]     = useState<any[]>([]);
  const [brands, setBrands]             = useState<any[]>([]);
  const [topProducts, setTopProducts]   = useState<any[]>([]);
  const [assuredProducts, setAssuredProducts] = useState<any[]>([]);
  const [expressProducts, setExpressProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [blogs, setBlogs]               = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [cmsHome, setCmsHome] = useState<Record<string, unknown>>({});

  const dismissAnnouncements = useCallback(() => {
    const ids = announcements.map((a: any) => String(a._id));
    if (ids.length) dismissAnnouncementsForToday(ids);
    setAnnouncements([]);
  }, [announcements]);

  useEffect(() => {
    if (announcements.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissAnnouncements();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [announcements.length, dismissAnnouncements]);

  // Fetch all data from APIs in parallel
  useEffect(() => {
    const cityParam = cityId || undefined;

    fetch("/api/v1/cms/announcements?status=ACTIVE&liveOnly=true&limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !Array.isArray(d.data)) return;
        const forCustomers = d.data.filter((a: any) => {
          const aud = a.audience;
          if (!aud || !Array.isArray(aud) || aud.length === 0) return true;
          return aud.includes("ALL") || aud.includes("CUSTOMER");
        });
        const visible = forCustomers.filter((a: any) => !isAnnouncementDismissedToday(String(a._id)));
        setAnnouncements(visible);
      })
      .catch(() => {});

    void api
      .getCmsHomepage()
      .then((d) => setCmsHome(d && typeof d === "object" ? (d as Record<string, unknown>) : {}))
      .catch(() => setCmsHome({}));

    api.getActiveBanners()
      .then(d => setBanners((d.data || []).filter((b: any) => b.isLive !== false)))
      .catch(() => {});

    api.getCategories({ status: 'ACTIVE', limit: 20, ...(cityParam ? { cityId: cityParam } : {}) })
      .then((d: any) => setCategories(d.data || []))
      .catch(() => {});

    api.getBrands({ status: 'ACTIVE', limit: 24, ...(cityParam ? { cityId: cityParam } : {}) })
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

  const categoriesForHome = useMemo(() => {
    const key = (c: any) => String(c._id ?? c.slug ?? c.name);
    const withProducts = categories.filter(
      (c: any) => c.productCount === undefined || Number(c.productCount) > 0
    );
    if (withProducts.length >= 5) return withProducts;

    const out = [...withProducts];
    const seen = new Set(out.map(key));
    for (const c of categories) {
      if (out.length >= 5) break;
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
    return out;
  }, [categories]);
  const showHomeFinance = import.meta.env.VITE_SHOW_HOME_FINANCE !== "false";

  return (
    <div className="bg-sb-page min-h-screen">
      {announcements.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-sb-ink/55 backdrop-blur-[3px] cursor-default"
            aria-label="Close announcements"
            onClick={dismissAnnouncements}
          />
          <div
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-sb-ink/12 bg-sb-cream-secondary shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-sb-ink/10 shrink-0">
              <p id="announcement-dialog-title" className="text-sm font-bold text-sb-ink tracking-[0.14em]">
                ANNOUNCEMENT
              </p>
              <button
                type="button"
                onClick={dismissAnnouncements}
                className="shrink-0 w-10 h-10 rounded-xl border border-sb-ink/12 bg-sb-cream hover:bg-sb-ink/5 flex items-center justify-center text-sb-ink-muted hover:text-sb-ink transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-0 sm:px-1 py-3 overflow-y-auto flex-1 space-y-3 bg-sb-page/40">
              {announcements.map((a) =>
                a.image?.url ? (
                  <div key={a._id} className="w-full overflow-hidden rounded-xl border border-sb-ink/8 bg-sb-cream">
                    <img
                      src={a.image.url}
                      alt={typeof a.title === "string" ? a.title : ""}
                      className="w-full max-h-[min(72vh,560px)] object-contain object-center"
                    />
                  </div>
                ) : (
                  <div
                    key={a._id}
                    className="rounded-xl border border-dashed border-sb-ink/15 bg-sb-cream/90 px-4 py-3 text-center"
                  >
                    <p className="text-sm text-sb-ink-muted">{typeof a.title === "string" ? a.title : "Announcement"}</p>
                  </div>
                )
              )}
            </div>
            <div className="px-5 py-4 border-t border-sb-ink/10 bg-sb-cream shrink-0">
              <button
                type="button"
                onClick={dismissAnnouncements}
                className="w-full py-3 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-sm font-bold transition-colors shadow-[0_4px_20px_rgba(254,94,0,0.25)]"
              >
                Got it, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Carousel ──────────────────────────────────────────────────── */}
      <StructBayHero rawBanners={banners} cms={cmsHome} city={city} cityId={cityId} />

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
      {categoriesForHome.length > 0 && (
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
            {categoriesForHome.slice(0, 10).map((cat) => {
              const Icon = categoryAccentIcon(cat);
              const cnt = Number(cat.productCount);
              const countLabel =
                cat.productCount === undefined || cat.productCount === null
                  ? null
                  : `${cnt.toLocaleString("en-IN")} products`;
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl overflow-hidden text-left hover:border-[#FE5E00]/60 hover:shadow-[0_8px_28px_rgba(254,94,0,0.12)] transition-all duration-250 group"
                >
                  <div className="relative aspect-[5/4] bg-gradient-to-br from-sb-surface to-sb-surface-elevated border-b border-sb-ink/8 overflow-hidden">
                    {cat.image?.url ? (
                      <img
                        src={cat.image.url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#FE5E00]/10">
                        <Icon className="w-14 h-14 text-[#FE5E00]" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="font-semibold text-sm text-sb-ink line-clamp-2 leading-snug">{cat.name}</p>
                    {countLabel !== null && (
                      <p className="text-xs text-sb-ink-muted/55 mt-1">{countLabel}</p>
                    )}
                  </div>
                </Link>
              );
            })}
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

      {/* ── Featured brands (logo carousel) ─────────────────────────────────── */}
      {brands.length > 0 && (
        <section className="bg-sb-surface py-14 px-4 border-y border-sb-ink/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-sb-ink">Featured Brands</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Authorized partners for India&apos;s top construction brands</p>
            </div>
            <div className="bg-sb-surface-2 rounded-2xl border border-sb-ink/12 py-6 sb-marquee">
              <div className="sb-marquee__track items-stretch px-4 gap-4 md:gap-6">
                {[...brands, ...brands].map((brand, i) => (
                  <Link
                    key={`${brand.slug}-${i}`}
                    to={`/brands/${brand.slug}`}
                    className="group shrink-0 flex flex-col items-center justify-center w-[7.25rem] sm:w-36 min-h-[5.5rem] rounded-2xl border border-sb-ink/10 bg-white hover:border-[#FE5E00]/50 hover:shadow-[0_8px_24px_rgba(254,94,0,0.12)] transition-all px-3 py-3"
                  >
                    {brand.logo?.url ? (
                      <img
                        src={brand.logo.url}
                        alt={brand.name}
                        className="max-h-11 sm:max-h-12 max-w-[5.5rem] sm:max-w-[6.25rem] w-auto object-contain"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#FE5E00]/12 border border-[#FE5E00]/20 text-[#FE5E00] font-black text-sm">
                        {(brand.name || "?")[0]}
                      </div>
                    )}
                    <span className="mt-2 text-[11px] sm:text-xs font-semibold text-sb-ink/90 text-center line-clamp-2 leading-tight max-w-full group-hover:text-[#FE5E00] transition-colors">
                      {brand.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banners Row ────────────────────────────────────────────────── */}
      <section
        className={`max-w-7xl mx-auto px-4 py-12 grid gap-5 ${showHomeFinance ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
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
        {showHomeFinance && (
          <div className="bg-sb-surface-2 border border-sb-ink/12 rounded-2xl p-6 flex flex-col justify-between hover:border-[#FE5E00]/40 transition-colors">
            <div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#FE5E00]/15 border border-[#FE5E00]/20">
                <TrendingUp className="w-5 h-5 text-[#FE5E00]" />
              </div>
              <h3 className="text-sb-ink mb-2">Builder Finance</h3>
              <p className="text-sb-ink-muted/60 text-sm">Get construction finance up to ₹5 Cr. Fast approval, competitive rates for builders.</p>
            </div>
            <Link
              to="/finance"
              className="mt-5 inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              Apply for Finance <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
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
