import {
  getVendorAccessToken,
  getVendorRefreshToken,
  refreshVendorAccessToken,
  clearVendorSession,
} from "./authStorage";

const BASE = '/api/v1/vendor';

function token() {
  return getVendorAccessToken();
}

function formatApiError(json: unknown): string {
  const j = json as { message?: unknown; errors?: unknown };
  let msg = j?.message ?? 'Request failed';
  if (typeof msg !== 'string') msg = String(msg);
  if (/no token provided/i.test(msg)) {
    return 'Please sign in to the vendor portal to continue.';
  }
  if (/session expired|refresh your token/i.test(msg)) {
    return 'Your session has expired. Please sign in again.';
  }
  const errs = j?.errors;
  if (Array.isArray(errs) && errs.length) {
    const parts = errs.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    return `${msg} ${parts.join('; ')}`;
  }
  return msg;
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
  if (res.status === 401 && getVendorRefreshToken() && !path.includes('/auth/login')) {
    const ok = await refreshVendorAccessToken();
    if (ok) res = await doFetch();
  }

  const text = await res.text();
  let json: unknown = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(text.slice(0, 200) || `Request failed (${res.status})`);
      throw new Error('Server returned invalid JSON.');
    }
  } else if (!res.ok) {
    if (res.status === 401) clearVendorSession();
    throw new Error(`Request failed (${res.status}). The server returned an empty response.`);
  }

  if (!res.ok) {
    if (res.status === 401) clearVendorSession();
    throw new Error(formatApiError(json));
  }
  return (json ?? { success: true }) as T;
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
  workflowAccept: (id: string) => req<any>('POST', `/orders/${id}/workflow/accept`),
  workflowReject: (id: string, reason?: string) =>
    req<any>('POST', `/orders/${id}/workflow/reject`, { reason }),
  workflowReadyDispatch: (id: string, form: FormData) =>
    req<any>('POST', `/orders/${id}/workflow/ready-dispatch`, form, true),
  workflowMarkDispatched: (id: string, form: FormData) =>
    req<any>('POST', `/orders/${id}/workflow/mark-dispatched`, form, true),
  workflowMarkDelivered: (id: string, form: FormData) =>
    req<any>('POST', `/orders/${id}/workflow/mark-delivered`, form, true),
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
