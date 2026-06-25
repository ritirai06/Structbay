import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { getApiV1Base } from "../../lib/apiBase";
import { clearCustomerSession, getCustomerAccessToken, getCustomerRefreshToken, refreshCustomerAccessToken, CUSTOMER_TOKEN_KEY } from "../lib/authStorage";
import { loadStorefrontCities, reconcileStoredCity } from "../lib/storefrontCities";
import {
  isLocationOnboardingComplete,
  markLocationOnboardingComplete,
} from "../lib/locationOnboarding";
import type { PricingSnapshot } from "../lib/wholesalePricing";
import { buildPricingSnapshotFromRow, cartLineSubtotalExGst, cartLineGstAmount } from "../lib/wholesalePricing";

export interface CartItem {
  id: string;
  /** Product slug (without variation composite). */
  productSlug?: string;
  /** MongoDB _id of the product — used for upsell/cross-sell lookups. */
  productId?: string;
  variationId?: string;
  variationLabel?: string;
  name: string;
  brand: string;
  /** Fallback unit price when `pricingSnapshot` is missing (legacy carts). */
  price: number;
  qty: number;
  unit: string;
  image: string;
  /** City pricing row for wholesale slab resolution (must match checkout). */
  pricingSnapshot?: PricingSnapshot | null;
  /** Product GST % (ex-GST line → GST). Defaults to 18 in totals if omitted. */
  gstPercentage?: number;
}

/** Serviceable city from admin / DB — drives warehouse pricing via `cityId` on APIs. */
export type SelectedCity = {
  id: string;
  name: string;
  state: string;
  slug?: string;
};

const STORAGE_KEY = "sb_selected_city";
const LEGACY_CITY_KEY = "sb_city";
const CART_STORAGE_KEY = "sb_cart";

