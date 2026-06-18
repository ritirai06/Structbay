import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "./storefront";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./admin";

export const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || "";
export const VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || "";

export function hasVendorCredentials() {
  return Boolean(VENDOR_EMAIL && VENDOR_PASSWORD);
}

export type MasterOrderRow = {
  _id: string;
  orderNumber?: string;
  status?: string;
  vendorOrders?: Array<{ _id: string; orderNumber?: string; status?: string; deliveryType?: string }>;
};

export async function apiLoginAdmin(request: APIRequestContext): Promise<string | null> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: { accessToken?: string } };
  return json.data?.accessToken ?? null;
}

export async function apiLoginVendor(request: APIRequestContext): Promise<string | null> {
  if (!VENDOR_EMAIL || !VENDOR_PASSWORD) return null;
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: VENDOR_EMAIL, password: VENDOR_PASSWORD },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: { accessToken?: string; user?: { role?: string } } };
  if (json.data?.user?.role !== "VENDOR") return null;
  return json.data?.accessToken ?? null;
}

export async function fetchFirstMasterOrder(
  request: APIRequestContext,
  adminToken: string
): Promise<MasterOrderRow | null> {
  const res = await request.get(`${API_URL}/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { limit: "10", page: "1" },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: MasterOrderRow[] };
  return json.data?.[0] ?? null;
}

export async function fetchMasterOrder(
  request: APIRequestContext,
  adminToken: string,
  orderId: string
): Promise<MasterOrderRow | null> {
  const res = await request.get(`${API_URL}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: MasterOrderRow };
  return json.data ?? null;
}

export async function fetchFirstVendorOrder(
  request: APIRequestContext,
  vendorToken: string
): Promise<{ _id: string; orderNumber?: string; status?: string; workflowVersion?: number } | null> {
  const res = await request.get(`${API_URL}/vendor/orders`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
    params: { limit: "10", page: "1" },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: Array<{ _id: string; orderNumber?: string; status?: string; workflowVersion?: number }> };
  return json.data?.[0] ?? null;
}

export async function fetchVendorOrderDetail(
  request: APIRequestContext,
  vendorToken: string,
  orderId: string
) {
  const res = await request.get(`${API_URL}/vendor/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return json.data ?? null;
}
