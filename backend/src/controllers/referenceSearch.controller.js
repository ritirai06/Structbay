const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const BulkEnquiry = require('../models/BulkEnquiry');
const ConcreteRFQ = require('../models/ConcreteRFQ');
const FinanceLead = require('../models/FinanceLead');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const City = require('../models/City');
const VendorInvoice = require('../models/VendorInvoice');
const ReferenceAllocation = require('../models/ReferenceAllocation');
const OrderDocument = require('../models/OrderDocument');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/v1/admin/reference-search?q=ORD080626001&limit=10
 * Cross-module lookup for Structbay reference numbers (admin).
 */
exports.searchReferences = asyncHandler(async (req, res) => {
  const raw = (req.query.q || '').trim();
  if (raw.length < 2) {
    throw new AppError('Query must be at least 2 characters.', 400);
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  const rx = new RegExp(escapeRegex(raw), 'i');

  const [
    orders,
    vendorOrders,
    bulkEnquiries,
    concreteRfqs,
    shipments,
    financeApplications,
    customers,
    vendorsLegacy,
    products,
    cities,
    vendorInvoices,
    orderDocuments,
    allocations,
  ] = await Promise.all([
    Order.find({
      $or: [
        { orderNumber: rx },
        { customerInvoiceNumber: rx },
        { ewayBillNumber: rx },
        { deliveryChallanNumber: rx },
      ],
    }).limit(limit).select(
      'orderNumber status grandTotal paymentStatus createdAt customerInvoiceNumber ewayBillNumber deliveryChallanNumber'
    ).lean(),
    VendorOrder.find({ orderNumber: rx }).limit(limit).select('orderNumber status totalAmount createdAt').lean(),
    BulkEnquiry.find({ enquiryNumber: rx }).limit(limit).select('enquiryNumber status customerName createdAt').lean(),
    ConcreteRFQ.find({ rfqNumber: rx }).limit(limit).select('rfqNumber status customerName city createdAt').lean(),
    Shipment.find({ shipmentNumber: rx }).limit(limit).select('shipmentNumber status trackingNumber createdAt').lean(),
    FinanceLead.find({ financeNumber: rx }).limit(limit).select('financeNumber status name mobile createdAt').lean(),
    User.find({ referenceNumber: rx }).limit(limit).select('referenceNumber name email role companyName createdAt').lean(),
    Vendor.find({ referenceNumber: rx }).limit(limit).select('referenceNumber companyName email createdAt').lean(),
    Product.find({ referenceNumber: rx }).limit(limit).select('referenceNumber name sku status createdAt').lean(),
    City.find({ referenceNumber: rx }).limit(limit).select('referenceNumber name state status createdAt').lean(),
    VendorInvoice.find({
      $or: [{ invoiceNumber: rx }, { vendorTaxInvoiceNumber: rx }],
    }).limit(limit).select('invoiceNumber vendorTaxInvoiceNumber status totalAmount createdAt').lean(),
    OrderDocument.find({ documentReference: rx }).limit(limit).select('documentReference documentType masterOrder vendorOrder createdAt').lean(),
    ReferenceAllocation.find({ referenceNumber: rx }).limit(limit).lean(),
  ]);

  return ApiResponse.success(res, 200, 'Reference search results.', {
    query: raw,
    orders,
    vendorOrders,
    bulkEnquiries,
    concreteRfqs,
    shipments,
    financeApplications,
    customers,
    vendorsLegacy,
    products,
    cities,
    vendorInvoices,
    orderDocuments,
    allocations,
  });
});

module.exports = { searchReferences: exports.searchReferences };
