import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { adminLogin } from "./admin";
import {
  apiLoginAdmin,
  fetchFirstMasterOrder,
  type MasterOrderRow,
} from "./api";

/** Admin UI: open first available master order detail page. */
export async function openFirstAdminOrderDetail(
  page: Page,
  request: APIRequestContext
): Promise<MasterOrderRow | null> {
  const token = await apiLoginAdmin(request);
  if (!token) return null;

  const order = await fetchFirstMasterOrder(request, token);
  if (!order?._id) return null;

  await adminLogin(page);
  await page.goto(`/admin/orders/${order._id}`);
  await page.waitForSelector(".wf-section, .admin-order-steps-nav", { timeout: 30_000 });
  return order;
}

export async function expectAdminOrderStepNav(page: Page) {
  const nav = page.locator(".admin-order-steps-nav");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: /overview/i })).toBeVisible();
  await expect(nav.getByRole("link", { name: /vendor/i })).toBeVisible();
  await expect(nav.getByRole("link", { name: /status/i })).toBeVisible();
}
