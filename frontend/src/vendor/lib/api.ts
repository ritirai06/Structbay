const BASE = '/api/v1/vendor';

function token() {
  return localStorage.getItem('vendor_token') ?? '';
}

async function req<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token()}` };
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
  // ── Auth ────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    req<any>('POST', '/auth/login', { email, password }),
  logout: () => req<any>('POST', '/auth/logout'),
  me: () => req<any>('GET', '/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<any>('PUT', '/auth/change-password', { currentPassword, newPassword }),

  // ── Dashboard ───────────────────────────────────────────────────────────
  dashboard: () => req<any>('GET', '/dashboard'),
  analytics: (period = '30') => req<any>('GET', `/dashboard/analytics?period=${period}`),

  // ── Profile ─────────────────────────────────────────────────────────────
  getProfile: () => req<any>('GET', '/profile'),
  updateProfile: (data: Record<string, unknown>) => req<any>('PUT', '/profile', data),
  uploadProfileImage: (form: FormData) => req<any>('POST', '/profile/image', form, true),

  // ── Orders ──────────────────────────────────────────────────────────────
  getOrders: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<any>('GET', `/orders${q}`);
  },
  getOrder: (id: string) => req<any>('GET', `/orders/${id}`),
  updateOrderStatus: (id: string, status: string, remarks?: string) =>
    req<any>('PUT', `/orders/${id}/status`, { status, remarks }),
  searchOrders: (body: Record<string, unknown>) => req<any>('POST', '/orders/search', body),
  getOrderHistory: (page = 1) =>
    req<any>('GET', `/orders/history?page=${page}&limit=20`),

  // ── Invoices ────────────────────────────────────────────────────────────
  getInvoices: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<any>('GET', `/invoices${q}`);
  },
  getInvoiceByOrder: (orderId: string) => req<any>('GET', `/invoices/order/${orderId}`),
  uploadInvoice: (form: FormData) => req<any>('POST', '/invoices', form, true),
  replaceInvoice: (id: string, form: FormData) =>
    req<any>('PUT', `/invoices/${id}/replace`, form, true),
  downloadInvoice: (id: string) => req<any>('GET', `/invoices/${id}/download`),

  // ── Dispatch ────────────────────────────────────────────────────────────
  getDispatches: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<any>('GET', `/dispatch${q}`);
  },
  getDispatchByOrder: (orderId: string) => req<any>('GET', `/dispatch/order/${orderId}`),
  createDispatch: (body: Record<string, unknown>) => req<any>('POST', '/dispatch', body),
  updateDispatchStatus: (id: string, body: Record<string, unknown>) =>
    req<any>('PUT', `/dispatch/${id}/status`, body),
  uploadDispatchDoc: (id: string, form: FormData) =>
    req<any>('POST', `/dispatch/${id}/documents`, form, true),
  uploadDeliveryProof: (id: string, form: FormData) =>
    req<any>('POST', `/dispatch/${id}/delivery-proof`, form, true),

  // ── Documents ───────────────────────────────────────────────────────────
  getDocuments: (type?: string) =>
    req<any>('GET', `/documents${type ? `?type=${type}` : ''}`),
  uploadDocument: (form: FormData) => req<any>('POST', '/documents', form, true),
  deleteDocument: (id: string) => req<any>('DELETE', `/documents/${id}`),

  // ── Notifications ───────────────────────────────────────────────────────
  getNotifications: (filter = 'all', page = 1) =>
    req<any>('GET', `/notifications?filter=${filter}&page=${page}&limit=20`),
  markRead: (id: string) => req<any>('PUT', `/notifications/${id}/read`),
  markAllRead: () => req<any>('PUT', '/notifications/read-all'),
  archiveNotification: (id: string) => req<any>('PUT', `/notifications/${id}/archive`),

  // ── Activity Logs ────────────────────────────────────────────────────────
  getActivityLogs: (page = 1) => req<any>('GET', `/activity-logs?page=${page}`),

  // ── Support ─────────────────────────────────────────────────────────────
  submitSupportTicket: (data: { subject: string; priority: string; description: string }) =>
    req<any>('POST', '/support', data),

  // ── CMS Contact Info ────────────────────────────────────────────────────
  getContact: () => fetch('/api/v1/cms/contact').then(r => r.json()),
};
