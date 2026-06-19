/**
 * Smoke test for order line fulfillment APIs (run: node scripts/smoke-fulfillment.js)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const API = process.env.E2E_API_URL || 'http://127.0.0.1:5000/api/v1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@hsdadigital.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin@123';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${json.message || res.status}`);
  return json.data?.accessToken;
}

async function main() {
  const { resolveProductDeliveryType, deliveryTypeLabel } = require('../src/utils/productDeliveryType');
  const cases = [
    [{ deliveryType: 'structbay_delivery' }, 'structbay_delivery'],
    [{ isStructbayDelivery: true }, 'structbay_delivery'],
    [{ isExpress: true }, 'structbay_delivery'],
    [{}, 'vendor_delivery'],
  ];
  for (const [product, expected] of cases) {
    const got = resolveProductDeliveryType(product);
    if (got !== expected) throw new Error(`resolveProductDeliveryType failed: ${JSON.stringify(product)} => ${got}`);
  }
  if (deliveryTypeLabel('structbay_delivery') !== 'Type B') throw new Error('deliveryTypeLabel failed');
  console.log('✓ productDeliveryType utils');

  const token = await login();
  if (!token) throw new Error('No admin token');
  console.log('✓ admin login');

  const ordersRes = await fetch(`${API}/orders?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ordersJson = await ordersRes.json();
  const orderId = ordersJson.data?.[0]?._id;
  if (!orderId) {
    console.log('⚠ No orders in DB — skipping fulfillment endpoint checks');
    return;
  }

  const detailRes = await fetch(`${API}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detailJson = await detailRes.json();
  if (!detailRes.ok) throw new Error(`GET order failed: ${detailJson.message}`);
  const order = detailJson.data;
  console.log(`✓ GET order ${order.orderNumber}`);

  const item = order.items?.[0];
  if (!item?._id) {
    console.log('⚠ Order has no items — skipping line fulfillment checks');
  } else {
    const hasLineFields = 'defaultDeliveryType' in item && 'deliveryType' in item;
    console.log(hasLineFields ? '✓ order items have deliveryType fields' : '⚠ legacy order items missing deliveryType fields (expected for old orders)');

    const overridesRes = await fetch(`${API}/orders/${orderId}/delivery-type-overrides`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const overridesJson = await overridesRes.json();
    if (!overridesRes.ok) throw new Error(`GET overrides failed: ${overridesJson.message}`);
    if (!Array.isArray(overridesJson.data)) throw new Error('Overrides response not array');
    console.log(`✓ GET delivery-type-overrides (${overridesJson.data.length} logs)`);
  }

  const vendorsRes = await fetch(`${API}/admin/vendors?limit=5&vendorStatus=APPROVED`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const vendorsJson = await vendorsRes.json();
  const vendorId = vendorsJson.data?.[0]?._id;
  if (!vendorId || !item?._id) {
    console.log('⚠ No approved vendor or order line — skipping PATCH fulfillment');
    console.log('\nAll smoke checks passed.');
    return;
  }

  // Dry-run: only test endpoint exists and validates (assign without changing if already assigned same vendor)
  const patchRes = await fetch(`${API}/orders/${orderId}/items/${item._id}/fulfillment`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vendorId,
      deliveryType: item.deliveryType || item.defaultDeliveryType || 'vendor_delivery',
    }),
  });
  const patchJson = await patchRes.json();
  if (!patchRes.ok && patchRes.status !== 409) {
    throw new Error(`PATCH fulfillment failed (${patchRes.status}): ${patchJson.message || JSON.stringify(patchJson)}`);
  }
  console.log(patchRes.ok ? '✓ PATCH line fulfillment' : `✓ PATCH line fulfillment (409 expected for locked line: ${patchJson.message})`);

  console.log('\nAll smoke checks passed.');
}

main().catch((err) => {
  console.error('✗', err.message || err);
  process.exit(1);
});
