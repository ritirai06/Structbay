import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  qty: number;
  unit: string;
  image: string;
}

interface AppContextType {
  city: string | null;
  setCity: (city: string) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  cartTotal: number;
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
  const [city, setCity] = useState<string | null>(() => localStorage.getItem("sb_city"));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; company: string; email: string } | null>(null);

  // Wishlist — persisted
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("sb_wishlist") || "[]"); } catch { return []; }
  });

  // Compare list — session only
  const [compareList, setCompareList] = useState<string[]>([]);

  // Recent searches — persisted
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("sb_recent_searches") || "[]"); } catch { return []; }
  });

  const handleSetCity = (c: string) => {
    setCity(c);
    localStorage.setItem("sb_city", c);
  };

  /* ── Cart ─────────────────────────────────────────────────── */
  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i);
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  /* ── Wishlist ────────────────────────────────────────────── */
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

  /* ── Compare ────────────────────────────────────────────── */
  const addToCompare = (id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const removeFromCompare = (id: string) =>
    setCompareList((prev) => prev.filter((i) => i !== id));

  const isComparing = (id: string) => compareList.includes(id);
  const clearCompare = () => setCompareList([]);

  /* ── Recent Searches ────────────────────────────────────── */
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
        city,
        setCity: handleSetCity,
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        cartTotal,
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
