import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Link, useNavigate } from "react-router";
import {
  Search, ShoppingCart, User, MapPin, ChevronDown, Menu, X,
  Bell, LogOut, Phone, FileText, TrendingUp, Store, ChevronRight,
  Zap, ShieldCheck, BadgeCheck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/categories";
import { CitySelection } from "../pages/CitySelection";
import { SearchDropdown } from "./SearchDropdown";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const ANNOUNCEMENTS = [
  { icon: Zap,         text: "Express Delivery Available in 24-48 Hours" },
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
      setTimeout(() => {
        setIdx(i => (i + 1) % ANNOUNCEMENTS.length);
        setFade(true);
      }, 300);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const ann = ANNOUNCEMENTS[idx];
  const Icon = ann.icon;

  return (
    <div
      className="flex items-center justify-center gap-2 transition-opacity duration-300"
      style={{ opacity: fade ? 1 : 0 }}
    >
      <Icon className="w-3.5 h-3.5 text-[#0D0D0D] shrink-0" />
      <span className="font-medium text-[#0D0D0D]">{ann.text}</span>
    </div>
  );
}

export function Header() {
  const { city, cartCount, isLoggedIn, user, setIsLoggedIn, addRecentSearch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setSearchFocused(false);
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
      <header className="sticky top-0 z-50 bg-[#0D0D0D] border-b border-white/8 shadow-[0_2px_20px_rgba(0,0,0,0.6)]">

        {/* ── Top utility bar ───────────────────────────────────────────── */}
        <div className="bg-[#FE5E00] text-[#0D0D0D] text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left */}
            <span className="font-semibold hidden sm:block shrink-0">
              India's Premier B2B Construction Materials Marketplace
            </span>
            {/* Center — announcement slider */}
            <div className="flex-1 text-center text-xs overflow-hidden">
              <AnnouncementSlider />
            </div>
            {/* Right links */}
            <div className="hidden sm:flex gap-4 items-center font-semibold shrink-0">
              <Link to="/blog"    className="hover:opacity-75 transition-opacity">Blog</Link>
              <Link to="/rfq"     className="hover:opacity-75 transition-opacity">Get RFQ</Link>
              <Link to="/finance" className="hover:opacity-75 transition-opacity">Finance</Link>
              <a href="#"         className="hover:opacity-75 transition-opacity">Vendor Registration</a>
              <a href="tel:+918045678900" className="flex items-center gap-1 hover:opacity-75 transition-opacity">
                <Phone className="w-3 h-3" /> Support
              </a>
            </div>
          </div>
        </div>

        {/* ── Main header row ────────────────────────────────────────────── */}
        <div className="bg-[#0D0D0D] px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-3">

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-[#222222] text-[#D4C4A8] transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
            </Link>

            {/* City selector button → opens modal */}
            <button
              onClick={() => setCityModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-sm shrink-0 border border-white/15 rounded-lg px-3 py-2 hover:border-[#FE5E00] transition-colors text-[#F4E9D8]"
            >
              <MapPin className="w-4 h-4 text-[#FE5E00]" />
              <span className="font-medium max-w-[96px] truncate">{city || "Select City"}</span>
              <ChevronDown className="w-3 h-3 text-[#D4C4A8]" />
            </button>

            {/* Categories dropdown */}
            <div className="relative hidden md:block" ref={catRef}>
              <button
                onClick={() => setCatOpen(v => !v)}
                className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 transition-colors text-[#F4E9D8] ${
                  catOpen ? "border-[#FE5E00] bg-[#FE5E00]/8" : "border-white/15 hover:border-[#FE5E00]"
                }`}
              >
                <Menu className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown className={`w-3 h-3 text-[#D4C4A8] transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-[#222222] border border-white/15 rounded-xl shadow-2xl w-56 z-50 py-1.5">
                  <Link
                    to="/shop"
                    onClick={() => setCatOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FE5E00] hover:bg-[#2A2A2A] transition-colors border-b border-white/8 mb-1"
                  >
                    All Categories <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  {CATEGORIES.map(cat => (
                    <NavLink
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      onClick={() => setCatOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-[#FE5E00]/15 text-[#FE5E00] font-semibold"
                            : "text-[#F4E9D8] hover:bg-[#FE5E00] hover:text-[#0D0D0D]"
                        }`
                      }
                    >
                      {cat.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 flex items-center">
              <div className="relative w-full" ref={searchContainerRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search cement, steel, paints..."
                  className="w-full pl-4 pr-12 py-2.5 border border-white/15 rounded-xl text-sm bg-[#171717] text-[#F4E9D8] placeholder:text-[#D4C4A8]/50 focus:outline-none focus:ring-2 focus:ring-[#FE5E00]/30 focus:border-[#FE5E00] transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#FE5E00] text-[#0D0D0D] hover:bg-[#E05200] transition-colors"
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
                <button className="relative p-2 rounded-lg hover:bg-[#222222] transition-colors text-[#D4C4A8] hover:text-[#F4E9D8]">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FE5E00]" />
                </button>
              )}
              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  `relative p-2 rounded-lg transition-colors ${
                    isActive ? "bg-[#FE5E00]/15 text-[#FE5E00]" : "hover:bg-[#222222] text-[#D4C4A8] hover:text-[#F4E9D8]"
                  }`
                }
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#FE5E00] text-[#0D0D0D] text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              {/* User dropdown */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    isLoggedIn
                      ? "bg-[#FE5E00] text-[#0D0D0D] font-semibold"
                      : "border border-white/15 text-[#F4E9D8] hover:border-[#FE5E00]"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">
                    {isLoggedIn ? (user?.name?.split(" ")[0] || "Account") : "Login"}
                  </span>
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-[#222222] border border-white/15 rounded-xl shadow-2xl w-52 z-50 py-1.5">
                    {isLoggedIn ? (
                      <>
                        <NavLink to="/dashboard" onClick={() => setUserOpen(false)}
                          className={({ isActive }) => `block px-4 py-2.5 text-sm transition-colors ${isActive ? "text-[#FE5E00] bg-[#FE5E00]/8" : "text-[#F4E9D8] hover:bg-[#2A2A2A]"}`}>
                          My Dashboard
                        </NavLink>
                        <Link to="/dashboard" state={{ section: "orders" }} onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-[#F4E9D8] hover:bg-[#2A2A2A] transition-colors">My Orders</Link>
                        <hr className="my-1 border-white/10" />
                        <button
                          onClick={() => { setIsLoggedIn(false); setUserOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <NavLink to="/login"    onClick={() => setUserOpen(false)} className={({ isActive }) => `block px-4 py-2.5 text-sm transition-colors ${isActive ? "text-[#FE5E00]" : "text-[#F4E9D8] hover:bg-[#2A2A2A]"}`}>Login</NavLink>
                        <NavLink to="/register" onClick={() => setUserOpen(false)} className={({ isActive }) => `block px-4 py-2.5 text-sm transition-colors ${isActive ? "text-[#FE5E00]" : "text-[#F4E9D8] hover:bg-[#2A2A2A]"}`}>Register</NavLink>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky category nav bar ────────────────────────────────────── */}
        <div className="hidden md:block bg-[#171717] border-t border-white/8 px-4">
          <div className="max-w-7xl mx-auto flex gap-0.5 overflow-x-auto scrollbar-none">
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-xs px-4 py-2.5 whitespace-nowrap transition-colors font-bold border-b-2 -mb-px ${
                  isActive ? "border-[#FE5E00] text-[#FE5E00]" : "border-transparent text-[#D4C4A8]/70 hover:text-[#FE5E00] hover:border-[#FE5E00]/50"
                }`
              }
            >
              All
            </NavLink>
            {CATEGORIES.map(cat => (
              <NavLink
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className={({ isActive }) =>
                  `text-xs px-4 py-2.5 whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    isActive
                      ? "border-[#FE5E00] text-[#FE5E00] font-semibold"
                      : "border-transparent text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:border-[#FE5E00]/40"
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* City modal overlay */}
      {cityModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-[#0D0D0D]/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => city && setCityModalOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            <CitySelection isModal onClose={() => setCityModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMenuOpen(false)} />
          <div className="relative bg-[#171717] w-72 h-full overflow-y-auto border-r border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/8">
              <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain" />
              <button onClick={() => setMenuOpen(false)} className="text-[#D4C4A8] hover:text-[#F4E9D8] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => { setCityModalOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#F4E9D8] border-b border-white/8 hover:bg-[#222222] transition-colors w-full text-left"
            >
              <MapPin className="w-4 h-4 text-[#FE5E00]" /> {city || "Select City"}
            </button>

            <div className="px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/40 mb-2 mt-2">Categories</p>
              <NavLink to="/shop" onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-2.5 text-sm font-semibold border-b border-white/5 transition-colors ${
                    isActive ? "text-[#FE5E00]" : "text-[#FE5E00]/80 hover:text-[#FE5E00]"
                  }`
                }
              >
                All Categories
              </NavLink>
              {CATEGORIES.map(cat => (
                <NavLink
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 py-2.5 text-sm border-b border-white/5 transition-colors ${
                      isActive
                        ? "text-[#FE5E00] font-semibold pl-1 border-l-2 border-[#FE5E00]"
                        : "text-[#F4E9D8] hover:text-[#FE5E00]"
                    }`
                  }
                >
                  {cat.name}
                </NavLink>
              ))}
            </div>

            <div className="mt-auto p-4 border-t border-white/8 flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-[#F4E9D8] hover:text-[#FE5E00] transition-colors">Dashboard</Link>
                  <button onClick={() => { setIsLoggedIn(false); setMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"    onClick={() => setMenuOpen(false)} className="block py-2 text-center bg-[#FE5E00] text-[#0D0D0D] rounded-xl font-bold text-sm">Login</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-center border border-white/15 text-[#F4E9D8] rounded-xl text-sm">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
