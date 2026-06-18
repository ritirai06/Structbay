import { test, expect } from "@playwright/test";
import { API_URL } from "../helpers/storefront";

test.describe("API health & public endpoints", () => {
  test("GET /health returns ok", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success ?? body.status ?? body.ok).toBeTruthy();
  });

  test("GET /cities returns active cities", async ({ request }) => {
    const res = await request.get(`${API_URL}/cities`, { params: { status: "ACTIVE", limit: "5" } });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.data)).toBeTruthy();
  });

  test("GET /categories is reachable", async ({ request }) => {
    const res = await request.get(`${API_URL}/categories`, { params: { limit: "5" } });
    expect(res.ok()).toBeTruthy();
  });

  test("GET /products returns catalog for city", async ({ request }) => {
    const cities = await request.get(`${API_URL}/cities`, { params: { status: "ACTIVE", limit: "1" } });
    const cityJson = await cities.json();
    const cityId = cityJson.data?.[0]?._id;
    test.skip(!cityId, "No active city in database — seed cities first");

    const res = await request.get(`${API_URL}/products`, {
      params: { cityId: String(cityId), limit: "5" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.data)).toBeTruthy();
  });
});
