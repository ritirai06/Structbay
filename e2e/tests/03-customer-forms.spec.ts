import { test, expect } from "@playwright/test";
import { dismissOverlays, fetchAnnouncementDismissMap, fetchFirstActiveCity, prepareStorefront } from "../helpers/storefront";

test.describe("Customer forms (PRD lead flows)", () => {
  let city: Awaited<ReturnType<typeof fetchFirstActiveCity>>;
  let announcementDismissMap: Record<string, string> | null;

  test.beforeAll(async ({ request }) => {
    city = await fetchFirstActiveCity(request);
    announcementDismissMap = await fetchAnnouncementDismissMap(request);
  });

  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page, city, announcementDismissMap);
  });

  test("RFQ form renders required fields", async ({ page }) => {
    await page.goto("/rfq");
    await dismissOverlays(page);
    await expect(page.getByText(/your name/i).first()).toBeVisible();
    await expect(page.getByText(/phone number/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit rfq/i }).first()).toBeVisible();
  });

  test("Bulk enquiry form renders", async ({ page }) => {
    await page.goto("/bulk-enquiry");
    await dismissOverlays(page);
    await expect(page.getByRole("heading", { name: /bulk/i })).toBeVisible();
    await expect(
      page.getByLabel(/name|company|phone|email/i).or(page.getByPlaceholder(/name|phone|email/i)).first()
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /excel template/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pdf template/i })).toBeVisible();
  });

  test("Finance lead form renders", async ({ page }) => {
    await page.goto("/finance");
    await dismissOverlays(page);
    await expect(page.getByRole("heading", { name: /builder finance/i }).first()).toBeVisible();
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("Track order form renders", async ({ page }) => {
    await page.goto("/track");
    await dismissOverlays(page);
    await expect(
      page.getByPlaceholder(/order/i).or(page.getByLabel(/order/i)).first()
    ).toBeVisible();
  });
});
