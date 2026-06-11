import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router";
import {
  Search, ShoppingCart, User, MapPin, ChevronDown, Menu, X,
  Bell, LogOut, Phone, FileText, TrendingUp, Store, ChevronRight,
  Zap, ShieldCheck, BadgeCheck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { clearCustomerSession } from "../lib/authStorage";
import { CitySelection } from "../pages/CitySelection";
import { SearchDropdown } from "./SearchDropdown";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const ANNOUNCEMENTS = [
  { icon: Zap,         text: "Express Delivery Available in 24–48 Hours" },
  { icon: ShieldCheck, text: "StructBay Assured — Quality Verified Products" },
  { icon: BadgeCheck,  text: "GST Invoice on Every Order" },
  { icon: Store,       text: "Trusted Vendor Network Across South India" },
  { icon: TrendingUp,  text: "Bulk Order Discounts Available for 50+ MT" },
];

function AnnouncementSlider() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % ANNOUNCEMENTS.length); setFade(true); }, 300);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const { icon: Icon, text } = ANNOUNCEMENTS[idx];
  return (
    <div className="flex items-center justify-center gap-2 transition-opacity duration-300" style={{ opacity: fade ? 1 : 0 }}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">{text}</span>
    </div>
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
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery);
      setSearchFocused(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      {/* ── Sticky header wrapper ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: "var(--sb-nav)" }}>
        {/* Subtle orange top line */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--sb-orange), transparent)" }} />

        {/* ── Top utility bar ─────────────────────────────────────────────── */}
        <div className="text-white text-xs py-1.5 px-4" style={{ background: "var(--sb-orange)" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="font-semibold hidden sm:block shrink-0">India's Premier B2B Construction Materials Marketplace</span>
            <div className="flex-1 text-center text-xs overflow-hidden">
              <AnnouncementSlider />
            </div>
            <div className="hidden sm:flex gap-4 items-center font-semibold shrink-0">
              <Link to="/blog"    className="hover:opacity-80 transition-opacity">Blog</Link>
              <Link to="/tools/cement-estimator" className="hover:opacity-80 transition-opacity">Cement calculator</Link>
              <Link to="/rfq"     className="hover:opacity-80 transition-opacity">Get RFQ</Link>
              <Link to="/bulk-enquiry" className="hover:opacity-80 transition-opacity">Bulk Enquiry</Link>
              <Link to="/finance" className="hover:opacity-80 transition-opacity">Finance</Link>
              <a href="#"         className="hover:opacity-80 transition-opacity">Vendor Portal</a>
              <a href="tel:+918045678900" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                <Phone className="w-3 h-3" /> Support
              </a>
            </div>
          </div>
        </div>

        {/* ── Main header row ─────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b" style={{ background: "var(--sb-nav)", borderColor: "rgba(55,65,81,0.5)" }}>
          <div className="max-w-7xl mx-auto flex items-center gap-3">

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-xl transition-colors"
              style={{ color: "var(--sb-text-secondary)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
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
                border: "1px solid var(--sb-border)",
                color: "var(--sb-text-primary)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--sb-orange)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--sb-orange-subtle)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--sb-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <MapPin className="w-4 h-4" style={{ color: "var(--sb-orange)" }} />
              <span className="font-medium max-w-[120px] truncate">{city || "All cities"}</span>
              <ChevronDown className="w-3 h-3" style={{ color: "var(--sb-text-muted)" }} />
            </button>

            {/* Categories dropdown */}
            <div className="relative hidden md:block" ref={catRef}>
              <button
                onClick={() => setCatOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm rounded-xl px-3 py-2 transition-all duration-200"
                style={{
                  border: `1px solid ${catOpen ? "var(--sb-orange)" : "var(--sb-border)"}`,
                  color: "var(--sb-text-primary)",
                  background: catOpen ? "var(--sb-orange-subtle)" : "transparent",
                }}
              >
                <Menu className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} style={{ color: "var(--sb-text-muted)" }} />
              </button>

              {catOpen && (
                <div
                  className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl w-56 z-50 py-1.5 animate-scale-in"
                  style={{
                    background: "var(--sb-card)",
                    border: "1px solid var(--sb-border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <Link
                    to="/shop"
                    onClick={() => setCatOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{ color: "var(--sb-orange)", borderBottom: "1px solid var(--sb-border)" }}
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
                        color: isActive ? "var(--sb-orange)" : "var(--sb-text-primary)",
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
            <form onSubmit={handleSearch} className="flex-1 flex items-center">
              <div className="relative w-full" ref={searchRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search cement, steel, paints, tools..."
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    background: "var(--sb-bg-section)",
                    border: `1px solid ${searchFocused ? "var(--sb-orange)" : "var(--sb-border)"}`,
                    color: "var(--sb-text-primary)",
                    boxShadow: searchFocused ? "0 0 0 3px rgba(249,115,22,0.12)" : "none",
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                  style={{ background: "var(--sb-orange)", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-orange-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--sb-orange)")}
                >
                  <Search className="w-4 h-4" />
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
                  style={{ color: "var(--sb-text-muted)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--sb-bg-section)"; e.currentTarget.style.color = "var(--sb-text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sb-text-muted)"; }}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--sb-orange)" }} />
                </button>
              )}

              <NavLink
                to="/cart"
                className="relative p-2 rounded-xl transition-colors"
                style={{ color: "var(--sb-text-muted)" }}
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
                      : { border: "1px solid var(--sb-border)", color: "var(--sb-text-primary)", background: "transparent" }
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
                    style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
                  >
                    {isLoggedIn ? (
                      <>
                        <NavLink
                          to="/dashboard"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          My Dashboard
                        </NavLink>
                        <Link
                          to="/dashboard"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          My Orders
                        </Link>
                        <hr style={{ borderColor: "var(--sb-border)", margin: "4px 0" }} />
                        <button
                          onClick={() => {
                            clearCustomerSession();
                            setUser(null);
                            setIsLoggedIn(false);
                            setUserOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "#f87171" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
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
                          style={{ color: "var(--sb-text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          Login
                        </NavLink>
                        <NavLink
                          to="/register"
                          onClick={() => setUserOpen(false)}
                          className="block px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "var(--sb-text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-bg-section)")}
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
          className="hidden md:block px-4"
          style={{ background: "var(--sb-bg-section)", borderBottom: "1px solid rgba(55,65,81,0.4)" }}
        >
          <div className="max-w-7xl mx-auto flex gap-0 overflow-x-auto scrollbar-none">
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-xs px-4 py-2.5 whitespace-nowrap transition-all duration-200 font-bold border-b-2 -mb-px ${
                  isActive
                    ? "border-[#F97316] text-[#F97316]"
                    : "border-transparent text-[#94A3B8] hover:text-[#F97316] hover:border-[#F97316]/50"
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
                      ? "border-[#F97316] text-[#F97316] font-semibold"
                      : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#F97316]/40"
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
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200"
                style={{ color: "var(--sb-text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-text-muted)")}
              >
                <Zap className="w-3 h-3" /> Cement calc
              </Link>
              <Link
                to="/bulk-enquiry"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200"
                style={{ background: "rgba(249,115,22,0.1)", color: "var(--sb-orange)", border: "1px solid rgba(249,115,22,0.2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--sb-orange)", e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(249,115,22,0.1)", e.currentTarget.style.color = "var(--sb-orange)")}
              >
                <FileText className="w-3 h-3" /> Bulk Enquiry
              </Link>
              <Link
                to="/rfq"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg my-1.5 font-semibold transition-all duration-200"
                style={{ color: "var(--sb-text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-text-muted)")}
              >
                <TrendingUp className="w-3 h-3" /> Concrete RFQ
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* City modal */}
      {cityModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setCityModalOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg animate-scale-in">
            <CitySelection isModal onClose={() => setCityModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/75" onClick={() => setMenuOpen(false)} />
          <div
            className="relative w-72 h-full overflow-y-auto flex flex-col animate-slide-left"
            style={{ background: "var(--sb-nav)", borderRight: "1px solid var(--sb-border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4" style={{ borderBottom: "1px solid var(--sb-border)" }}>
              <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain" />
              <button onClick={() => setMenuOpen(false)} style={{ color: "var(--sb-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => { setCityModalOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-colors w-full text-left"
              style={{ color: "var(--sb-text-primary)", borderBottom: "1px solid var(--sb-border)" }}
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
                    color: isActive ? "var(--sb-orange)" : "var(--sb-text-primary)",
                    borderColor: "var(--sb-orange)",
                    borderBottom: "1px solid rgba(55,65,81,0.2)",
                  })}
                >
                  {cat.name}
                </NavLink>
              ))}
            </div>

            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--sb-border)" }}>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-sm transition-colors"
                    style={{ color: "var(--sb-text-primary)" }}
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
                    style={{ border: "1px solid var(--sb-border)", color: "var(--sb-text-primary)" }}
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
