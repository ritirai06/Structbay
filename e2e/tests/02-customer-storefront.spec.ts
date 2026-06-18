import { test, expect } from "@playwright/test";
import {
  API_URL,
  dismissOverlays,
  fetchAnnouncementDismissMap,
  fetchFirstActiveCity,
  prepareStorefront,
} from "../helpers/storefront";

test.describe("Customer storefront (PRD core flows)", () => {
  let city: Awaited<ReturnType<typeof fetchFirstActiveCity>>;
  let announcementDismissMap: Record<string, string> | null;

  test.beforeAll(async ({ request }) => {
    city = await fetchFirstActiveCity(request);
    announcementDismissMap = await fetchAnnouncementDismissMap(request);
  });

  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page, city, announcementDismissMap);
  });

  test("homepage loads with header and footer", async ({ page }) => {
    await page.goto("/");
    await dismissOverlays(page);
    await expect(page.locator("header.sf-header, header").first()).toBeVisible();
    await expect(page.locator("footer").first()).toBeVisible();
  });

  test("Shop dropdown opens from header (not footer)", async ({ page }) => {
    await page.goto("/");
    await dismissOverlays(page);

    const shopBtn = page.locator("button.sf-nav-shop");
    await expect(shopBtn).toBeVisible();
    const shopBox = await shopBtn.boundingBox();
    await shopBtn.click();

    const menu = page.locator('[role="menu"], [data-radix-menu-content]').first();
    await expect(menu).toBeVisible({ timeout: 10_000 });

    const menuBox = await menu.boundingBox();
    expect(shopBox).toBeTruthy();
    expect(menuBox).toBeTruthy();
    if (shopBox && menuBox) {
      expect(menuBox.y).toBeGreaterThanOrEqual(shopBox.y);
      expect(menuBox.y).toBeLessThan(page.viewportSize()!.height * 0.55);
    }
  });

  test("key static pages render", async ({ page }) => {
    const routes: Array<{ path: string; match: RegExp }> = [
      { path: "/shop", match: /shop all construction|construction materials/i },
      { path: "/rfq", match: /ready mix concrete|concrete rfq/i },
      { path: "/finance", match: /builder finance/i },
      { path: "/blogs", match: /construction guides|insights/i },
      { path: "/track", match: /track your order/i },
      { path: "/privacy", match: /privacy/i },
      { path: "/terms", match: /terms/i },
      { path: "/login", match: /sign in|log in|welcome back/i },
      { path: "/register", match: /create|register|account/i },
      { path: "/cart", match: /cart|empty/i },
    ];

    for (const { path, match } of routes) {
      await page.goto(path);
      await dismissOverlays(page);
      await expect(page.locator("main, body").first()).toContainText(match, { timeout: 20_000 });
    }
  });

  test("category listing and product detail when catalog exists", async ({ page, request }) => {
    test.skip(!city, "No active city");

    const browse = await request.get(`${API_URL}/products`, {
      params: { cityId: city!.id, limit: "1" },
    });
    const browseJson = await browse.json();
    const product = browseJson.data?.[0];
    test.skip(!product?._id, "No products in catalog for selected city");

    const categorySlug =
      product.category?.slug || product.categorySlug || product.category?.name?.toLowerCase?.();
    if (categorySlug) {
      await page.goto(`/category/${encodeURIComponent(categorySlug)}`);
      await dismissOverlays(page);
      await expect(page.locator("main")).toBeVisible();
    }

    await page.goto(`/product/${product._id}`);
    await dismissOverlays(page);
    await expect(page.getByRole("heading").first()).toBeVisible();
    const addBtn = page.getByRole("button", { name: /add to cart|add/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(
        page.getByText(/added|in cart/i).or(page.getByRole("button", { name: /added/i }))
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("search page accepts query", async ({ page }) => {
    await page.goto("/search?q=cement");
    await dismissOverlays(page);
    await expect(page.locator("main")).toContainText(/cement|search|result/i);
  });
});