function parseStoredPricingSnapshot(raw: unknown): PricingSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = buildPricingSnapshotFromRow(raw as Record<string, unknown>);
  return s ?? undefined;
}

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CartItem[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = o.id;
      const name = o.name;
      if (typeof id !== "string" || !id || typeof name !== "string" || !name) continue;
      const price = Number(o.price);
      const qty = Math.floor(Number(o.qty));
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 1) continue;
      const gstRaw = o.gstPercentage;
      const gstPercentage =
        gstRaw !== undefined && gstRaw !== null && gstRaw !== "" && Number.isFinite(Number(gstRaw))
          ? Number(gstRaw)
          : undefined;
      out.push({
        id,
        productSlug: typeof o.productSlug === "string" ? o.productSlug : undefined,
        variationId: typeof o.variationId === "string" ? o.variationId : undefined,
        variationLabel: typeof o.variationLabel === "string" ? o.variationLabel : undefined,
        name,
        brand: typeof o.brand === "string" ? o.brand : "",
        price,
        qty,
        unit: typeof o.unit === "string" ? o.unit : "",
        image: typeof o.image === "string" ? o.image : "",
        pricingSnapshot: parseStoredPricingSnapshot(o.pricingSnapshot),
        gstPercentage,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function persistCartSnapshot(items: CartItem[]) {
  try {
    if (items.length === 0) localStorage.removeItem(CART_STORAGE_KEY);
    else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

function readStoredCity(): SelectedCity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o?.id && o?.name) {
      return {
        id: String(o.id),
        name: String(o.name),
        state: String(o.state || ""),
        slug: o.slug ? String(o.slug) : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistCity(c: SelectedCity | null) {
  if (c) localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  else localStorage.removeItem(STORAGE_KEY);
}

interface AppContextType {
  /** MongoDB City id for `cityId` query param (pricing / availability per warehouse). */
  cityId: string | null;
  /** Display name for header, PDP, checkout messaging. */
  city: string | null;
  /** True after user has confirmed a delivery city (this visit or a prior one). */
  locationOnboardingComplete: boolean;
  setSelectedCity: (c: SelectedCity | null) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  /** Clear in-memory cart (e.g. after a successful server checkout). */
  clearClientCart: () => void;
  /** Sum of line subtotals ex-GST (wholesale slabs applied per line by quantity). */
  cartTotal: number;
  /** GST on cart lines (per product `gstPercentage`, default 18%). */
  cartGstTotal: number;
  cartCount: number;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  user: { name: string; company: string; email: string } | null;
  setUser: (u: { name: string; company: string; email: string } | null) => void;
  // Wishlist
  wishlist: string[];
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  // Compare
  compareList: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  isComparing: (id: string) => boolean;
  clearCompare: () => void;
  // Search
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const MAX_RECENT_SEARCHES = 5;
const MAX_COMPARE = 3;

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<SelectedCity | null>(() =>
    isLocationOnboardingComplete() ? readStoredCity() : null
  );

  const setSelectedCity = useCallback((c: SelectedCity | null) => {
    setSelectedCityState(c);
    persistCity(c);
    if (c) markLocationOnboardingComplete();
    if (!c) localStorage.removeItem(LEGACY_CITY_KEY);
  }, []);

  /** One-time migration: old `sb_city` stored display name only — resolve to id from API. */
  useEffect(() => {
    if (!isLocationOnboardingComplete()) return;
    if (readStoredCity()) return;
    const legacy = localStorage.getItem(LEGACY_CITY_KEY);
    if (!legacy?.trim()) return;

    let cancelled = false;
    void (async () => {
      try {
        const list = await loadStorefrontCities();
        if (cancelled) return;
        const key = legacy.trim().toLowerCase();
        const match = list.find(
          (c) =>
            c.name.toLowerCase() === key ||
            (c.slug && c.slug.toLowerCase() === key)
        );
        if (match) {
          const next: SelectedCity = {
            id: match.id,
            name: match.name,
            state: match.state || "",
            slug: match.slug,
          };
          setSelectedCityState(next);
          persistCity(next);
        }
        localStorage.removeItem(LEGACY_CITY_KEY);
      } catch {
        /* keep legacy key until cities load later */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Reconcile stored city id with live API (fixes stale ids after DB re-seed). */
  useEffect(() => {
    if (!isLocationOnboardingComplete()) return;
    const stored = readStoredCity();
    if (!stored) return;

    let cancelled = false;
    void (async () => {
      try {
        const reconciled = await reconcileStoredCity(stored);
        if (cancelled) return;
        if (!reconciled) {
          setSelectedCityState(null);
          persistCity(null);
          return;
        }
        if (
          reconciled.id !== stored.id ||
          reconciled.name !== stored.name ||
          reconciled.state !== stored.state
        ) {
          setSelectedCityState(reconciled);
          persistCity(reconciled);
        }
      } catch {
        /* keep stored city until cities API is reachable */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart());

  /** Keep cart across refresh (same browser). */
  useEffect(() => {
    persistCartSnapshot(cart);
  }, [cart]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; company: string; email: string } | null>(null);

  /** Restore session from JWT after refresh (login stores tokens in localStorage). */
  useEffect(() => {
    const base = getApiV1Base().replace(/\/$/, "");
    let cancelled = false;

    const loadProfile = async (token: string) => {
      const res = await fetch(`${base}/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 && getCustomerRefreshToken()) {
        const ok = await refreshCustomerAccessToken();
        if (ok) {
          const next = getCustomerAccessToken();
          if (next) return loadProfile(next);
        }
        clearCustomerSession();
        return null;
      }
      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { name?: string; email?: string; companyName?: string; role?: string };
      };
      if (!res.ok || json.success === false) {
        clearCustomerSession();
        return null;
      }
      return json.data ?? null;
    };

    (async () => {
      try {
        let t = getCustomerAccessToken();
        if (!t && getCustomerRefreshToken()) {
          const ok = await refreshCustomerAccessToken();
          if (ok) t = getCustomerAccessToken();
        }
        if (!t || cancelled) return;

        const d = await loadProfile(t);
        if (!d || cancelled) return;
        if (d.role !== "CUSTOMER") {
          clearCustomerSession();
          return;
        }
        setUser({
          name: String(d.name || ""),
          company: String(d.companyName || ""),
          email: String(d.email || ""),
        });
        setIsLoggedIn(true);
      } catch {
        if (!cancelled) clearCustomerSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Keep UI in sync if token is cleared elsewhere (logout, expired refresh, other tab). */
  useEffect(() => {
    if (isLoggedIn && !getCustomerAccessToken()) {
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const onSessionCleared = () => {
      setIsLoggedIn(false);
      setUser(null);
    };
    window.addEventListener("customer-session-cleared", onSessionCleared);
    return () => window.removeEventListener("customer-session-cleared", onSessionCleared);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CUSTOMER_TOKEN_KEY && !e.newValue) {
        setIsLoggedIn(false);
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_wishlist") || "[]");
    } catch {
      return [];
    }
  });

  const [compareList, setCompareList] = useState<string[]>([]);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_recent_searches") || "[]");
    } catch {
      return [];
    }
  });

  const cityId = selectedCity?.id ?? null;
  const city = selectedCity?.name ?? null;

  /* ── Cart ─────────────────────────────────────────────────── */
  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                qty: i.qty + item.qty,
                pricingSnapshot: i.pricingSnapshot ?? item.pricingSnapshot,
                gstPercentage: i.gstPercentage ?? item.gstPercentage,
              }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const clearClientCart = () => setCart([]);

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + cartLineSubtotalExGst(i), 0), [cart]);
  const cartGstTotal = useMemo(() => cart.reduce((sum, i) => sum + cartLineGstAmount(i, i.gstPercentage ?? 18), 0), [cart]);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const addToWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem("sb_wishlist", JSON.stringify(next));
      return next;
    });
  };

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.filter((i) => i !== id);
      localStorage.setItem("sb_wishlist", JSON.stringify(next));
      return next;
    });
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  const addToCompare = (id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const removeFromCompare = (id: string) => setCompareList((prev) => prev.filter((i) => i !== id));

  const isComparing = (id: string) => compareList.includes(id);
  const clearCompare = () => setCompareList([]);

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const deduped = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem("sb_recent_searches", JSON.stringify(deduped));
      return deduped;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("sb_recent_searches");
  };

  return (
    <AppContext.Provider
      value={{
        cityId,
        city,
        setSelectedCity,
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearClientCart,
        cartTotal,
        cartGstTotal,
        cartCount,
        isLoggedIn,
        setIsLoggedIn,
        user,
        setUser,
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isWishlisted,
        compareList,
        addToCompare,
        removeFromCompare,
        isComparing,
        clearCompare,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
