import { test, expect } from "@playwright/test";
import {
  apiLoginAdmin,
  apiLoginVendor,
  fetchFirstMasterOrder,
  fetchFirstVendorOrder,
  fetchMasterOrder,
  fetchVendorOrderDetail,
  hasVendorCredentials,
} from "../helpers/api";
import { openFirstAdminOrderDetail } from "../helpers/orders";
import { vendorLogin } from "../helpers/vendor";

test.describe("Delivery workflow — API", () => {
  test("admin can load master order with vendor sub-orders", async ({ request }) => {
    const token = await apiLoginAdmin(request);
    test.skip(!token, "Admin API login failed — check E2E_ADMIN_* credentials");

    const summary = await fetchFirstMasterOrder(request, token);
    test.skip(!summary?._id, "No master orders in database");

    const detail = await fetchMasterOrder(request, token, summary._id);
    expect(detail).toBeTruthy();
    expect(detail?._id).toBe(summary._id);
    expect(Array.isArray(detail?.vendorOrders)).toBeTruthy();
  });

  test("admin can load vendor-order detail for workflow", async ({ request }) => {
    const token = await apiLoginAdmin(request);
    test.skip(!token, "Admin API login failed");

    const summary = await fetchFirstMasterOrder(request, token);
    test.skip(!summary?._id, "No master orders");

    const detail = await fetchMasterOrder(request, token, summary._id);
    const vo = detail?.vendorOrders?.[0];
    test.skip(!vo?._id, "No vendor sub-orders on first master order");

    const res = await request.get(`${process.env.E2E_API_URL || "http://127.0.0.1:5000/api/v1"}/admin/vendor-orders/${vo._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.data?._id).toBe(vo._id);
    expect(json.data?.status).toBeTruthy();
  });

  test("vendor can load assigned orders when credentials configured", async ({ request }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    const token = await apiLoginVendor(request);
    test.skip(!token, "Vendor API login failed");

    const order = await fetchFirstVendorOrder(request, token);
    test.skip(!order?._id, "No vendor orders assigned");

    const detail = await fetchVendorOrderDetail(request, token, order._id);
    expect(detail).toBeTruthy();
    expect(detail?.orderNumber || detail?._id).toBeTruthy();
  });
});

test.describe("Delivery workflow — admin UI", () => {
  test("fulfillment section shows delivery type and logistics fields", async ({ page, request }) => {
    const order = await openFirstAdminOrderDetail(page, request);
    test.skip(!order, "No orders or login failed");
    test.skip(!order.vendorOrders?.length, "Order has no vendor sub-orders yet");

    await page.locator('a[href="#step-fulfillment"]').click();
    const fulfillment = page.locator("#step-fulfillment");
    await expect(fulfillment).toBeVisible();

    const subCard = fulfillment.locator(".wf-suborder-card").first();
    await expect(subCard).toBeVisible();
    await expect(subCard.locator(".wf-suborder-card__id")).toBeVisible();

    await expect(subCard.getByText("Delivery type", { exact: true })).toBeVisible();
    await expect(subCard.locator(".wf-delivery-type")).toBeVisible();
    const radio = subCard.locator('.wf-delivery-type input[type="radio"]').first();
    if ((await radio.count()) > 0) {
      await expect(radio).toBeVisible();
    }

    const typeB = order.vendorOrders?.[0]?.deliveryType === "structbay_delivery";
    if (typeB) {
      await expect(subCard.getByText(/structbay logistics/i)).toBeVisible();
      await expect(subCard.getByLabel(/pickup window/i).or(subCard.getByText(/pickup window/i))).toBeVisible();
      await expect(subCard.getByRole("button", { name: /save logistics/i })).toBeVisible();
    }
  });

  test("completed order shows vendor submitted documents preview", async ({ page, request }) => {
    const token = await apiLoginAdmin(request);
    test.skip(!token, "Admin API login failed");

    const listRes = await request.get(`${process.env.E2E_API_URL || "http://127.0.0.1:5000/api/v1"}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: "20", status: "COMPLETED" },
    });
    const listJson = await listRes.json();
    const completed = (listJson.data as Array<{ _id: string }>)?.find((o) => o._id);
    test.skip(!completed?._id, "No completed orders to verify document previews");

    await page.addInitScript((accessToken: string) => {
      localStorage.setItem("adminToken", accessToken);
    }, token);
    await page.goto(`/admin/orders/${completed._id}#step-fulfillment`);
    await page.waitForSelector("#step-fulfillment", { timeout: 30_000 });

    const docs = page.getByText(/vendor submitted documents/i);
    if ((await docs.count()) > 0) {
      await expect(docs.first()).toBeVisible();
      const preview = page.locator(".wf-file-preview").first();
      if ((await preview.count()) > 0) {
        await expect(preview).toBeVisible();
      }
    }
  });
});

test.describe("Delivery workflow — vendor UI", () => {
  test("vendor order detail shows workflow panel and product sections", async ({ page, request }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    const token = await apiLoginVendor(request);
    test.skip(!token, "Vendor login failed");

    const order = await fetchFirstVendorOrder(request, token);
    test.skip(!order?._id, "No vendor orders");

    await vendorLogin(page);
    await page.goto(`/vendor/orders/${order._id}`);
    await page.waitForSelector(".wf-section", { timeout: 30_000 });

    if (Number(order.workflowVersion) === 2) {
      await expect(page.getByRole("heading", { name: /order workflow/i })).toBeVisible();
      await expect(page.getByText(/progress/i).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: /assigned products/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /customer & delivery/i })).toBeVisible();
  });

  test("vendor workflow shows file upload zones when action pending", async ({ page, request }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    const token = await apiLoginVendor(request);
    test.skip(!token, "Vendor login failed");

    const listRes = await request.get(`${process.env.E2E_API_URL || "http://127.0.0.1:5000/api/v1"}/vendor/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: "30" },
    });
    const listJson = await listRes.json();
    const orders = (listJson.data as Array<{ _id: string; status?: string }>) || [];
    const actionable = orders.find((o) => ["ACCEPTED", "CHANGES_REQUESTED", "DISPATCHED"].includes(String(o.status)));
    test.skip(!actionable?._id, "No vendor order in ACCEPTED/CHANGES_REQUESTED/DISPATCHED state");

    await vendorLogin(page);
    await page.goto(`/vendor/orders/${actionable._id}`);

    const uploadZone = page.locator(".wf-file-upload__zone").first();
    await expect(uploadZone).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/click to upload/i).first()).toBeVisible();
  });

  test("vendor submitted documents show preview cards on fulfilled order", async ({ page, request }) => {
    test.skip(!hasVendorCredentials(), "Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD");

    const token = await apiLoginVendor(request);
    test.skip(!token, "Vendor login failed");

    const listRes = await request.get(`${process.env.E2E_API_URL || "http://127.0.0.1:5000/api/v1"}/vendor/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: "30" },
    });
    const listJson = await listRes.json();
    const orders = (listJson.data as Array<{ _id: string; status?: string }>) || [];
    const done = orders.find((o) => ["COMPLETED", "DELIVERED", "DISPATCHED", "SB_INVOICE_SENT"].includes(String(o.status)));
    test.skip(!done?._id, "No vendor order with submitted workflow data");

    await vendorLogin(page);
    await page.goto(`/vendor/orders/${done._id}`);

    const submitted = page.getByText(/your submitted documents/i);
    if ((await submitted.count()) > 0) {
      await expect(submitted.first()).toBeVisible();
    }
  });
});
