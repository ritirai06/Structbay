const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const kpiCtrl        = require('../controllers/kpi.controller');
const salesCtrl      = require('../controllers/salesAnalytics.controller');
const productCtrl    = require('../controllers/productReports.controller');
const customerCtrl   = require('../controllers/customerReports.controller');
const vendorCtrl     = require('../controllers/vendorReports.controller');
const inventoryCtrl  = require('../controllers/inventoryReports.controller');
const enquiryCtrl    = require('../controllers/enquiryReports.controller');
const paymentCtrl    = require('../controllers/paymentReports.controller');
const deliveryCtrl   = require('../controllers/deliveryReports.controller');
const auditCtrl      = require('../controllers/auditCenter.controller');
const exportCtrl     = require('../controllers/exportReports.controller');

const adminOnly   = [protect, requireRole('ADMIN')];
const vendorGuard = [protect, requireRole('ADMIN', 'VENDOR')];

// ─── KPI / Executive Dashboard ────────────────────────────────────────────────
router.get('/kpi',                      ...adminOnly, kpiCtrl.getKPI);
router.get('/kpi/monthly-trend',        ...adminOnly, kpiCtrl.monthlyTrend);
router.get('/kpi/yearly-comparison',    ...adminOnly, kpiCtrl.yearlyComparison);
router.get('/kpi/snapshots',            ...adminOnly, kpiCtrl.getSnapshots);

// ─── Sales Analytics ─────────────────────────────────────────────────────────
router.get('/sales/summary',            ...adminOnly, salesCtrl.summary);
router.get('/sales/trend',              ...adminOnly, salesCtrl.trend);
router.get('/sales/top-products',       ...adminOnly, salesCtrl.topProducts);
router.get('/sales/top-cities',         ...adminOnly, salesCtrl.topCities);
router.get('/sales/top-categories',     ...adminOnly, salesCtrl.topCategories);
router.get('/sales/comparison',         ...adminOnly, salesCtrl.comparison);

// ─── Product Reports ──────────────────────────────────────────────────────────
router.get('/products/top-selling',     ...adminOnly, productCtrl.topSelling);
router.get('/products/low-selling',     ...adminOnly, productCtrl.lowSelling);
router.get('/products/performance',     ...adminOnly, productCtrl.performance);
router.get('/products/assured-express', ...adminOnly, productCtrl.assuredExpressPerformance);
router.get('/products/cancellation',    ...adminOnly, productCtrl.cancellation);

// ─── Brand Reports ────────────────────────────────────────────────────────────
router.get('/brands',                   ...adminOnly, productCtrl.brandReport);

// ─── Category Reports ─────────────────────────────────────────────────────────
router.get('/categories',               ...adminOnly, productCtrl.categoryReport);

// ─── City Reports ─────────────────────────────────────────────────────────────
router.get('/cities',                   ...adminOnly, productCtrl.cityReport);

// ─── Customer Reports ─────────────────────────────────────────────────────────
router.get('/customers/summary',        ...adminOnly, customerCtrl.summary);
router.get('/customers/top',            ...adminOnly, customerCtrl.topCustomers);
router.get('/customers/growth',         ...adminOnly, customerCtrl.growth);
router.get('/customers/clv',            ...adminOnly, customerCtrl.clv);
router.get('/customers/purchase-frequency', ...adminOnly, customerCtrl.purchaseFrequency);
router.get('/customers/retention',      ...adminOnly, customerCtrl.retention);

// ─── Vendor Reports ───────────────────────────────────────────────────────────
router.get('/vendors/summary',          ...adminOnly, vendorCtrl.summary);
router.get('/vendors/performance',      ...adminOnly, vendorCtrl.performance);
router.get('/vendors/ranking',          ...adminOnly, vendorCtrl.ranking);
router.get('/vendors/sla',              ...adminOnly, vendorCtrl.sla);
router.get('/vendors/:vendorId/own',    ...vendorGuard, vendorCtrl.ownReport);

// ─── Inventory Reports ────────────────────────────────────────────────────────
router.get('/inventory/current',        ...adminOnly, inventoryCtrl.currentStock);
router.get('/inventory/low-stock',      ...adminOnly, inventoryCtrl.lowStock);
router.get('/inventory/out-of-stock',   ...adminOnly, inventoryCtrl.outOfStock);
router.get('/inventory/city-wise',      ...adminOnly, inventoryCtrl.cityWise);
router.get('/inventory/movement',       ...adminOnly, inventoryCtrl.stockMovement);
router.get('/inventory/summary',        ...adminOnly, inventoryCtrl.summaryStats);

// ─── Enquiry Reports ──────────────────────────────────────────────────────────
router.get('/enquiries/bulk-summary',   ...adminOnly, enquiryCtrl.bulkSummary);
router.get('/enquiries/bulk-trend',     ...adminOnly, enquiryCtrl.bulkTrend);
router.get('/enquiries/rfq-summary',    ...adminOnly, enquiryCtrl.rfqSummary);
router.get('/enquiries/rfq-trend',      ...adminOnly, enquiryCtrl.rfqTrend);

// ─── Payment Reports ──────────────────────────────────────────────────────────
router.get('/payments/summary',         ...adminOnly, paymentCtrl.summary);
router.get('/payments/trend',           ...adminOnly, paymentCtrl.trend);
router.get('/payments/gst',             ...adminOnly, paymentCtrl.gstReport);
router.get('/payments/method-wise',     ...adminOnly, paymentCtrl.methodWise);
router.get('/payments/refunds',         ...adminOnly, paymentCtrl.refunds);
router.get('/payments/invoices',        ...adminOnly, paymentCtrl.invoiceStatus);

// ─── Delivery Reports ─────────────────────────────────────────────────────────
router.get('/delivery/summary',         ...adminOnly, deliveryCtrl.summary);
router.get('/delivery/on-time',         ...adminOnly, deliveryCtrl.onTime);
router.get('/delivery/partner-performance', ...adminOnly, deliveryCtrl.partnerPerformance);
router.get('/delivery/vendor-wise',     ...adminOnly, deliveryCtrl.vendorWise);
router.get('/delivery/city-wise',       ...adminOnly, deliveryCtrl.cityWise);

// ─── Audit Center ─────────────────────────────────────────────────────────────
router.get('/audit/logs',               ...adminOnly, auditCtrl.getLogs);
router.get('/audit/summary',            ...adminOnly, auditCtrl.summary);
router.get('/audit/recent',             ...adminOnly, auditCtrl.recent);
router.get('/audit/order-activity',     ...adminOnly, auditCtrl.orderActivity);
router.get('/audit/modules',            ...adminOnly, auditCtrl.getModules);

// ─── Export ───────────────────────────────────────────────────────────────────
router.get('/export/orders',            ...adminOnly, exportCtrl.exportOrders);
router.get('/export/vendor-orders',     ...adminOnly, exportCtrl.exportVendorOrders);
router.get('/export/customers',         ...adminOnly, exportCtrl.exportCustomers);
router.get('/export/inventory',         ...adminOnly, exportCtrl.exportInventory);

// ─── Scheduled Reports CRUD ───────────────────────────────────────────────────
router.post  ('/export/schedules',      ...adminOnly, exportCtrl.createSchedule);
router.get   ('/export/schedules',      ...adminOnly, exportCtrl.getSchedules);
router.patch ('/export/schedules/:id',  ...adminOnly, exportCtrl.updateSchedule);
router.delete('/export/schedules/:id',  ...adminOnly, exportCtrl.deleteSchedule);

module.exports = router;
