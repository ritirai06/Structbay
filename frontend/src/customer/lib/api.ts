import { getCustomerAccessToken } from "./authStorage";

const BASE = '/api/v1/customer';

function token() {
  return getCustomerAccessToken();
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
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
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
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return json;
}

export const api = {
  // ─── Public Catalog ────────────────────────────────────────────────────────
  getCities: () => req<any>('GET', '/cities'),

  /** Public PIN check — no auth. Returns `{ serviceable, message?, city? }` inside `data`. */
  validatePincode: async (code: string) => {
    const digits = String(code ?? '').replace(/\D/g, '').slice(0, 6);
    const res = await fetch(`${BASE}/serviceability/pincode?${new URLSearchParams({ code: digits })}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? 'Request failed');
    return json.data as {
      serviceable: boolean;
      message?: string;
      city?: { id: string; name: string; state: string; slug?: string };
    };
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

  // ─── Notifications (email + in-app; email via templates / checkout) ───────
  getNotifications: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return req<any>('GET', `/notifications${q}`);
  },
  markNotificationRead: (id: string) => req<any>('PATCH', `/notifications/${id}/read`),
  markAllNotificationsRead: () => req<any>('PATCH', '/notifications/mark-all-read'),
  removeNotification: (id: string) => req<any>('DELETE', `/notifications/${id}`),
};
