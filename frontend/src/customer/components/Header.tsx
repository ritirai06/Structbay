import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router";
import {
  Search, User, MapPin, ChevronDown, Menu, X,
  Bell, LogOut, Phone, FileText, TrendingUp, ChevronRight, ChevronLeft,
  Zap, ShoppingCart,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { fetchNavCategories } from "../lib/navCategories";
import { clearCustomerSession, getCustomerAccessToken } from "../lib/authStorage";
import { CitySelection } from "../pages/CitySelection";
import { SearchDropdown } from "./SearchDropdown";
import { StorefrontPromoModal, shouldShowStorefrontPromoModal } from "./StorefrontPromoModal";
import { isLocationOnboardingComplete, hasOnboardingGatePassed, ONBOARDING_GATE_EVENT } from "../lib/locationOnboarding";
import { useBulkEnquiryModal } from "../context/BulkEnquiryModalContext";
import { FloatingCityPill } from "./FloatingCityPill";
import {
  buildContextualNotices,
  contextualPanelTitle,
  type ContextualNotice,
} from "../lib/contextualNotifications";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { ShopMegaMenu } from "./ShopMegaMenu";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

type CustomerNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  refId?: string | null;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationPath(n: CustomerNotification): string {
  if (n.refId && ["ORDER", "PAYMENT", "DISPATCH", "DELIVERY", "INVOICE"].includes(n.type)) {
    return `/orders/${encodeURIComponent(n.refId)}`;
  }
  if (n.type === "RFQ") return "/rfq";
  if (n.type === "ENQUIRY") return "/bulk-enquiry";
  return "/account/notifications";
}

/** After user picks a city in the onboarding modal â€” persisted via `locationOnboarding.ts`. */

const MARQUEE_SEGMENTS_DEFAULT = [
  "Super fast same day delivery*",
  "Minimum Order Value Rs. 2000",
  "Additional Delivery Charges Applicable - pay at site",
];

const MARQUEE_HOLD_MS = 3000;
const MARQUEE_FADE_MS = 450;
const SAND_AGGREGATES_QUOTE_EVENT = "structbay:open-sand-aggregates-quote";

function isSandAggregatesCategory(cat: any): boolean {
  const text = `${cat?.slug || ""} ${cat?.name || ""}`.toLowerCase().replace(/&/g, "and");
  return /m[-\s]*sand/.test(text) || (text.includes("sand") && text.includes("aggregate")) || text.includes("aggregates");
}

function signalSandAggregatesQuoteOpen(cat: any) {
  if (!isSandAggregatesCategory(cat)) return;
  globalThis.window?.dispatchEvent(new Event(SAND_AGGREGATES_QUOTE_EVENT));
}

function TopMarquee({ segments }: { segments: string[] }) {
  const items = segments.length ? segments : MARQUEE_SEGMENTS_DEFAULT;
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const holdTimer = window.setTimeout(() => setFading(true), MARQUEE_HOLD_MS);
    return () => clearTimeout(holdTimer);
  }, [index, items.length]);

  useEffect(() => {
    if (!fading || items.length <= 1) return;
    const fadeTimer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
      setFading(false);
    }, MARQUEE_FADE_MS);
    return () => clearTimeout(fadeTimer);
  }, [fading, items.length]);

  return (
    <>
      <style>
        {`
        .sb-top-marquee-message {
          transition: opacity ${MARQUEE_FADE_MS}ms ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-top-marquee-message { transition: none; }
        }
      `}
      </style>
      <div
        className="relative w-full min-h-[2.0rem] flex items-center justify-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <p
          key={index}
          className={`sb-top-marquee-message text-black text-[12px] sm:text-lg font-medium tracking-wide text-center px-1 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {items[index]}
        </p>
      </div>
    </>
  );
}

export function Header() {
  const { city, cityId, cartCount, isLoggedIn, user, setIsLoggedIn, setUser, addRecentSearch } = useApp();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "";
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [catOpen, setCatOpen]             = useState(false);
  const [userOpen, setUserOpen]           = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [announcementsGatePassed, setAnnouncementsGatePassed] = useState(
    () => typeof window !== "undefined" && hasOnboardingGatePassed()
  );
  const [categories, setCategories]       = useState<any[]>([]);
  const [storefront, setStorefront]       = useState<Record<string, unknown> | null>(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate  = useNavigate();
  const { openBulkEnquiry } = useBulkEnquiryModal();
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);

  const headerRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  
  const marqueeHeightRef = useRef(0);
  const totalHeightRef = useRef(0);
  const prevScrollY = useRef(0);

  const updateHeights = useCallback(() => {
    if (marqueeRef.current) {
      marqueeHeightRef.current = marqueeRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        "--sf-marquee-height",
        `${marqueeRef.current.offsetHeight}px`
      );
    }
    if (headerRef.current) {
      totalHeightRef.current = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        "--sf-total-height",
        `${headerRef.current.offsetHeight}px`
      );
    }
  }, []);

  useEffect(() => {
    updateHeights();
    window.addEventListener("resize", updateHeights);
    return () => window.removeEventListener("resize", updateHeights);
  }, [updateHeights]);

  useEffect(() => {
    updateHeights();
  }, [searchOpen, searchFocused, updateHeights]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > prevScrollY.current ? "down" : "up";
      const marqueeHeight = marqueeHeightRef.current || 32;

      if (currentScrollY <= marqueeHeight) {
        setHeaderVisible(true);
      } else if (direction === "down") {
        setHeaderVisible(false);
      } else if (direction === "up") {
        setHeaderVisible(true);
      }

      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const marqueeHeight = marqueeHeightRef.current || 32;
    const totalHeight = totalHeightRef.current || 120;

    let stickyOffset = 20;
    if (headerVisible) {
      stickyOffset = totalHeight + 20;
    } else {
      stickyOffset = marqueeHeight + 20;
    }

    document.documentElement.style.setProperty("--sf-chrome-sticky", `${stickyOffset}px`);
  }, [headerVisible, searchOpen, searchFocused, updateHeights]);


  const contextualNotices = useMemo(
    () =>
      buildContextualNotices({
        pathname: location.pathname,
        city,
        cityId,
        cartCount,
        isLoggedIn,
      }),
    [location.pathname, city, cityId, cartCount, isLoggedIn]
  );

  const cityNotices = contextualNotices.filter((n) => n.scope === "city");
  const pageNotices = contextualNotices.filter((n) => n.scope === "page");
  const panelTitle = contextualPanelTitle(city, location.pathname);

  // Shop dropdown: all active categories (not filtered by city).
  useEffect(() => {
    fetchNavCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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
    // City first: promo only after onboarding + a selected warehouse city.
    if (!isLocationOnboardingComplete() || !cityId || cityModalOpen) return;
    const t = window.setTimeout(() => setPromoModalOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [storefront, cityId, cityModalOpen]);

  /** New users on homepage: wait for announcement modal to finish before city picker. */
  useEffect(() => {
    const onGate = () => setAnnouncementsGatePassed(true);
    window.addEventListener(ONBOARDING_GATE_EVENT, onGate);
    return () => window.removeEventListener(ONBOARDING_GATE_EVENT, onGate);
  }, []);

  useEffect(() => {
    if (cityId || isLocationOnboardingComplete()) return;
    if (isHome && !announcementsGatePassed) return;
    setCityModalOpen(true);
  }, [cityId, isHome, announcementsGatePassed]);

  useEffect(() => {
    if (cityId || isLocationOnboardingComplete()) return;
    if (!isHome) setCityModalOpen(true);
  }, [cityId, isHome]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn || !getCustomerAccessToken()) return;
    setLoadingNotifs(true);
    try {
      const res = await api.getNotifications({ limit: "8" }) as {
        data?: { items?: CustomerNotification[]; unreadCount?: number } | CustomerNotification[];
      };
      const payload = res?.data;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      setNotifications(items);
      const unread = !Array.isArray(payload) && typeof payload?.unreadCount === "number"
        ? payload.unreadCount
        : items.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifs(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!notifOpen) return;
    if (isLoggedIn) void loadNotifications();
  }, [notifOpen, isLoggedIn, loadNotifications, location.pathname, cityId]);

  useEffect(() => {
    if (!isLoggedIn || notifOpen) return;
    const schedule = () => void loadNotifications();
    const win = globalThis.window;
    if (!win) return;
    if ("requestIdleCallback" in win) {
      const id = win.requestIdleCallback(schedule, { timeout: 4000 });
      return () => win.cancelIdleCallback(id);
    }
    const id = setTimeout(schedule, 2500);
    return () => clearTimeout(id);
  }, [isLoggedIn, notifOpen, loadNotifications, cityId]);

  const openContextualNotice = (n: ContextualNotice) => {
    setNotifOpen(false);
    if (n.href) navigate(n.href);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const openNotification = (n: CustomerNotification) => {
    if (!n.isRead) void markNotificationRead(n._id);
    setNotifOpen(false);
    navigate(notificationPath(n));
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    // Backend global search requires â‰¥2 chars; match that so results and typeahead stay aligned.
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

      {/* â”€â”€ Reference storefront header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header ref={headerRef} className="sf-header">
        <div ref={marqueeRef} className="sf-marquee-wrapper">
          {promoEnabled && topBarText ? (
            <div className="sf-announce" style={{ background: topBarBg, color: topBarTextColor }}>
              {topBarText}
            </div>
          ) : (
            // <div className="sf-announce flex items-center justify-center gap-3">
            //   <ChevronLeft className="w-4.0 h-4.0  opacity-50 shrink-0" aria-hidden />
            //   <div className="flex-1 min-w-0 overflow-hidden">
            //     <TopMarquee segments={marqueeFromCms} />
            //   </div>
            //   <ChevronRight className="w-4.0 h-4.0 opacity-50 shrink-0"  aria-hidden />
            // </div>
            <div className="sf-announce flex items-center justify-center gap-2 lg:gap-4">
  <ChevronLeft
    className="w-5 h-5 lg:w-7 lg:h-7 text-black shrink-0 lg:ml-30"
    aria-hidden
  />

  <div className="flex-1 min-w-0 overflow-hidden px-2 lg:px-4">
    <TopMarquee segments={marqueeFromCms} />
  </div>

  <ChevronRight
    className="w-5 h-5 lg:w-7 lg:h-7 text-black shrink-0 lg:mr-30"
    aria-hidden
  />
</div>
          )}
        </div>

        <div className={`sf-header-content ${headerVisible ? "" : "sf-header-content--hidden"}`}>
          <div className="sf-header-main">
            {/* Desktop & Tablet Header (Visible on md and up: >= 768px) */}
            <div className="hidden md:flex items-center justify-between w-full gap-4">
              <button
                onClick={() => setMenuOpen(true)}
                className="lg:hidden p-2 text-white/80 hover:text-white"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link to="/" className="shrink-0 sf-header-logo-link">
                <img src={logoImg} alt="Structbay" className="sf-header-logo" />
              </Link>

              <nav className="sf-nav" aria-label="Main">
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Home</NavLink>
                <ShopMegaMenu 
                  categories={categories} 
                  onCategoryClick={(cat) => signalSandAggregatesQuoteOpen(cat)}
                />
                <Link to="/blogs">Blog</Link>
                <Link to="/about">About Us</Link>
                <Link to="/contact">Contact Us</Link>
              </nav>

              <div className="sf-header-actions">
                {/* Desktop Actions (Hidden on smaller screens) */}
                <button
                  type="button"
                  onClick={() => openBulkEnquiry()}
                  className="sf-btn-outline hidden md:inline-flex !px-2.5 !py-1.5 !text-[0.65rem]"
                >
                  Bulk Order
                </button>
                <NavLink to="/finance" className="sf-btn-outline hidden md:inline-flex !px-2.5 !py-1.5 !text-[0.65rem]">
                  Finance
                </NavLink>

                {/* Search */}
                <button type="button" onClick={() => setSearchOpen((v) => !v)} className="hidden sm:flex p-2 text-white hover:text-sb-orange transition-colors" aria-label="Search">
                  <Search className="w-[26px] h-[26px]" />
                </button>

                <NavLink to="/cart" className="relative hidden md:flex p-2 text-white hover:text-sb-orange transition-colors items-center justify-center" aria-label="Cart">
                  <ShoppingCart className="w-[26px] h-[26px]" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[1.1rem] h-[1.1rem] rounded-full bg-sb-orange text-white text-[10px] font-bold flex items-center justify-center px-0.5">{cartCount}</span>
                  )}
                </NavLink>

                {/* Quick Actions Dropdown (Mobile only) */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="sf-btn-outline inline-flex px-3" aria-label="Quick Actions">
                        <Zap className="w-4 h-4 text-sb-orange" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-1 z-50">
                      <DropdownMenuItem asChild className="rounded-lg hover:bg-orange-50 focus:bg-orange-50 cursor-pointer">
                        <Link to="/tools/cement-calculator" className="flex items-center w-full px-3 py-2 text-sm text-gray-800">
                          Cement Calculator
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg hover:bg-orange-50 focus:bg-orange-50 cursor-pointer">
                        <button onClick={() => openBulkEnquiry()} className="flex items-center w-full px-3 py-2 text-sm text-gray-800">
                          Bulk Order
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg hover:bg-orange-50 focus:bg-orange-50 cursor-pointer">
                        <Link to="/cart" className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-800">
                          <span>View Cart</span>
                          {cartCount > 0 && (
                            <span className="bg-sb-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="relative hidden lg:block" ref={userRef}>
                  <button type="button" onClick={() => setUserOpen((v) => !v)} className="p-2 text-white/80 hover:text-white" aria-label="Account">
                    <User className="w-[26px] h-[26px]" />
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl w-52 z-50 py-1.5 bg-white border border-gray-200">
                      {isLoggedIn ? (
                        <>
                          <NavLink to="/dashboard" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50">My Dashboard</NavLink>
                          <button type="button" onClick={() => { clearCustomerSession(); setUser(null); setIsLoggedIn(false); setUserOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <NavLink to="/login" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50">Login</NavLink>
                          <NavLink to="/register" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50">Register</NavLink>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* <DropdownMenu open={notifOpen} onOpenChange={(open) => {
                    setNotifOpen(open);
                    if (open && isLoggedIn) void loadNotifications();
                  }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative p-2 text-white/80 hover:text-white"
                      aria-label="Notifications and updates"
                    >
                      <Bell className="w-5 h-5" />
                      {isLoggedIn && unreadCount > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sb-orange px-1 text-[10px] font-medium text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 border-gray-200 bg-white p-0 text-black shadow-lg z-[70]">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                      <div>
                        <DropdownMenuLabel className="p-0 text-xs font-semibold text-black">
                          {panelTitle}
                        </DropdownMenuLabel>
                        <p className="text-[10px] text-gray-400 mt-0.5">Updates for this page & city</p>
                      </div>
                      {isLoggedIn && unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void markAllNotificationsRead();
                          }}
                          className="text-[11px] font-medium text-[#E85A00] hover:underline shrink-0"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {cityNotices.length > 0 && (
                        <div className="border-b border-gray-100">
                          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {city ? `${city}` : "Location"}
                          </p>
                          {cityNotices.map((n) => (
                            <DropdownMenuItem
                              key={n.id}
                              className="flex cursor-pointer flex-col items-start gap-0.5 rounded-none border-b border-gray-50 px-3 py-2.5 hover:bg-gray-50 bg-sky-50/30"
                              onSelect={() => openContextualNotice(n)}
                            >
                              <p className="text-sm font-medium text-black">{n.title}</p>
                              <p className="text-xs text-gray-600 leading-snug">{n.message}</p>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}
                      {pageNotices.length > 0 && (
                        <div className="border-b border-gray-100">
                          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            This page
                          </p>
                          {pageNotices.map((n) => (
                            <DropdownMenuItem
                              key={n.id}
                              className="flex cursor-pointer flex-col items-start gap-0.5 rounded-none border-b border-gray-50 px-3 py-2.5 hover:bg-gray-50"
                              onSelect={() => openContextualNotice(n)}
                            >
                              <p className="text-sm font-medium text-black">{n.title}</p>
                              <p className="text-xs text-gray-500 leading-snug">{n.message}</p>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}
                      {isLoggedIn && (
                        <div>
                          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Your orders & alerts
                          </p>
                          {loadingNotifs && !notifications.length ? (
                            <p className="px-3 py-4 text-center text-xs text-gray-400">Loadingâ€¦</p>
                          ) : notifications.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-gray-400">No order alerts yet</p>
                          ) : (
                            notifications.map((n) => (
                              <DropdownMenuItem
                                key={n._id}
                                className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-none border-b border-gray-50 px-3 py-2.5 hover:bg-gray-50 ${!n.isRead ? "bg-orange-50/40" : ""}`}
                                onSelect={() => openNotification(n)}
                              >
                                <div className="flex w-full items-start justify-between gap-2">
                                  <p className={`text-sm ${n.isRead ? "font-normal text-gray-800" : "font-medium text-black"}`}>
                                    {n.title}
                                  </p>
                                  <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                              </DropdownMenuItem>
                            ))
                          )}
                        </div>
                      )}
                      {!isLoggedIn && (
                        <p className="px-3 py-3 text-[11px] text-gray-500 border-t border-gray-100">
                          <Link to="/login" className="text-[#E85A00] font-semibold hover:underline" onClick={() => setNotifOpen(false)}>
                            Sign in
                          </Link>{" "}
                          for order confirmations and dispatch updates.
                        </p>
                      )}
                    </div>
                    {isLoggedIn && notifications.length > 0 && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem
                          className="cursor-pointer justify-center py-2 text-xs font-medium text-[#E85A00] hover:bg-gray-50"
                          onSelect={() => {
                            setNotifOpen(false);
                            navigate("/account/notifications");
                          }}
                        >
                          View all alerts
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </div>
            </div>

            {/* Mobile Responsive Header Layout (max-width: 767px) */}
            <div className="flex md:hidden items-center justify-between w-full sf-header-mobile-wrapper">
              {/* Left Section: Structbay Logo */}
              <div className="flex items-center">
                <Link to="/" className="shrink-0 flex items-center">
                  <img src={logoImg} alt="Structbay" className="sf-header-mobile-logo" />
                </Link>
              </div>

              {/* Center Section: Bulk Order & Finance Buttons */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openBulkEnquiry()}
                  className="sf-btn-outline-mobile"
                >
                  Bulk Order
                </button>
                <NavLink to="/finance" className="sf-btn-outline-mobile">
                  Finance
                </NavLink>
              </div>

              {/* Right Section: Icons (Cart, Search, Hamburger) */}
              <div className="flex items-center -space-x-1">
                {/* Cart Icon with badge */}
                <Link
                  to="/cart"
                  className="relative w-8 h-8 text-white hover:text-sb-orange transition-colors shrink-0 flex items-center justify-center"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-[22px] h-[22px]" />
                  <span className="sf-header-mobile-cart-badge" style={{ top: '-1px', right: '-3px' }}>
                    {cartCount}
                  </span>
                </Link>

                {/* Search Icon */}
                <button
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  className="w-8 h-8 text-white hover:text-sb-orange transition-colors shrink-0 flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="w-[22px] h-[22px]" />
                </button>


                {/* Hamburger Menu Icon */}
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="w-8 h-8 text-white hover:text-sb-orange transition-colors shrink-0 flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
        </div>

        {(searchOpen || searchFocused) && (
          <div className="sf-search-row">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative" ref={searchRef}>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search cement, steel, paints, tools..."
                className="w-full pl-4 pr-12 py-3 rounded-full text-sm bg-white border border-gray-200 text-gray-900 min-h-0"
              />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-sb-orange text-white flex items-center justify-center">
                <Search className="w-4 h-4" />
              </button>
              {searchFocused && (
                <SearchDropdown query={searchQuery} onSelect={() => { setSearchFocused(false); setSearchOpen(false); }} onClose={() => setSearchFocused(false)} />
              )}
            </form>
          </div>
        )}
        </div>
      </header>

      <FloatingCityPill onChangeCity={() => setCityModalOpen(true)} />

      {/* City modal â€” first visit prompts city; user may browse without selecting. */}
      {cityModalOpen && (
        <CitySelection
          isModal
          requireSelection={!isLocationOnboardingComplete() && !cityId}
          onClose={() => setCityModalOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/75" onClick={() => setMenuOpen(false)} />
          <div
            className="relative w-72 h-full overflow-y-auto flex flex-col animate-slide-left"
            style={{ background: "var(--chrome-black, #000000)", borderRight: "1px solid var(--sb-chrome-border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-sb-border-dark">
              <img src={logoImg} alt="Structbay" className="sf-header-logo" />
              <button onClick={() => setMenuOpen(false)} style={{ color: "var(--sb-chrome-fg-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => { setCityModalOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-colors w-full text-left"
              style={{ color: "var(--sb-chrome-fg)", borderBottom: "1px solid var(--sb-chrome-border)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin className="w-4 h-4" style={{ color: "var(--sb-orange)" }} /> {city || "All cities"}
            </button>

            <div className="px-4 py-3 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-white/50">Categories</p>
              <ShopMegaMenu 
                categories={categories} 
                isMobile 
                onNavigate={() => setMenuOpen(false)}
                onCategoryClick={(cat) => signalSandAggregatesQuoteOpen(cat)}
              />

              <p className="text-xs font-bold uppercase tracking-wider mb-2 mt-4 text-white/50">Menu</p>
              <Link to="/blogs" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-white">Blog</Link>
              <Link to="/tools/cement-calculator" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-white">
                Cement calculator
              </Link>
              <button
                type="button"
                onClick={() => { openBulkEnquiry(); setMenuOpen(false); }}
                className="block py-2 text-sm text-white w-full text-left"
              >
                Bulk Order
              </button>
              <Link to="/rfq" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-white">Concrete RFQ</Link>
              <Link to="/finance" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-white">Finance</Link>
              <button type="button" onClick={() => { setSearchOpen(true); setMenuOpen(false); }} className="block py-2 text-sm text-white w-full text-left">Search</button>
            </div>

            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--sb-chrome-border)" }}>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/account/notifications"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 text-sm transition-colors"
                    style={{ color: "var(--sb-chrome-fg)" }}
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-4 h-4" /> Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-sb-orange text-white text-[10px] font-medium flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-sm transition-colors"
                    style={{ color: "var(--sb-chrome-fg)" }}
                  >
                    My Dashboard
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



