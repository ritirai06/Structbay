import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router";
import {
  Search, ShoppingCart, User, MapPin, ChevronDown, Menu, X,
  Bell, LogOut, Phone, FileText, TrendingUp, ChevronRight,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { clearCustomerSession } from "../lib/authStorage";
import { CitySelection } from "../pages/CitySelection";
import { SearchDropdown } from "./SearchDropdown";
import { StorefrontPromoModal, shouldShowStorefrontPromoModal } from "./StorefrontPromoModal";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

/** After user picks a city, skips location, or closes the onboarding popup — do not auto-open again. */
const LOCATION_ONBOARDING_DONE_KEY = "sb_location_choice_made";

const MARQUEE_SEGMENTS_DEFAULT = [
  "GST Invoice on Every Order",
  "Additional delivery charges may apply — payable at site where applicable",
  "India's Premier B2B Construction Materials Marketplace",
  "StructBay Assured — Quality Verified Products",
  "Express delivery available in 24–48 hours in select zones",
  "Trusted vendor network across South India",
];

function TopMarquee({ segments }: { segments: string[] }) {
  const line = (segments.length ? segments : MARQUEE_SEGMENTS_DEFAULT).join("     •     ");
  const doubled = `${line}     •     ${line}`;
  return (
    <>
      <style>
        {`
        @keyframes sb-top-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .sb-top-marquee-track {
          display: inline-block;
          white-space: nowrap;
          animation: sb-top-marquee 52s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-top-marquee-track { animation: none; }
        }
      `}
      </style>
      <div className="relative w-full overflow-hidden min-h-[1.35rem] flex items-center" aria-live="polite">
        <div className="sb-top-marquee-track text-sb-cream/95 text-[11px] sm:text-xs font-medium tracking-wide">
          {doubled}
        </div>
      </div>
    </>
  );
}

export function Header() {
  const { city, cityId, cartCount, isLoggedIn, user, setIsLoggedIn, setUser, addRecentSearch } = useApp();
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [catOpen, setCatOpen]             = useState(false);
  const [userOpen, setUserOpen]           = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [categories, setCategories]       = useState<any[]>([]);
  const [storefront, setStorefront]       = useState<Record<string, unknown> | null>(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const navigate  = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const catRef    = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);

  // City-scoped nav (matches customer catalogue: pricing ∩ inventory in that city)
  useEffect(() => {
    const params: Record<string, string> = { status: 'ACTIVE', limit: '100' };
    if (cityId) params.cityId = cityId;
    api
      .getCategories(params)
      .then((res: any) => {
        const list = res?.data;
        if (Array.isArray(list)) setCategories(list);
        else setCategories([]);
      })
      .catch(() => setCategories([]));
  }, [cityId]);

  useEffect(() => {
    api
      .getCmsHomepage()
      .then((data) => setStorefront(data))
      .catch(() => setStorefront(null));
  }, []);

  const promo = (storefront?.storefrontPromo || null) as Record<string, unknown> | null;
  const promoEnabled = promo == null || promo.enabled !== false;
  const topBarStyle = String(promo?.topBarStyle || "center_banner");
  const topBarText = String(promo?.topBarText || "").trim();
  const topBarBg = String(promo?.topBarBg || "#FDE047");
  const topBarTextColor = String(promo?.topBarTextColor || "#171717");
  const marqueeFromCms = Array.isArray(promo?.marqueeSegments)
    ? (promo!.marqueeSegments as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];

  useEffect(() => {
    const p = storefront?.storefrontPromo as Record<string, unknown> | undefined;
    if (!p || p.enabled === false) return;
    if (!p.modalEnabled || !String(p.modalTitle || "").trim()) return;
    if (!shouldShowStorefrontPromoModal(p as any)) return;
    const t = window.setTimeout(() => setPromoModalOpen(true), 1100);
    return () => window.clearTimeout(t);
  }, [storefront]);

  /** First visit: no city, no stored city, and user has not dismissed onboarding — show location popup. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (city || cityId) return;
      if (localStorage.getItem(LOCATION_ONBOARDING_DONE_KEY) === "1") return;
      if (localStorage.getItem("sb_selected_city")) return;
      const t = window.setTimeout(() => setCityModalOpen(true), 400);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, [city, cityId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node))    setCatOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    // Backend global search requires ≥2 chars; match that so results and typeahead stay aligned.
    if (q.length < 2) return;
    addRecentSearch(q);
    setSearchFocused(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <StorefrontPromoModal
        promo={(promo as any) || undefined}
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
      />

      {/* ── Sticky header wrapper ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: "var(--sb-nav)" }}>
        {promoEnabled && topBarText && (
          <div
            className="w-full py-2.5 px-4 text-center text-xs sm:text-sm font-bold tracking-tight border-b border-black/10"
            style={{ background: topBarBg, color: topBarTextColor }}
          >
            {topBarText}
          </div>
        )}

        {/* Subtle orange top line (hidden visually when yellow strip sits flush above — keep for brand when no strip) */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--sb-orange), transparent)" }} />

        {/* ── Top utility bar ─────────────────────────────────────────────── */}
        <div className="text-sb-cream/90 text-xs py-1.5 px-4 border-b border-sb-border-dark bg-sb-nav">
          <div className="max-w-7xl mx-auto flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0 order-2 sm:order-1 sm:pr-2">
              {!(promoEnabled && topBarText && topBarStyle === "center_banner") && (
                <TopMarquee segments={marqueeFromCms} />
              )}
            </div>
            <div className="hidden sm:flex order-1 sm:order-2 gap-4 items-center font-semibold shrink-0 text-sb-cream/90 flex-wrap justify-end">
              <Link to="/blogs"    className="hover:text-sb-orange transition-colors">Blog</Link>
              <Link to="/tools/cement-estimator" className="hover:text-sb-orange transition-colors">Cement calculator</Link>
              <Link to="/rfq"     className="hover:text-sb-orange transition-colors">Get RFQ</Link>
              <Link to="/bulk-enquiry" className="hover:text-sb-orange transition-colors">Bulk Enquiry</Link>
              <Link to="/finance" className="hover:text-sb-orange transition-colors">Finance</Link>
              <a href="#"         className="hover:text-sb-orange transition-colors">Vendor Portal</a>
              <a href="tel:+918045678900" className="flex items-center gap-1 hover:text-sb-orange transition-colors">
                <Phone className="w-3 h-3" /> Support
              </a>
            </div>
          </div>
        </div>

        {/* ── Main header row ─────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-sb-border-dark bg-sb-nav">
          <div className="max-w-7xl mx-auto flex items-center gap-3">

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-xl transition-colors text-[var(--sb-chrome-fg-muted)] hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
            </Link>

            {/* City selector */}
            <button
              onClick={() => setCityModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-sm shrink-0 rounded-xl px-3 py-2 transition-all duration-200"
              style={{
                border: "1px solid var(--sb-chrome-border)",
                color: "var(--sb-chrome-fg)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--sb-orange)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--sb-orange-subtle)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--sb-chrome-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <MapPin className="w-4 h-4" style={{ color: "var(--sb-orange)" }} />
              <span className="font-medium max-w-[120px] truncate">{city || "All cities"}</span>
              <ChevronDown className="w-3 h-3" style={{ color: "var(--sb-chrome-fg-muted)" }} />
            </button>

            {/* Categories dropdown */}
            <div className="relative hidden md:block" ref={catRef}>
              <button
                onClick={() => setCatOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm rounded-xl px-3 py-2 transition-all duration-200"
                style={{
                  border: `1px solid ${catOpen ? "var(--sb-orange)" : "var(--sb-chrome-border)"}`,
                  color: "var(--sb-chrome-fg)",
                  background: catOpen ? "var(--sb-orange-subtle)" : "transparent",
                }}
              >
                <Menu className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} style={{ color: "var(--sb-chrome-fg-muted)" }} />
              </button>

              {catOpen && (
                <div
                  className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl w-56 z-50 py-1.5 animate-scale-in"
                  style={{
                    background: "var(--sb-card)",
                    border: "1px solid var(--sb-border-on-light)",
                    boxShadow: "0 20px 60px rgba(34, 34, 34, 0.12)",
                  }}
                >
                  <Link
                    to="/shop"
                    onClick={() => setCatOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{ color: "var(--sb-orange)", borderBottom: "1px solid var(--sb-border-on-light)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    All Categories <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  {categories.map(cat => (
                    <NavLink
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      onClick={() => setCatOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all duration-150 ${
                          isActive ? "font-semibold" : ""
                        }`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? "var(--sb-orange)" : "var(--sb-text-on-light)",
                        background: isActive ? "var(--sb-orange-subtle)" : "transparent",
                      })}
                      onMouseEnter={e => {
                        const el = e.currentTarget;
                        if (!el.classList.contains("active")) {
                          el.style.background = "var(--sb-orange)";
                          el.style.color = "#fff";
                        }
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget;
                        el.style.background = "";
                        el.style.color = "";
                      }}
                    >
                      {cat.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 flex items-center min-w-0">
              <div className="relative w-full" ref={searchRef}>
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-autocomplete="list"
                  aria-expanded={searchFocused}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search cement, steel, paints, tools..."
                  className="w-full min-w-0 pl-4 pr-14 py-2.5 rounded-full text-sm transition-all duration-200"
                  style={{
                    background: "var(--sb-bg-section)",
                    border: `1px solid ${searchFocused ? "var(--sb-orange)" : "var(--sb-border-on-light)"}`,
                    color: "var(--sb-text-on-light)",
                    boxShadow: searchFocused ? "0 0 0 3px var(--sb-orange-ring)" : "none",
                  }}
                />
                <button
                  type="submit"
                  title="Search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: "var(--sb-orange)", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-orange-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--sb-orange)")}
                >
                  <Search className="w-4 h-4" aria-hidden />
                </button>
                {searchFocused && (
                  <SearchDropdown
                    query={searchQuery}
                    onSelect={() => setSearchFocused(false)}
                    onClose={() => setSearchFocused(false)}
                  />
                )}
              </div>
            </form>

            {/* Right icons */}
            <div className="flex items-center gap-1 shrink-0">
              {isLoggedIn && (
                <button
                  className="relative p-2 rounded-xl transition-colors"
                  style={{ color: "var(--sb-chrome-fg-muted)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--sb-chrome-hover)"; e.currentTarget.style.color = "var(--sb-chrome-fg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sb-chrome-fg-muted)"; }}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--sb-orange)" }} />
                </button>
              )}

              <NavLink
                to="/cart"
                className="relative p-2 rounded-xl transition-colors"
                style={{ color: "var(--sb-chrome-fg-muted)" }}
              >
                {({ isActive }) => (
                  <>
                    <ShoppingCart className="w-5 h-5" style={{ color: isActive ? "var(--sb-orange)" : undefined }} />
                    {cartCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                        style={{ background: "var(--sb-orange)" }}
                      >
                        {cartCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>

              {/* User dropdown */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={
                    isLoggedIn
                      ? { background: "var(--sb-orange)", color: "#fff", boxShadow: "0 2px 10px rgba(249,115,22,0.3)" }
                      : { border: "1px solid var(--sb-chrome-border)", color: "var(--sb-chrome-fg)", background: "transparent" }
                  }
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">
                    {isLoggedIn ? (user?.name?.split(" ")[0] || "Account") : "Login"}
                  </span>
                </button>

                {userOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl w-52 z-50 py-1.5 animate-scale-in"
                    style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border-on-light)", boxShadow: "0 20px 60px rgba(34, 34, 34, 0.12)" }}
                  >
                    {isLoggedIn ? (
                      <>
                        <NavLink
                          to="/dashboard"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-on-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-cream-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          My Dashboard
                        </NavLink>
                        <Link
                          to="/dashboard"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-on-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-cream-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          My Orders
                        </Link>
                        <hr style={{ borderColor: "var(--sb-border-on-light)", margin: "4px 0" }} />
                        <button
                          onClick={() => {
                            clearCustomerSession();
                            setUser(null);
                            setIsLoggedIn(false);
                            setUserOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-on-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-cream-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <NavLink
                          to="/login"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-on-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-cream-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          Login
                        </NavLink>
                        <NavLink
                          to="/register"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-on-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-cream-secondary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          Register
                        </NavLink>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Category nav bar ────────────────────────────────────────────── */}
        <div
          className="hidden md:block px-4 bg-sb-nav border-b border-sb-border-dark"
        >
          <div className="max-w-7xl mx-auto flex gap-0 overflow-x-auto scrollbar-none">
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-xs px-4 py-2.5 whitespace-nowrap transition-all duration-200 font-bold border-b-2 -mb-px ${
                  isActive
                    ? "border-sb-orange text-sb-orange"
                    : "border-transparent text-sb-cream/70 hover:text-sb-orange hover:border-sb-orange/50"
                }`
              }
            >
              All
            </NavLink>
            {categories.map(cat => (
              <NavLink
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className={({ isActive }) =>
                  `text-xs px-4 py-2.5 whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                    isActive
                      ? "border-sb-orange text-sb-orange font-semibold"
                      : "border-transparent text-sb-cream/70 hover:text-sb-cream hover:border-sb-orange/40"
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}

            {/* Right side quick links */}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <Link
                to="/tools/cement-estimator"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200 text-sb-cream/65 hover:text-sb-orange"
              >
                <Zap className="w-3 h-3" /> Cement calc
              </Link>
              <Link
                to="/bulk-enquiry"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200 border border-sb-orange/25 bg-sb-orange/10 text-sb-orange hover:bg-sb-orange hover:text-white hover:border-sb-orange"
              >
                <FileText className="w-3 h-3" /> Bulk Enquiry
              </Link>
              <Link
                to="/rfq"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200 text-sb-cream/65 hover:text-sb-orange"
              >
                <TrendingUp className="w-3 h-3" /> Concrete RFQ
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* City modal — compact premium layout (max 850px / 75vh); backdrop dismiss = onboarding done */}
      {cityModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
          style={{ background: "rgba(34, 34, 34, 0.78)", backdropFilter: "blur(6px)" }}
          onClick={() => {
            try {
              localStorage.setItem(LOCATION_ONBOARDING_DONE_KEY, "1");
            } catch {
              /* ignore */
            }
            setCityModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[680px] max-h-[68vh] flex min-h-0"
          >
            <CitySelection
              isModal
              onClose={() => {
                try {
                  localStorage.setItem(LOCATION_ONBOARDING_DONE_KEY, "1");
                } catch {
                  /* ignore */
                }
                setCityModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/75" onClick={() => setMenuOpen(false)} />
          <div
            className="relative w-72 h-full overflow-y-auto flex flex-col animate-slide-left"
            style={{ background: "var(--sb-nav)", borderRight: "1px solid var(--sb-chrome-border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-sb-border-dark">
              <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain" />
              <button onClick={() => setMenuOpen(false)} style={{ color: "var(--sb-chrome-fg-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => { setCityModalOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-colors w-full text-left"
              style={{ color: "var(--sb-chrome-fg)", borderBottom: "1px solid var(--sb-chrome-border)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin className="w-4 h-4" style={{ color: "var(--sb-orange)" }} /> {city || "All cities"}
            </button>

            <div className="px-4 py-3 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--sb-text-faint)" }}>Categories</p>
              <NavLink
                to="/shop"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-semibold transition-colors"
                style={{ color: "var(--sb-orange)", borderBottom: "1px solid rgba(55,65,81,0.3)" }}
              >
                All Categories
              </NavLink>
              {categories.map(cat => (
                <NavLink
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 py-2.5 text-sm transition-colors ${
                      isActive ? "font-semibold pl-1 border-l-2" : ""
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "var(--sb-orange)" : "var(--sb-chrome-fg)",
                    borderColor: "var(--sb-orange)",
                    borderBottom: "1px solid rgba(55,65,81,0.2)",
                  })}
                >
                  {cat.name}
                </NavLink>
              ))}
            </div>

            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--sb-chrome-border)" }}>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-sm transition-colors"
                    style={{ color: "var(--sb-chrome-fg)" }}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      clearCustomerSession();
                      setUser(null);
                      setIsLoggedIn(false);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: "#f87171" }}
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-center rounded-xl font-bold text-sm text-white"
                    style={{ background: "var(--sb-orange)" }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-center rounded-xl text-sm"
                    style={{ border: "1px solid var(--sb-chrome-border)", color: "var(--sb-chrome-fg)" }}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
