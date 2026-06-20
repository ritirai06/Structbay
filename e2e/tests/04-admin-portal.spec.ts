import { test, expect } from "@playwright/test";
import { adminLogin } from "../helpers/admin";
import { openFirstAdminOrderDetail, expectAdminOrderStepNav } from "../helpers/orders";

test.describe("Admin portal (PRD operations)", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("admin can sign in and reach dashboard", async ({ page }) => {
    await adminLogin(page);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("aside, nav").first()).toBeVisible();
  });

  test("order management list loads", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /order/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("table, [role='table']").first()).toBeVisible({ timeout: 20_000 });
  });

  test("order detail page — new workflow layout", async ({ page, request }) => {
    const order = await openFirstAdminOrderDetail(page, request);
    test.skip(!order, "No orders in database or admin API login failed");

    await expect(page.locator("h1").filter({ hasText: /order/i }).first()).toBeVisible();
    await expectAdminOrderStepNav(page);

    const overview = page.locator("#step-overview");
    await expect(overview).toBeVisible();
    await expect(overview.getByRole("heading", { name: /order overview/i })).toBeVisible();
    await expect(overview.getByText("Line items", { exact: true })).toBeVisible();
    await expect(overview.getByText("Tracking notes", { exact: true })).toBeVisible();
    await expect(overview.locator(".wf-info-tile").first()).toBeVisible();

    await page.locator('a[href="#step-vendor"]').click();
    const vendor = page.locator("#step-vendor");
    await expect(vendor.getByRole("heading", { name: /assign vendors/i })).toBeVisible();
    await expect(vendor.getByText("Product", { exact: true })).toBeVisible();
    await expect(vendor.getByText("Default", { exact: true })).toBeVisible();
    await expect(vendor.getByRole("button", { name: /save all lines/i })).toBeVisible();

    if (order.vendorOrders?.length) {
      await expect(page.locator('a[href="#step-fulfillment"]')).toBeVisible();
      await page.locator('a[href="#step-fulfillment"]').click();
      const fulfillment = page.locator("#step-fulfillment");
      await expect(fulfillment.getByRole("heading", { name: /fulfillment/i })).toBeVisible();
      await expect(fulfillment.locator(".wf-suborder-card").first()).toBeVisible();
      const radios = fulfillment.locator('.wf-delivery-type input[type="radio"]');
      if ((await radios.count()) > 0) {
        await expect(radios.first()).toBeVisible();
      }
    }

    await page.locator('a[href="#step-status"]').click();
    const status = page.locator("#step-status");
    await expect(status.getByText("Master order status", { exact: false })).toBeVisible();
    await expect(status.locator("select")).toBeVisible();

    const stepsNav = page.locator(".admin-order-steps-nav");
    const navBox = await stepsNav.boundingBox();
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);
    const navBoxAfter = await stepsNav.boundingBox();
    expect(navBox).toBeTruthy();
    expect(navBoxAfter).toBeTruthy();
    if (navBox && navBoxAfter) {
      expect(Math.abs(navBoxAfter.y - navBox.y)).toBeLessThan(80);
    }
  });

  test("key admin modules are reachable", async ({ page }) => {
    await adminLogin(page);
    const modules = [
      "/admin/products",
      "/admin/categories",
      "/admin/vendors",
      "/admin/rfqs",
      "/admin/bulk-enquiries",
      "/admin/cms",
    ];
    for (const path of modules) {
      await page.goto(path);
      await expect(page.locator("main, .admin-page, [class*='admin']").first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });
});
