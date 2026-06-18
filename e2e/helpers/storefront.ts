import type { APIRequestContext, Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL || "http://127.0.0.1:5000/api/v1";

export type CitySeed = { id: string; name: string; state?: string; slug?: string };

export async function fetchFirstActiveCity(request: APIRequestContext): Promise<CitySeed | null> {
  try {
    const res = await request.get(`${API_URL}/cities`, {
      params: { status: "ACTIVE", limit: "10" },
    });
    if (!res.ok()) return null;
    const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const row = json.data?.[0];
    if (!row?._id || !row?.name) return null;
    return {
      id: String(row._id),
      name: String(row.name),
      state: row.state ? String(row.state) : "",
      slug: row.slug ? String(row.slug) : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchAnnouncementDismissMap(
  request: APIRequestContext
): Promise<Record<string, string> | null> {
  try {
    const res = await request.get(`${API_URL}/cms/announcements`, {
      params: { status: "ACTIVE", liveOnly: "true", limit: "20" },
    });
    if (!res.ok()) return null;
    const json = (await res.json()) as { data?: Array<{ _id?: string }> };
    const ids = (json.data || []).map((a) => String(a._id)).filter(Boolean);
    if (!ids.length) return null;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const map: Record<string, string> = {};
    ids.forEach((id) => {
      map[id] = today;
    });
    return map;
  } catch {
    return null;
  }
}

/** Skip city modal / onboarding gate so storefront pages load for tests. */
export async function prepareStorefront(
  page: Page,
  city: CitySeed | null,
  announcementDismissMap: Record<string, string> | null = null
) {
  await page.addInitScript(
    (payload: { c: CitySeed | null; dismissMap: Record<string, string> | null }) => {
      localStorage.setItem("sb_location_choice_made", "1");
      sessionStorage.setItem("sb_onboarding_gate_passed", "1");
      localStorage.setItem("structbay_storefront_promo_suppressed_until", String(Date.now() + 86_400_000));
      if (payload.dismissMap) {
        localStorage.setItem("structbay_announcement_dismiss_day_map", JSON.stringify(payload.dismissMap));
      }
      if (payload.c) {
        localStorage.setItem(
          "sb_selected_city",
          JSON.stringify({
            id: payload.c.id,
            name: payload.c.name,
            state: payload.c.state || "",
            slug: payload.c.slug || "",
          })
        );
      }
    },
    { c: city, dismissMap: announcementDismissMap }
  );
}

export async function dismissOverlays(page: Page) {
  await page.waitForLoadState("domcontentloaded");

  const announcement = page.locator('[aria-labelledby="announcement-dialog-title"]');
  for (let i = 0; i < 3; i++) {
    if (!(await announcement.isVisible({ timeout: 1500 }).catch(() => false))) break;
    await page.getByRole("button", { name: /close announcements/i }).click({ force: true }).catch(() => undefined);
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(250);
  }

  const promoClose = page.getByRole("button", { name: /close promotion/i });
  if (await promoClose.isVisible({ timeout: 500 }).catch(() => false)) {
    await promoClose.click({ force: true }).catch(() => undefined);
  }
}
