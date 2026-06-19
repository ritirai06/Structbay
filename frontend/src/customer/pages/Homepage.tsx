import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  Shield, Zap, ChevronRight, Star, ArrowRight,
  Truck, HeadphonesIcon, Building2, ShoppingCart,
  TrendingUp, FileText,
  ChevronLeft, MapPin, LayoutGrid, X,
  Package, PaintBucket, Grid3x3, PlugZap, Droplets,
  PanelsTopLeft, Wrench, Hammer, FlaskConical, Fan,
  HardHat, CircleDot, Boxes, Layers, Box, Lightbulb, Shapes,
  Phone, Mail, MessageSquare, User,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import {
  loadHomepageCategories,
  loadHomepageBrands,
  loadHomepageProducts,
} from "../lib/homepageCatalog";
import { TopSellingProductsCarousel } from "../components/TopSellingProductsCarousel";
import { FeaturedBrandsMarquee } from "../components/FeaturedBrandsMarquee";
import { pricingSnapshotFromProduct, resolveUnitPriceFromSnapshot } from "../lib/wholesalePricing";
import { productHref } from "../lib/productRoutes";
import { useCmsPageSeo } from "../hooks/useCmsPageSeo";
import { useFooterCMS } from "@shared/hooks/useFooterCMS";
import { signalOnboardingGatePassed } from "../lib/locationOnboarding";
import iconStatProducts from "/shared/assets/homepage-stats/icon-07.png";
import iconStatContractors from "/shared/assets/homepage-stats/icon-09.png";
import iconStatCities from "/shared/assets/homepage-stats/icon-06.png";

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

/** CMS may save hex without `#`, rgb(), or named colors; invalid values fall through. */
function normalizeCssColor(raw: string | null | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) return `#${s}`;
  if (/^rgba?\(/i.test(s)) return s;
  return s;
}

/** Branded fallback when no CMS / banner image is configured (never show an empty hero). */
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2400&q=82";

const DEFAULT_TAGLINE = "India's premier construction materials marketplace";

const DEFAULT_SUB =
  "Procure cement, steel, paints, electricals, plumbing, hardware, plywood and more from verified vendors across India.";

const INTRO_TITLE = "Smart Construction Starts With Smarter Sourcing";
const INTRO_TAGLINE = "Built for Contractors, Backed by Brands.";
const INTRO_BODY_DEFAULT =
  "StructBay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.";

/** Desktop reference: line break before “the ease of…” */
function IntroBodyText({ text }: { text: string }) {
  const marker = "the ease of single-window";
  const idx = text.indexOf(marker);
  if (idx <= 0) {
    return <p className="sf-intro-body">{text}</p>;
  }
  return (
    <p className="sf-intro-body">
      {text.slice(0, idx).trimEnd()}
      <br className="sf-intro-body__br" aria-hidden />
      {" "}
      {text.slice(idx)}
    </p>
  );
}

const CATEGORIES_SUB =
  "From trusted materials to seamless procurement — StructBay simplifies your construction journey. Explore our wide range of products.";

/** Homepage shows two rows only (5 × 2 on desktop). */
const HOMEPAGE_CATEGORY_LIMIT = 10;

const WHY_CHOOSE_STATS = [
  { icon: iconStatProducts, target: 2000, label: "Products from Top Brands" },
  { icon: iconStatContractors, target: 1000, label: "Trusted Contractors" },
  { icon: iconStatCities, target: 5, label: "Cities Indian Covered" },
] as const;

function useStatsInView(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || active) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active, threshold]);

  return { ref, active };
}

function CountUpValue({
  target,
  active,
  duration,
}: {
  target: number;
  active: boolean;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const animDuration = duration ?? (target <= 50 ? Math.max(2000, target * 400) : 2600);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const startAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startAt) / animDuration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, animDuration]);

  return <>{value.toLocaleString("en-IN")}</>;
}

const FEATURE_CARDS = [
  {
    title: "Genuine Products, Guaranteed",
    desc: "All products are sourced directly from trusted manufacturers, ensuring authentic quality at competitive prices.",
    icon: Box,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    buttonText: "SHOP NOW",
  },
  {
    title: "Unmatched Affordability",
    desc: "Premium construction materials supplied at factory-direct rates, delivering exceptional quality at competitive prices.",
    icon: Lightbulb,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    buttonText: "SHOP NOW",
  },
  {
    title: "A to Z Material Availability",
    desc: "Complete range of construction essentials available in one place, ensuring convenience at competitive prices.",
    icon: Shapes,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    buttonText: "SHOP NOW",
  },
] as const;

