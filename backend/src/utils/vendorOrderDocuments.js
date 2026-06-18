const ShippingLabel = require('../models/ShippingLabel');

/**
 * StructBay-generated files available to the vendor for a sub-order.
 * Shipping labels are withheld until admin explicitly shares them (Type A only).
 * @param {import('mongoose').Document|object} vendorOrder
 * @returns {Promise<object>}
 */
async function buildVendorOrderDocuments(vendorOrder) {
  const vo = vendorOrder?.toObject ? vendorOrder.toObject() : vendorOrder || {};
  const out = vo.structbayOutboundDocs || {};

  const label = vo._id
    ? await ShippingLabel.findOne({
        vendorOrder: vo._id,
        status: { $ne: 'VOID' },
      })
        .select('labelUrl shipmentId sharedWithVendor sharedAt')
        .lean()
    : null;

  const invoiceUrl = out.invoicePdfUrl || '';
  const ewayUrl = out.ewayBillPdfUrl || '';
  const labelGenerated = Boolean(label?.labelUrl);
  const labelShared = Boolean(label?.sharedWithVendor);
  const shippingLabelUrl = labelShared && label?.labelUrl ? label.labelUrl : '';

  return {
    invoice_url: invoiceUrl,
    invoice_number: out.invoiceNumber || '',
    eway_bill_url: ewayUrl,
    eway_bill_number: out.ewayBillNumber || '',
    shipping_label_url: shippingLabelUrl || null,
    shipment_id: labelShared ? (label?.shipmentId || '') : '',
    shipping_label_generated: labelGenerated,
    shipping_label_shared_with_vendor: labelShared,
    shipping_label_shared_at: labelShared ? (label?.sharedAt || null) : null,
    sent_at: out.sentAt || null,
    has_any: Boolean(invoiceUrl || ewayUrl || shippingLabelUrl),
    has_all: Boolean(invoiceUrl && ewayUrl),
  };
}

module.exports = { buildVendorOrderDocuments };
