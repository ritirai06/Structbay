import { getCustomerAccessToken } from "./authStorage";

const BASE = '/api/v1/customer';

function token() {
  return getCustomerAccessToken();
}

function formatApiError(json: unknown): string {
  const j = json as { message?: unknown; errors?: unknown };
  let msg = j?.message ?? 'Request failed';
  if (typeof msg !== 'string') msg = String(msg);
  const errs = j?.errors;
  if (Array.isArray(errs) && errs.length) {
    const parts = errs.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    return `${msg} ${parts.join('; ')}`;
  }
  return msg;
}

async function reqV1<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body != null && method !== 'GET') headers['Content-Type'] = 'application/json';
  const url = `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body != null && method !== 'GET' ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(formatApiError(json));
  return json as T;
}

async function req<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(formatApiError(json));
  return json;
}

export const api = {
  // ─── Public Catalog ────────────────────────────────────────────────────────
  getCities: () => req<any>('GET', '/cities'),

  /** Public homepage / storefront CMS (top bar, promo modal, hero copy). */
  getCmsHomepage: async (): Promise<Record<string, unknown>> => {
    const res = await fetch("/api/v1/cms/homepage");
    const json = (await res.json()) as { success?: boolean; message?: string; data?: Record<string, unknown> };
    if (!res.ok) throw new Error(json.message || "Failed to load storefront settings");
    return json.data || {};
  },

  /** Public PIN check — no auth. Optional `cityId` = header-selected warehouse city (better Bengaluru coverage). */
  validatePincode: async (code: string, cityId?: string | null) => {
    const digits = String(code ?? '').replace(/\D/g, '').slice(0, 6);
    const p = new URLSearchParams({ code: digits });
    if (cityId) p.set('cityId', String(cityId));
    const res = await fetch(`${BASE}/serviceability/pincode?${p.toString()}`);
    const text = await res.text();
    type PinData = {
      serviceable: boolean;
      message?: string;
      city?: { id: string; name: string; state: string; slug?: string };
    };
    let json: { message?: string; data?: PinData } = {};
    if (text.trim()) {
      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        throw new Error('Could not read the server response. Is the API running (e.g. backend on port 5000)?');
      }
    }
    if (!res.ok) {
      throw new Error(typeof json.message === 'string' ? json.message : `Request failed (${res.status})`);
    }
    const data = json.data;
    if (!data || typeof data !== 'object') {
      return {
        serviceable: false,
        message: 'Empty response from server. Check your connection and try again.',
      } satisfies PinData;
    }
    return data;
  },

  getCategories: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return req<any>('GET', `/categories${q}`);
  },

  getBrands: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return req<any>('GET', `/brands${q}`);
  },

  getProducts: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return req<any>('GET', `/products${q}`);
  },

  getProductDetails: (slug: string, cityId?: string) => {
    const q = cityId ? `?cityId=${cityId}` : '';
    return req<any>('GET', `/products/${slug}${q}`);
  },

  getCategoryDetails: (slug: string, cityIdOrParams?: string | Record<string, string | number | boolean | undefined | null>) => {
    const p = new URLSearchParams();
    const params =
      typeof cityIdOrParams === 'string' || cityIdOrParams === undefined
        ? cityIdOrParams
          ? { cityId: cityIdOrParams }
          : {}
        : (cityIdOrParams as Record<string, string | number | boolean | undefined | null>);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
    });
    const q = p.toString();
    return req<any>('GET', `/category/${slug}${q ? `?${q}` : ''}`);
  },

  getBrandDetails: (slug: string, cityIdOrParams?: string | Record<string, string | number | boolean | undefined | null>) => {
    const p = new URLSearchParams();
    const params =
      typeof cityIdOrParams === 'string' || cityIdOrParams === undefined
        ? cityIdOrParams
          ? { cityId: cityIdOrParams }
          : {}
        : (cityIdOrParams as Record<string, string | number | boolean | undefined | null>);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
    });
    const q = p.toString();
    return req<any>('GET', `/brand/${slug}${q ? `?${q}` : ''}`);
  },

  globalSearch: (query: string, cityIdOrParams?: string | Record<string, string | number | boolean | undefined | null>) => {
    const p = new URLSearchParams();
    p.set('q', query);
    if (typeof cityIdOrParams === 'string') {
      if (cityIdOrParams) p.set('cityId', cityIdOrParams);
    } else if (cityIdOrParams && typeof cityIdOrParams === 'object') {
      Object.entries(cityIdOrParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
      });
    }
    return req<any>('GET', `/search?${p.toString()}`);
  },

  // ─── CMS ────────────────────────────────────────────────────────────────────
  getActiveBanners: () =>
    fetch('/api/v1/cms/banners?status=ACTIVE&limit=10').then(r => r.json()),

  getTestimonials: () =>
    fetch('/api/v1/cms/testimonials?status=ACTIVE&featured=true&limit=6').then(r => r.json()),

  getBlogs: (limit = 6) =>
    fetch(`/api/v1/cms/blogs?status=PUBLISHED&limit=${limit}`).then(r => r.json()),

  getFooter: () =>
    fetch('/api/v1/cms/footer').then(r => r.json()),

  // ─── Customer Auth / Profile ────────────────────────────────────────────────
  getProfile: () => req<any>('GET', '/profile'),
  updateProfile: (data: Record<string, unknown>) => req<any>('PATCH', '/profile', data),

  // ─── Cart ───────────────────────────────────────────────────────────────────
  getCart: () => req<any>('GET', '/cart'),
  addToCart: (data: any) => req<any>('POST', '/cart/items', data),
  updateCartItem: (itemId: string, data: any) => req<any>('PATCH', `/cart/items/${itemId}`, data),
  removeCartItem: (itemId: string) => req<any>('DELETE', `/cart/items/${itemId}`),
  clearCart: () => req<any>('DELETE', '/cart'),
  setCartCity: (data: { cityId: string }) => req<any>('PATCH', '/cart/city', data),

  validateCheckout: (data: { cityId: string; addressCity?: string }) =>
    req<any>('POST', '/checkout/validate', data),

  placeOrder: (data: {
    cityId: string;
    shippingAddress: Record<string, string | undefined>;
    paymentMethod?: string;
    addressId?: string;
  }) => req<any>('POST', '/checkout/place-order', data),

  // ─── Orders & invoices ───────────────────────────────────────────────────
  getOrders: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return req<any>('GET', `/orders${q}`);
  },
  getOrder: (id: string) => req<any>('GET', `/orders/${id}`),
  getOrderTracking: (id: string) => req<any>('GET', `/orders/${id}/tracking`),
  getOrderChat: (orderId: string) => reqV1<any>('GET', `/order-chat/${orderId}`),
  postOrderChatMessage: (orderId: string, text: string) =>
    reqV1<any>('POST', `/order-chat/${orderId}/messages`, { text }),
  getOrderInvoices: (id: string) => req<any>('GET', `/orders/${id}/invoices`),

  /** Themed HTML order summary (download). */
  downloadOrderInvoiceSummaryHtml: async (orderId: string) => {
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${BASE}/orders/${encodeURIComponent(orderId)}/invoice-summary`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download invoice';
      try {
        const j = await res.json();
        msg = formatApiError(j);
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.blob();
  },

  // ─── Notifications (email + in-app; email via templates / checkout) ───────
  getNotifications: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return req<any>('GET', `/notifications${q}`);
  },
  markNotificationRead: (id: string) => req<any>('PATCH', `/notifications/${id}/read`),
  markAllNotificationsRead: () => req<any>('PATCH', '/notifications/mark-all-read'),
  removeNotification: (id: string) => req<any>('DELETE', `/notifications/${id}`),
};
