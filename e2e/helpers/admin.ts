import type { Page } from "@playwright/test";

export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ||
  process.env.SEED_ADMIN_EMAIL ||
  "admin@hsdadigital.com";

export const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  "admin@123";

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByRole("heading", { name: /admin sign in/i }).waitFor({ timeout: 15_000 });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in to admin panel/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
}
