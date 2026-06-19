const VALID_DELIVERY_TYPES = ['vendor_delivery', 'structbay_delivery'];

/** Resolve canonical delivery type from product document or plain object. */
function resolveProductDeliveryType(product) {
  if (!product) return 'vendor_delivery';
  const explicit = String(product.deliveryType || '').trim();
  if (VALID_DELIVERY_TYPES.includes(explicit)) return explicit;
  if (product.isStructbayDelivery || product.isExpress || product.structbayDeliverySupported) {
    return 'structbay_delivery';
  }
  return 'vendor_delivery';
}

function deliveryTypeLabel(type) {
  return type === 'structbay_delivery' ? 'Type B' : 'Type A';
}

module.exports = {
  VALID_DELIVERY_TYPES,
  resolveProductDeliveryType,
  deliveryTypeLabel,
};
