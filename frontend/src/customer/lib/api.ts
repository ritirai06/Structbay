import {
  getCustomerAccessToken,
  getCustomerRefreshToken,
  refreshCustomerAccessToken,
  clearCustomerSession,
} from "./authStorage";

const BASE = '/api/v1/customer';

function token() {
  return getCustomerAccessToken();
}

function formatApiError(json: unknown): string {
  const j = json as { message?: unknown; errors?: unknown };
  let msg = j?.message ?? 'Request failed';
  if (typeof msg !== 'string') msg = String(msg);
  if (/no token provided/i.test(msg)) {
    return 'Your session has expired. Please sign in again to continue.';
  }
  const errs = j?.errors;
  if (Array.isArray(errs) && errs.length) {
    const parts = errs.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    return `${msg} ${parts.join('; ')}`;
  }
  return msg;
}

async function reqV1<T>(method: string, path: string, body?: unknown): Promise<T> {
  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    if (body != null && method !== 'GET') headers['Content-Type'] = 'application/json';
    return headers;
  };
  const url = `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  const doFetch = () =>
    fetch(url, {
      method,
      headers: buildHeaders(),
      body: body != null && method !== 'GET' ? JSON.stringify(body) : undefined,
    });
  let res = await doFetch();
  if (res.status === 401 && getCustomerRefreshToken()) {
    const ok = await refreshCustomerAccessToken();
    if (ok) res = await doFetch();
  }
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401) clearCustomerSession();
    throw new Error(formatApiError(json));
  }
  return json as T;
}

async function req<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    if (!isForm && body) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const doFetch = () =>
    fetch(`${BASE}${path}`, {
      method,
      headers: buildHeaders(),
      body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && getCustomerRefreshToken()) {
    const ok = await refreshCustomerAccessToken();
    if (ok) res = await doFetch();
  }

  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401) clearCustomerSession();
    throw new Error(formatApiError(json));
  }
  return json as T;
}

const CMS_HOME_TTL_MS = 2 * 60 * 1000;
let cmsHomeCache: { at: number; data: Record<string, unknown> } | null = null;
let cmsHomeInflight: Promise<Record<string, unknown>> | null = null;

export async function fetchCmsHomepage(forceRefresh = false): Promise<Record<string, unknown>> {
  if (!forceRefresh && cmsHomeCache && Date.now() - cmsHomeCache.at < CMS_HOME_TTL_MS) {
    return cmsHomeCache.data;
  }
  if (!forceRefresh && cmsHomeInflight) return cmsHomeInflight;

  cmsHomeInflight = (async () => {
    const res = await fetch("/api/v1/cms/homepage");
    const json = (await res.json()) as { success?: boolean; message?: string; data?: Record<string, unknown> };
    if (!res.ok) throw new Error(json.message || "Failed to load storefront settings");
    const data = json.data || {};
    cmsHomeCache = { at: Date.now(), data };
    return data;
  })();

  try {
    return await cmsHomeInflight;
  } finally {
    cmsHomeInflight = null;
  }
}

export const api = {
  // ─── Public Catalog ────────────────────────────────────────────────────────
  getCities: () => req<any>('GET', '/cities'),

  /** Public homepage / storefront CMS (top bar, promo modal, hero copy). */
  getCmsHomepage: (forceRefresh = false) => fetchCmsHomepage(forceRefresh),

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

  getProductDetails: (slug: string, cityId?: string, cityName?: string) => {
    const p = new URLSearchParams();
    if (cityId) p.set("cityId", cityId);
    if (cityName) p.set("cityName", cityName);
    const q = p.toString();
    return req<any>("GET", `/products/${slug}${q ? `?${q}` : ""}`);
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
    fetch('/api/v1/cms/banners?status=ACTIVE&limit=20').then(r => r.json()),

  getTestimonials: () =>
    fetch('/api/v1/cms/testimonials?status=ACTIVE&featured=true&limit=6').then(r => r.json()),

  getBlogs: (limit = 6) =>
    fetch(`/api/v1/cms/blogs?status=PUBLISHED&limit=${limit}`).then(r => r.json()),

  getFooter: () =>
    fetch('/api/v1/cms/footer').then(r => r.json()),

  // ─── Customer Auth / Profile ────────────────────────────────────────────────
  getProfile: () => req<any>('GET', '/profile'),
  updateProfile: (data: Record<string, unknown>) => req<any>('PATCH', '/profile', data),

  // ─── Projects ────────────────────────────────────────────────────────────────
  getProjects: () => req<any>('GET', '/projects'),
  getProjectDetails: (id: string) => req<any>('GET', `/projects/${id}`),
  createProject: (data: any) => req<any>('POST', '/projects', data),
  updateProject: (id: string, data: any) => req<any>('PUT', `/projects/${id}`, data),
  deleteProject: (id: string) => req<any>('DELETE', `/projects/${id}`),
  assignOrderToProject: (data: { orderId: string, projectId: string | null }) => req<any>('POST', '/projects/assign-order', data),
  bulkAssignOrdersToProject: (data: { orderIds: string[], projectId: string | null }) => req<any>('POST', '/projects/bulk-assign-orders', data),

  // ─── Saved addresses ───────────────────────────────────────────────────────
  getAddresses: () => req<any>('GET', '/addresses'),
  createAddress: (data: Record<string, unknown>) => req<any>('POST', '/addresses', data),
  updateAddress: (id: string, data: Record<string, unknown>) => req<any>('PATCH', `/addresses/${id}`, data),
  deleteAddress: (id: string) => req<any>('DELETE', `/addresses/${id}`),
  setDefaultAddress: (id: string) => req<any>('PATCH', `/addresses/${id}/set-default`),

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

  // ─── Dashboard ───────────────────────────────────────────────────────────
  getDashboard: () => req<any>('GET', '/dashboard'),

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

  downloadOrderInvoiceFile: async (orderId: string, index: number) => {
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${BASE}/orders/${encodeURIComponent(orderId)}/invoices/${index}/file`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download invoice file';
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

  /** PDF order summary with Structbay logo. */
  downloadOrderInvoicePdf: async (orderId: string) => {
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${BASE}/orders/${encodeURIComponent(orderId)}/invoice-pdf`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download invoice PDF';
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

  /** Themed HTML order summary (download fallback). */
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

  cancelOrder: (id: string, reason?: string) =>
    req<any>('PATCH', `/orders/${id}/cancel`, reason ? { reason } : {}),

  uploadEnquiryDocument: async (file: File) => {
    const fd = new FormData();
    fd.append('document', file);
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch('/api/v1/upload/enquiry-document', { method: 'POST', headers, body: fd });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) clearCustomerSession();
      throw new Error(formatApiError(json));
    }
    return json as { data?: { url?: string; publicId?: string } };
  },

  uploadCustomerDocument: async (file: File) => {
    const fd = new FormData();
    fd.append('document', file);
    const headers: Record<string, string> = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch('/api/v1/upload/customer/document', { method: 'POST', headers, body: fd });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) clearCustomerSession();
      throw new Error(formatApiError(json));
    }
    return json as { data?: { url?: string; publicId?: string } };
  },

  createReplacementRequest: (data: {
    masterOrderId: string;
    reason: 'WRONG_PRODUCT' | 'DAMAGED_PRODUCT';
    description: string;
    vendorOrderId?: string;
  }) => reqV1<any>('POST', '/replacements', data),

  getMyReplacementRequests: () => reqV1<any>('GET', '/replacements/my'),

  getLandingPage: async (slug: string) => {
    const res = await fetch(`/api/v1/cms/landing-pages/${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(formatApiError(json));
    return json;
  },

  submitBulkEnquiry: (data: Record<string, unknown>) =>
    reqV1<any>('POST', '/bulk-enquiries', data),

  // ─── Orders ───────────────────────────────────────────────────────────────
  /** Fetch a single master order by its Mongo _id (used by MockPaymentGateway). */
  getOrderDetails: (orderId: string) =>
    req<any>('GET', `/orders/${encodeURIComponent(orderId)}`),

  /** Low-level authenticated fetch helper (path relative to /api/v1). */
  fetchWithAuth: async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401 && getCustomerRefreshToken()) {
      const ok = await refreshCustomerAccessToken();
      if (ok) {
        const newT = token();
        if (newT) headers.Authorization = `Bearer ${newT}`;
        res = await fetch(url, { ...options, headers });
      }
    }
    if (!res.ok) {
      let json: unknown = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (res.status === 401) clearCustomerSession();
      throw new Error(formatApiError(json as any));
    }
    return res.json();
  },
};

