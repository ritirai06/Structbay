import type { Page } from "@playwright/test";
import { VENDOR_EMAIL, VENDOR_PASSWORD } from "./api";

export function hasVendorCredentials() {
  return Boolean(VENDOR_EMAIL && VENDOR_PASSWORD);
}

export async function vendorLogin(page: Page) {
  if (!hasVendorCredentials()) {
    throw new Error("Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD in e2e/.env");
  }
  await page.goto("/vendor/login");
  await page.getByRole("heading", { name: /^sign in$/i }).waitFor({ timeout: 15_000 });
  await page.locator('input[type="email"]').fill(VENDOR_EMAIL);
  await page.locator('input[type="password"]').fill(VENDOR_PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/vendor(?!\/login)/, { timeout: 30_000 });
}
