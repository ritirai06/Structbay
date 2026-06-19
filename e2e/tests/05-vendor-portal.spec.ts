import { test, expect } from "@playwright/test";
import { apiLoginVendor, fetchFirstVendorOrder, hasVendorCredentials } from "../helpers/api";
import { vendorLogin } from "../helpers/vendor";

test.describe("Vendor portal (PRD fulfillment)", () => {
  test("vendor login page loads", async ({ page }) => {
    await page.goto("/vendor/login");
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("unauthenticated vendor routes redirect to login", async ({ page }) => {
    await page.goto("/vendor/orders");
    await expect(page).toHaveURL(/\/vendor\/login/);
  });

  test("vendor can sign in and reach dashboard", async ({ page }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD in e2e/.env");

    await vendorLogin(page);
    await expect(page).toHaveURL(/\/vendor(?!\/login)/);
    await expect(page.locator("nav, aside").first()).toBeVisible();
  });

  test("vendor orders list loads after login", async ({ page }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    await vendorLogin(page);
    await page.goto("/vendor/orders");
    await expect(page.getByRole("heading", { name: /assigned orders|orders/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("vendor can open order detail with new layout", async ({ page, request }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    const token = await apiLoginVendor(request);
    test.skip(!token, "Vendor API login failed");

    const order = await fetchFirstVendorOrder(request, token);
    test.skip(!order?._id, "No vendor orders assigned");

    await vendorLogin(page);
    await page.goto(`/vendor/orders/${order._id}`);

    await expect(page.locator(".wf-section").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /assigned products/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /customer & delivery/i })).toBeVisible();

    if (Number(order.workflowVersion) === 2) {
      await expect(page.getByRole("heading", { name: /order workflow/i })).toBeVisible();
    }
  });
});