const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  box: Box,
  lightbulb: Lightbulb,
  shapes: Shapes,
  shield: Shield,
  package: Package,
  building: Building2,
};

type ResolvedFeatureCard = {
  title: string;
  desc: string;
  icon: LucideIcon;
  image: string;
  href: string;
  buttonText: string;
};

function resolveIntroSection(cms: Record<string, unknown>, footerDesc: string) {
  const intro = (cms.introSection || {}) as Record<string, string>;
  return {
    title: String(intro.title || "").trim() || INTRO_TITLE,
    tagline: String(intro.tagline || "").trim() || INTRO_TAGLINE,
    body: String(intro.body || "").trim() || footerDesc || INTRO_BODY_DEFAULT,
  };
}

function resolveFeatureCards(cms: Record<string, unknown>): ResolvedFeatureCard[] {
  const raw = cms.featureCards;
  if (!Array.isArray(raw) || raw.length === 0) {
    return FEATURE_CARDS.map((c) => ({ ...c }));
  }
  return raw
    .filter((c: any) => c && c.isActive !== false && (String(c.title || "").trim() || String(c.description || "").trim()))
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c: any, i: number) => {
      const fallback = FEATURE_CARDS[Math.min(i, FEATURE_CARDS.length - 1)];
      const iconKey = String(c.icon || "box").toLowerCase();
      return {
        title: String(c.title || "").trim() || fallback.title,
        desc: String(c.description || "").trim() || fallback.desc,
        image: String(c.imageUrl || "").trim() || fallback.image,
        href: String(c.buttonLink || "").trim() || fallback.href,
        buttonText: String(c.buttonText || "").trim() || fallback.buttonText,
        icon: FEATURE_ICON_MAP[iconKey] || fallback.icon,
      };
    });
}

function HomeContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cms/contact/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : "Could not send your message. Please try again.";
        setStatus({ type: "err", text: msg });
        return;
      }
      setStatus({
        type: "ok",
        text: typeof data.message === "string" ? data.message : "Message sent successfully!",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus({
        type: "err",
        text: `Could not reach the server. You can email us at ${fallbackEmail}.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="sf-contact-form" onSubmit={(e) => void handleSubmit(e)}>
      {status && (
        <p
          className={`text-sm rounded-lg px-3 py-2 mb-1 ${
            status.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          role="status"
        >
          {status.text}
        </p>
      )}
      <div className="sf-field">
        <User className="w-4 h-4" aria-hidden />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name..." required />
      </div>
      <div className="sf-field">
        <Mail className="w-4 h-4" aria-hidden />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address..." required />
      </div>
      <div className="sf-field">
        <MessageSquare className="w-4 h-4" aria-hidden />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject..." />
      </div>
      <div className="sf-field sf-field--area">
        <MessageSquare className="w-4 h-4" aria-hidden />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your Message" required />
      </div>
      <button type="submit" className="sf-send-outline" disabled={loading}>
        {loading ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

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
  backgroundColor: string | null;
  textAlign: "left" | "center" | "right";
};

type HeroTextAlign = HeroSlide["textAlign"];

function parseHeroTextAlign(raw: unknown): HeroTextAlign {
  const v = String(raw || "right").toLowerCase();
  if (v === "left" || v === "center" || v === "right") return v;
  return "right";
}

/** Rotating defaults when no CMS banners are configured yet. */
const DEFAULT_HERO_SLIDES: Omit<HeroSlide, "id">[] = [
  {
    imageUrl: DEFAULT_HERO_IMAGE,
    title: "Build Better.\nBuild Smarter.",
    sub: DEFAULT_SUB,
    shopLabel: "Shop Now",
    shopHref: "/shop",
    secondaryHref: "/rfq",
    overlayOpacity: null,
    titleColor: null,
    subtitleColor: null,
    backgroundColor: null,
    textAlign: "right",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2400&q=82",
    title: "Trusted Materials.\nVerified Vendors.",
    sub: "Procure cement, steel, paints, and hardware from one B2B marketplace.",
    shopLabel: "Start Procuring",
    shopHref: "/shop",
    secondaryHref: "/rfq",
    overlayOpacity: null,
    titleColor: null,
    subtitleColor: null,
    backgroundColor: null,
    textAlign: "right",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=2400&q=82",
    title: "Express Delivery.\nBulk Orders Welcome.",
    sub: "City-wise pricing, GST billing, and dispatch tracking for every order.",
    shopLabel: "Get Quote",
    shopHref: "/rfq",
    secondaryHref: "/shop",
    overlayOpacity: null,
    titleColor: null,
    subtitleColor: null,
    backgroundColor: null,
    textAlign: "right",
  },
];

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

  const mapBanner = (b: any, i: number, { useCmsFallbacks = false } = {}): HeroSlide => {
    const img = (b.image?.url || b.imageUrl || "").trim() || cmsBg || DEFAULT_HERO_IMAGE;
    const titleRaw = String(b.title || "").trim();
    const title = useCmsFallbacks
      ? (titleRaw.length >= 3 ? titleRaw : cmsTitle || defaultTitle)
      : titleRaw;
    const bannerSub = [b.subtitle, b.description]
      .map((x: any) => String(x || "").trim())
      .filter(Boolean)
      .join(" — ");
    const sub = useCmsFallbacks
      ? (bannerSub || cmsSub || DEFAULT_SUB)
      : bannerSub;
    return {
      id: String(b._id || `slide-${i}`),
      imageUrl: img,
      title,
      sub,
      shopLabel: String(b.buttonText || "").trim() || (useCmsFallbacks ? cmsCta : ""),
      shopHref: String(b.buttonLink || "/shop").trim() || "/shop",
      secondaryHref: "/rfq",
      overlayOpacity: b.overlayOpacity ?? null,
      titleColor: b.titleColor || null,
      subtitleColor: b.subtitleColor || null,
      backgroundColor: b.backgroundColor || null,
      textAlign: parseHeroTextAlign(b.textAlign),
    };
  };

  if (live.length > 0) {
    const slides = live
      .sort((a: any, b: any) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
      .map((b: any, i: number) => mapBanner(b, i));
    return slides;
  }

  const cmsBannerRows = Array.isArray(cms.homepageBanners) ? cms.homepageBanners : [];
  const fromCmsHome = cmsBannerRows
    .filter((b: any) => b && b.isActive !== false && String(b.imageUrl || "").trim())
    .sort((a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((b: any, i: number) => mapBanner({
      _id: `cms-home-${i}`,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      buttonLink: b.linkUrl,
      buttonText: null,
      overlayOpacity: null,
    }, i, { useCmsFallbacks: true }));

  if (fromCmsHome.length > 0) return fromCmsHome;

  if (cmsBg || cmsTitle) {
    return [
      {
        id: "fallback-cms",
        imageUrl: cmsBg || DEFAULT_HERO_IMAGE,
        title: cmsTitle || defaultTitle,
        sub: cmsSub || DEFAULT_SUB,
        shopLabel: cmsCta,
        shopHref: "/shop",
        secondaryHref: "/rfq",
        overlayOpacity: null,
        titleColor: null,
        subtitleColor: null,
        backgroundColor: null,
        textAlign: "right",
      },
    ];
  }

  return DEFAULT_HERO_SLIDES.map((s, i) => ({ ...s, id: `default-${i}` }));
}

/** Optional CMS overlay — only when `overlayOpacity` is set above 0. */
function heroReadableOverlay(
  opacityPct: number | null | undefined,
  align: HeroTextAlign = "right"
): CSSProperties | null {
  if (opacityPct == null || !Number.isFinite(Number(opacityPct)) || Number(opacityPct) <= 0) {
    return null;
  }
  const pct = Math.min(100, Math.max(0, Number(opacityPct)));
  const strength = 0.42 + (pct / 100) * 0.38;
  const mid = strength * 0.62;
  const soft = Math.min(0.88, strength);
  const fade = 0.22;
  const tail = 0.05;

  if (align === "center") {
    return {
      background: `linear-gradient(90deg, rgba(2,6,23,${tail}) 0%, rgba(2,6,23,${mid}) 22%, rgba(2,6,23,${soft}) 50%, rgba(2,6,23,${mid}) 78%, rgba(2,6,23,${tail}) 100%)`,
    };
  }
  if (align === "right") {
    return {
      background: `linear-gradient(285deg, rgba(2,6,23,${soft}) 0%, rgba(15,23,42,${mid}) 40%, rgba(15,23,42,${fade}) 68%, rgba(2,6,23,${tail}) 100%)`,
    };
  }
  return {
    background: `linear-gradient(105deg, rgba(2,6,23,${soft}) 0%, rgba(15,23,42,${mid}) 45%, rgba(15,23,42,${fade}) 72%, rgba(2,6,23,${tail}) 100%)`,
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
  return { line1: t, line2: null };
}

function StructBayHero({
  rawBanners,
  cms,
}: {
  rawBanners: any[];
  cms: Record<string, unknown>;
  city: string | null;
  cityId: string | null;
}) {
  const slides = buildHeroSlides(rawBanners, cms);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const n = slides.length;
  const slide = slides[Math.min(current, n - 1)] || slides[0];
  const hasTitle = Boolean(String(slide.title || "").trim());
  const hasSub = Boolean(String(slide.sub || "").trim());
  const { line1, line2 } = hasTitle ? parseHeroTitle(slide.title) : { line1: "", line2: null };

  useEffect(() => {
    setCurrent((c) => Math.min(c, Math.max(n - 1, 0)));
  }, [n]);

  const goTo = useCallback(
    (index: number) => {
      if (n === 0) return;
      setCurrent(((index % n) + n) % n);
    },
    [n]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (n < 2 || paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % n);
    }, 5500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [n, paused]);

  const titleColor = normalizeCssColor(slide.titleColor) || "#ffffff";
  const subColor = normalizeCssColor(slide.subtitleColor) || "rgba(255,255,255,0.88)";
  const bgColor = normalizeCssColor(slide.backgroundColor) || "transparent";
  const align = slide.textAlign;

  return (
    <section
      className="sf-hero-ref"
      style={bgColor !== "transparent" ? { backgroundColor: bgColor } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Homepage banners"
    >
      <div className="sf-hero-ref__slides">
        {slides.map((s, i) => {
          const overlayStyle = heroReadableOverlay(s.overlayOpacity, s.textAlign);
          const isActive = i === current;
          return (
            <div
              key={s.id}
              className={`sf-hero-ref__slide${isActive ? " sf-hero-ref__slide--active" : ""}`}
              aria-hidden={!isActive}
            >
              <img
                src={s.imageUrl}
                alt=""
                className="sf-hero-ref__img"
                loading={i === 0 ? "eager" : "lazy"}
              />
              {overlayStyle ? (
                <div className="sf-hero-ref__overlay" style={overlayStyle} aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>

      {(hasTitle || hasSub) && (
        <div
          className={`sf-hero-ref__copy sf-hero-ref__copy--${align}`}
          key={slide.id}
          style={
            {
              "--hero-title-color": titleColor,
              "--hero-sub-color": subColor,
            } as CSSProperties
          }
        >
          {hasTitle && (
            <h1>
              <span>{line1}</span>
              {line2 ? (
                <>
                  <br />
                  <span>{line2}</span>
                </>
              ) : null}
            </h1>
          )}
          {hasSub && <p className="line-clamp-3">{slide.sub}</p>}
        </div>
      )}

      {n > 1 && (
        <>
          <button type="button" onClick={prev} className="sf-hero-arrow sf-hero-arrow--left" aria-label="Previous banner">
            <ChevronLeft />
          </button>
          <button type="button" onClick={next} className="sf-hero-arrow sf-hero-arrow--right" aria-label="Next banner">
            <ChevronRight />
          </button>
          <div className="sf-hero-dots" role="tablist" aria-label="Banner slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => goTo(i)}
                className={`sf-hero-dot ${i === current ? "sf-hero-dot--active" : ""}`}
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
function ProductCard({ product, compact = false }: { product: any; compact?: boolean }) {
  const { addToCart, city } = useApp();
  const price = product.pricing?.salePrice || product.pricing?.regularPrice || 0;
  const mrp = product.pricing?.regularPrice || price;
  const discount = mrp && price < mrp ? Math.round((1 - price / mrp) * 100) : 0;
  const image = Array.isArray(product.images) ? product.images[0]?.url : product.image;
  const slug = product.slug || product._id;
  const brandName = product.brand?.name || product.brand || "";

  return (
    <div className={`sb-product-card group${compact ? " sb-product-card--compact" : ""}`}>
      <Link to={productHref(slug)} className="relative aspect-square overflow-hidden bg-gray-50 block">
        {image && <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
        <div className={`absolute top-1.5 left-1.5 flex gap-1 flex-col${compact ? " scale-90 origin-top-left" : ""}`}>
          {product.isAssured && (
            <span className="badge-pending sb-status-badge gap-1">
              <Shield className="w-2.5 h-2.5" /> Assured
            </span>
          )}
          {product.isExpress && (
            <span className="badge-processing sb-status-badge gap-1">
              <Zap className="w-2.5 h-2.5" /> Express
            </span>
          )}
        </div>
        {discount > 0 && (
          <div className={`absolute top-1.5 right-1.5 badge-processing sb-status-badge font-bold${compact ? " text-[10px] px-1.5 py-0.5" : ""}`}>-{discount}%</div>
        )}
      </Link>
      <div className={compact ? "p-2.5" : "p-4"}>
        <p className={`text-sb-text-secondary${compact ? " text-[10px]" : " text-xs"}`}>{brandName}</p>
        <h3 className={`font-semibold text-sb-ink line-clamp-2 mt-0.5 leading-snug${compact ? " text-xs" : " text-sm"}`}>{product.name}</h3>
        {city && (
          <p className={`text-sb-text-secondary mt-0.5 flex items-center gap-1${compact ? " text-[10px]" : " text-xs"}`}>
            <MapPin className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> {city} price
          </p>
        )}
        <div className="flex items-baseline gap-1.5 mt-1.5">
          {price > 0 ? (
            <>
              <span className={`font-bold text-sb-orange${compact ? " text-base" : " text-lg"}`}>₹{price.toLocaleString()}</span>
              {discount > 0 && <span className={`text-sb-text-secondary line-through${compact ? " text-[10px]" : " text-xs"}`}>₹{mrp.toLocaleString()}</span>}
            </>
          ) : (
            <span className={`text-sb-text-secondary${compact ? " text-[10px]" : " text-xs"}`}>Price on request</span>
          )}
        </div>
        {price > 0 && <p className={`text-sb-text-secondary mt-0.5${compact ? " text-[9px]" : " text-[10px]"}`}>excl. GST · GST at checkout</p>}
        <button
          onClick={() => {
            const snap = pricingSnapshotFromProduct(product, null);
            addToCart({
              id: `${String(slug)}::base`,
              productSlug: String(slug),
              name: product.name,
              brand: brandName,
              price: snap ? resolveUnitPriceFromSnapshot(snap, 1) : price,
              qty: 1,
              unit: product.unit || "unit",
              image,
              pricingSnapshot: snap || undefined,
              gstPercentage: Number.isFinite(Number(product.gstPercentage))
                ? Number(product.gstPercentage)
                : 18,
            });
          }}
          className={`btn-primary w-full justify-center${compact ? " mt-2 py-1.5 text-xs" : " mt-3 py-2.5 text-sm"}`}
        >
          <ShoppingCart className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} /> Add to Cart
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
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [blogs, setBlogs]               = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsReady, setAnnouncementsReady] = useState(false);
  const [cmsHome, setCmsHome] = useState<Record<string, unknown>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);

  const dismissAnnouncements = useCallback(() => {
    const ids = announcements.map((a: any) => String(a._id));
    if (ids.length) dismissAnnouncementsForToday(ids);
    setAnnouncements([]);
    setAnnouncementsReady(false);
    signalOnboardingGatePassed();
  }, [announcements]);

  useEffect(() => {
    if (announcements.length === 0 || !announcementsReady) return;
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
  }, [announcements.length, announcementsReady, dismissAnnouncements]);

  // CMS hero + static blocks (not warehouse-specific).
  useEffect(() => {
    void api
      .getCmsHomepage()
      .then((d) => setCmsHome(d && typeof d === "object" ? (d as Record<string, unknown>) : {}))
      .catch(() => setCmsHome({}));

    api.getActiveBanners()
      .then((d) => {
        const live = (d.data || [])
          .filter((b: any) => b.status !== "INACTIVE" && b.isLive !== false)
          .sort((a: any, b: any) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
        setBanners(live);
      })
      .catch(() => {});

    api.getTestimonials()
      .then((d) => setTestimonials(d.data || []))
      .catch(() => {});

    api.getBlogs(3)
      .then((d) => setBlogs(d.data || []))
      .catch(() => {});
  }, []);

  // Announcements for all visitors (including before city is chosen).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/cms/announcements?status=ACTIVE&liveOnly=true&limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.success || !Array.isArray(d.data)) {
          signalOnboardingGatePassed();
          return;
        }
        const forCustomers = d.data.filter((a: any) => {
          const aud = a.audience;
          if (!aud || !Array.isArray(aud) || aud.length === 0) return true;
          return aud.includes("ALL") || aud.includes("CUSTOMER");
        });
        const visible = forCustomers.filter((a: any) => !isAnnouncementDismissedToday(String(a._id)));
        setAnnouncements(visible);
        if (visible.length > 0) {
          setAnnouncementsReady(true);
        } else {
          signalOnboardingGatePassed();
        }
      })
      .catch(() => {
        if (!cancelled) signalOnboardingGatePassed();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Catalog sections: CMS featured → city-scoped → all ACTIVE (see homepageCatalog.ts).
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);

    void (async () => {
      try {
        const [cats, brandRows, productRows] = await Promise.all([
          loadHomepageCategories(cmsHome, cityId, HOMEPAGE_CATEGORY_LIMIT),
          loadHomepageBrands(cityId, 24),
          loadHomepageProducts(cityId, 12),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setBrands(brandRows);
        setTopProducts(productRows);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[Homepage] catalog load failed", err);
        }
        if (!cancelled) {
          setCategories([]);
          setBrands([]);
          setTopProducts([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityId, cmsHome]);

  const categoriesForHome = useMemo(
    () =>
      [...categories]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)))
        .slice(0, HOMEPAGE_CATEGORY_LIMIT),
    [categories]
  );

  const showHomeFinance = import.meta.env.VITE_SHOW_HOME_FINANCE !== "false";
  const { data: footerCms } = useFooterCMS();

  const mapQuery = encodeURIComponent(footerCms.address || "India");

  const introContent = useMemo(
    () => resolveIntroSection(cmsHome, footerCms.companyDescription),
    [cmsHome, footerCms.companyDescription]
  );
  const featureCards = useMemo(() => resolveFeatureCards(cmsHome), [cmsHome]);
  const { ref: statsRef, active: statsAnimate } = useStatsInView();

  return (
    <div className="min-h-screen">
      {announcementsReady && announcements.length > 0 && (
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
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-sb-ink/12 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-sb-ink/10 shrink-0">
              <p id="announcement-dialog-title" className="text-sm font-bold text-sb-ink tracking-[0.14em]">
                ANNOUNCEMENT
              </p>
              <button
                type="button"
                onClick={dismissAnnouncements}
                className="shrink-0 w-10 h-10 rounded-xl border border-sb-ink/12 bg-white hover:bg-black/5 flex items-center justify-center text-sb-ink-muted hover:text-sb-ink transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-0 sm:px-1 py-3 overflow-y-auto flex-1 space-y-3 bg-white/60">
              {announcements.map((a) =>
                a.image?.url ? (
                  <div key={a._id} className="w-full overflow-hidden rounded-xl border border-sb-ink/8 bg-white">
                    <img
                      src={a.image.url}
                      alt={typeof a.title === "string" ? a.title : ""}
                      className="w-full max-h-[min(72vh,560px)] object-contain object-center"
                    />
                  </div>
                ) : (
                  <div
                    key={a._id}
                    className="rounded-xl border border-dashed border-sb-ink/15 bg-white px-4 py-3 text-center"
                  >
                    <p className="text-sm text-sb-ink-muted">{typeof a.title === "string" ? a.title : "Announcement"}</p>
                  </div>
                )
              )}
            </div>
            <div className="px-5 py-4 border-t border-sb-ink/10 bg-white shrink-0">
              <button
                type="button"
                onClick={dismissAnnouncements}
                className="w-full py-3 rounded-xl bg-[#E85A00] hover:bg-[#CC4E00] text-sb-on-orange text-sm font-bold transition-colors shadow-[0_4px_20px_rgba(232, 90, 0,0.25)]"
              >
                Got it, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Carousel ──────────────────────────────────────────────────── */}
      <StructBayHero rawBanners={banners} cms={cmsHome} city={city} cityId={cityId} />

      {/* ── Intro + feature cards (reference layout) ─────────────────────── */}
      <section className="sf-dot-grid sf-intro" id="about">
        <div className="sf-intro__inner">
          <h2>{introContent.title}</h2>
          <p className="sf-intro-tagline">{introContent.tagline}</p>
          <IntroBodyText text={introContent.body} />
        </div>
        <div className="sf-features-grid">
          {featureCards.map(({ title, desc, icon: Icon, image, href, buttonText }) => (
            <div key={title} className="sf-feature-card" style={{ backgroundImage: `url(${image})` }}>
              <div className="sf-feature-card__overlay">
                <Icon className="sf-feature-card__icon" strokeWidth={1.15} aria-hidden />
                <div className="sf-feature-card__body">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <Link to={href} className="sf-btn-orange sf-feature-card__btn">{buttonText}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Our Categories (reference layout — API data) ─────────────────── */}
      {(catalogLoading || categoriesForHome.length > 0) && (
        <section className="sf-categories-section" id="categories">
          <h2 className="sf-categories-title">Our Categories</h2>
          <p className="sf-categories-sub">{CATEGORIES_SUB}</p>
          {catalogLoading && categoriesForHome.length === 0 ? (
            <p className="text-center text-sm text-sb-ink-muted/70 py-8">Loading categories…</p>
          ) : (
          <div className="sf-cat-grid">
            {categoriesForHome.map((cat) => {
              const Icon = categoryAccentIcon(cat);
              return (
                <Link key={cat.slug} to={`/category/${cat.slug}`} className="sf-cat-tile group">
                  <div className="sf-cat-tile__img-wrap">
                    {cat.image?.url ? (
                      <img src={cat.image.url} alt={cat.name} loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Icon className="w-9 h-9 text-sb-orange/80" aria-hidden />
                      </div>
                    )}
                  </div>
                  <span className="sf-cat-tile__label">{cat.name}</span>
                </Link>
              );
            })}
          </div>
          )}
        </section>
      )}


 {/* ── Featured brands (logo carousel) ─────────────────────────────────── */}
      {(catalogLoading || brands.length > 0) && (
        <section className="sf-brands-section py-16 sm:py-20 px-3 sm:px-5 lg:px-6 xl:px-8 border-y border-[#E85A00]/15" aria-label="Featured brands">
          <div className="max-w-screen-2xl mx-auto w-full">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-sb-ink">Featured Brands</h2>
              <p className="sf-brands-section__subtitle text-sm sm:text-base mt-2 max-w-2xl mx-auto">
                Authorized partners for India&apos;s top construction brands
              </p>
            </div>
            {catalogLoading && brands.length === 0 ? (
              <p className="text-center text-sm text-sb-ink/80 py-8">Loading brands…</p>
            ) : (
              <FeaturedBrandsMarquee brands={brands} />
            )}
          </div>
        </section>
      )}
      
      {/* ── Why StructBay? ─────────────────────────────────────────────────── */}
      <section className="sf-dot-grid border-y border-black/8 py-14 px-4">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <h2 className="text-sb-ink text-3xl font-black mb-3">Why Choose StructBay?</h2>
          <p className="text-sb-ink-muted/70 text-sm leading-relaxed max-w-2xl mx-auto mb-6">
            {footerCms.companyDescription}
          </p>
          {/* <Link
            to="/rfq"
            className="inline-flex items-center gap-2 border-2 border-sb-ink/12 text-sb-ink px-6 py-2.5 rounded-xl font-bold hover:bg-[#E85A00] hover:border-[#E85A00] hover:text-sb-on-orange transition-all"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link> */}
        </div>
        <div ref={statsRef} className="sf-stats max-w-4xl mx-auto">
          {WHY_CHOOSE_STATS.map(({ icon, target, label }) => (
            <div key={label} className="sf-stat-item">
              <img src={icon} alt="" className="sf-stat-icon-img" loading="lazy" />
              <div className="sf-stat-value-row" aria-label={`${target.toLocaleString("en-IN")}+`}>
                <span className="sf-stat-value">
                  <CountUpValue target={target} active={statsAnimate} />
                  <span className="sf-stat-plus" aria-hidden>+</span>
                </span>
              </div>
              <p className="sf-stat-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Selling Products ───────────────────────────────────────────── */}
      {(catalogLoading || topProducts.length > 0) && (
        <section className="sf-dot-grid py-16 px-3 sm:px-5 lg:px-6 xl:px-8" aria-label="Top selling products">
          <div className="max-w-screen-2xl mx-auto w-full">
            <div className="text-center mb-11 sm:mb-12">
              <h2 className="text-sb-ink">Top Selling Products</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">
                {city ? `Best deals in ${city}` : "Browse our latest construction materials"}
              </p>
            </div>
            {catalogLoading && topProducts.length === 0 ? (
              <p className="text-center text-sm text-sb-ink-muted/70 py-8">Loading products…</p>
            ) : (
              <TopSellingProductsCarousel
                products={topProducts}
                renderProduct={(p) => <ProductCard product={p} compact />}
              />
            )}
          </div>
        </section>
      )}

     

      {/* ── CTA Banners Row ────────────────────────────────────────────────── */}
      <section
        className={`max-w-7xl mx-auto px-4 py-12 grid gap-5 ${showHomeFinance ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col justify-between hover:border-[#E85A00]/40 transition-colors shadow-sm">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#E85A00]/15 border border-[#E85A00]/20"><Building2 className="w-5 h-5 text-[#E85A00]" /></div>
            <h3 className="text-sb-ink mb-2">Bulk Orders</h3>
            <p className="text-sb-ink-muted/60 text-sm">Get exclusive pricing for orders above 100 MT. Dedicated account manager included.</p>
          </div>
          <Link to="/bulk-enquiry" className="mt-5 inline-flex items-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Request Bulk Pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col justify-between hover:border-[#E85A00]/40 transition-colors shadow-sm">
          <div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#E85A00]/15 border border-[#E85A00]/20"><FileText className="w-5 h-5 text-[#E85A00]" /></div>
            <h3 className="text-sb-ink mb-2">Concrete RFQ</h3>
            <p className="text-sb-ink-muted/60 text-sm">Get instant quotes for Ready Mix Concrete. Specify grade, quantity, and delivery address.</p>
          </div>
          <Link to="/rfq" className="mt-5 inline-flex items-center gap-2 bg-transparent border border-[#E85A00]/50 hover:bg-[#E85A00] text-[#E85A00] hover:text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            Get Concrete Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {showHomeFinance && (
          <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col justify-between hover:border-[#E85A00]/40 transition-colors shadow-sm">
            <div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#E85A00]/15 border border-[#E85A00]/20">
                <TrendingUp className="w-5 h-5 text-[#E85A00]" />
              </div>
              <h3 className="text-sb-ink mb-2">StructBay Finance</h3>
              <p className="text-sb-ink-muted/60 text-sm">Get construction finance up to ₹5 Cr. Fast approval, competitive rates for builders.</p>
            </div>
            <Link
              to="/finance"
              className="mt-5 inline-flex items-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] text-sb-on-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              Apply for Finance <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Blog ───────────────────────────────────────────────────────────── */}
      {blogs.length > 0 && (
        <section className="sf-dot-grid max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-sb-ink">Construction Guides & Insights</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Expert knowledge for smarter procurement</p>
            </div>
            <Link to="/blogs" className="flex items-center gap-1 text-sm font-semibold text-[#E85A00] hover:text-[#CC4E00] transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {blogs.map(blog => (
              <Link
                key={blog._id || blog.slug}
                to={`/blogs/${blog.slug}`}
                className="bg-white border border-black/10 rounded-2xl overflow-hidden hover:border-[#E85A00]/40 hover:shadow-[0_4px_24px_rgba(232, 90, 0,0.1)] transition-all group shadow-sm"
              >
                <div className="aspect-video overflow-hidden">
                  {blog.featuredImage?.url
                    ? <img src={blog.featuredImage.url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full bg-gray-100" />
                  }
                </div>
                <div className="p-4">
                  {blog.category && <span className="text-xs font-bold uppercase tracking-wide text-[#E85A00]">{blog.category}</span>}
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
        <section className="sf-dot-grid border-y border-black/8 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-sb-ink">What Our Customers Say</h2>
              <p className="text-sb-ink-muted/60 text-sm mt-1">Trusted by builders and contractors across India</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {testimonials.map(t => (
                <div key={t._id} className="bg-white border border-black/10 rounded-2xl p-6 hover:border-[#E85A00]/30 transition-colors shadow-sm">
                  <div className="flex mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#E85A00] text-[#E85A00]" />
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

      {/* ── Contact Us (footer CMS) ────────────────────────────────────────── */}
      <section className="sf-dot-grid py-16 px-4" id="contact">
        <div className="sf-section-heading">
          <h2>Contact Us</h2>
          <p className="sf-sub">Keep In Touch</p>
        </div>
        <div className="max-w-5xl mx-auto sf-contact-cards mb-12">
          <div className="sf-contact-card">
            <Phone className="w-8 h-8 mx-auto text-gray-500" />
            <h3>Call Us</h3>
            <p>{footerCms.phone}</p>
          </div>
          <div className="sf-contact-card">
            <Mail className="w-8 h-8 mx-auto text-gray-500" />
            <h3>Email Us</h3>
            <p>{footerCms.email}</p>
          </div>
          <div className="sf-contact-card">
            <MapPin className="w-8 h-8 mx-auto text-gray-500" />
            <h3>Address</h3>
            <p>{footerCms.address}</p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto sf-contact-split">
          <HomeContactForm fallbackEmail={footerCms.email} />
          <div className="min-h-[320px] bg-gray-100">
            <iframe
              title="StructBay office location"
              className="w-full h-full min-h-[320px] border-0"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
