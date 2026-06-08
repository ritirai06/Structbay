const BASE = '/api/v1/customer';

function token() {
  return localStorage.getItem('customer_token') ?? '';
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

  getCategoryDetails: (slug: string, cityId?: string) => {
    const q = cityId ? `?cityId=${cityId}` : '';
    return req<any>('GET', `/category/${slug}${q}`);
  },

  getBrandDetails: (slug: string, cityId?: string) => {
    const q = cityId ? `?cityId=${cityId}` : '';
    return req<any>('GET', `/brand/${slug}${q}`);
  },

  globalSearch: (query: string, cityId?: string) => {
    const params = new URLSearchParams({ q: query });
    if (cityId) params.append('cityId', cityId);
    return req<any>('GET', `/search?${params.toString()}`);
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

  // ─── Orders ─────────────────────────────────────────────────────────────────
  getOrders: () => req<any>('GET', '/orders'),
  getOrder: (id: string) => req<any>('GET', `/orders/${id}`),
};
