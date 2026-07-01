require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// xss middleware — sanitize req.body, req.query, req.params
const xssMiddleware = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
      else if (typeof obj[key] === 'object') sanitize(obj[key]);
    }
    return obj;
  };
  req.body   = sanitize(req.body);
  req.query  = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};
const hpp = require('hpp');

const { requestLogger } = require('./src/middleware/logger.middleware');
const { errorHandler, notFound } = require('./src/middleware/error.middleware');

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./src/docs/swagger');

// ─── Route Imports ────────────────────────────────────────────────────────────
const healthRoutes    = require('./src/routes/health.routes');
const authRoutes      = require('./src/routes/auth.routes');
const userRoutes      = require('./src/routes/user.routes');
const adminRoutes     = require('./src/routes/admin.routes');
const customerRoutes  = require('./src/routes/customer.routes');
const vendorRoutes    = require('./src/routes/vendor.routes');
const categoryRoutes      = require('./src/routes/category.routes');
const cmsRoutes           = require('./src/routes/cms.routes');
const uploadRoutes        = require('./src/routes/upload.routes');
const brandRoutes         = require('./src/routes/brand.routes');
const cityRoutes          = require('./src/routes/city.routes');
const productRoutes       = require('./src/routes/product.routes');
const pricingRoutes       = require('./src/routes/pricing.routes');
const inventoryRoutes     = require('./src/routes/inventory.routes');
const orderRoutes         = require('./src/routes/order.routes');
const masterOrderRoutes   = require('./src/routes/masterOrder.routes');
const vendorOrderRoutes   = require('./src/routes/vendorOrder.routes');
const shipmentRoutes      = require('./src/routes/shipment.routes');
const pickupRoutes        = require('./src/routes/pickup.routes');
const orderDocumentRoutes = require('./src/routes/orderDocument.routes');
const replacementRoutes   = require('./src/routes/replacement.routes');
const orderChatRoutes     = require('./src/routes/orderChat.routes');
const orderReportRoutes   = require('./src/routes/orderReports.routes');
const analyticsRoutes     = require('./src/routes/analytics.routes');
const bulkEnquiryRoutes   = require('./src/routes/bulkEnquiry.routes');
const concreteRFQRoutes   = require('./src/routes/concreteRFQ.routes');
const categoryFilterRoutes= require('./src/routes/categoryFilter.routes');
const financeRoutes       = require('./src/routes/finance.routes');
const productRelationshipRoutes = require('./src/routes/productRelationship.routes');
const adminCouponRoutes   = require('./src/routes/admin/coupon.routes');
const customerCouponRoutes = require('./src/routes/customer/coupon.routes');
const paymentRoutes       = require('./src/routes/customer/payment.routes');
const projectRoutes       = require('./src/routes/customer/project.routes');

const app = express();

// ─── Trust Proxy (for Nginx / Docker deployments) ────────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://maps.gstatic.com", "https://maps.googleapis.com", "https://*.googleusercontent.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
        connectSrc: ["'self'", "https://maps.googleapis.com"],
        frameSrc: ["'self'", "https://www.google.com"],
      },
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.CUSTOMER_URL,
  process.env.VENDOR_URL,
].filter(Boolean);

/** In development, allow any localhost / 127.0.0.1 origin (admin on :3001, customer on :3000, etc.). */
const isDev = (process.env.NODE_ENV || 'development') !== 'production';
const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      if (isDev && localhostOrigin.test(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Default 100/15min is too low for SPAs (many parallel GETs per page). Tune via env.
const rateWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const rateMaxFromEnv = parseInt(process.env.RATE_LIMIT_MAX, 10);
const globalMax =
  Number.isFinite(rateMaxFromEnv) && rateMaxFromEnv > 0
    ? rateMaxFromEnv
    : isDev
      ? 5000
      : 1200;

const globalLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  // Local dev: SPA + HMR easily exceeds low caps; skip unless explicitly enabled.
  skip: () =>
    process.env.DISABLE_RATE_LIMIT === 'true' ||
    (isDev && process.env.ENABLE_RATE_LIMIT_IN_DEV !== 'true'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true' || (isDev && process.env.ENABLE_RATE_LIMIT_IN_DEV !== 'true'),
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// ─── Data Sanitization ────────────────────────────────────────────────────────
app.use(mongoSanitize()); // NoSQL injection
app.use(xssMiddleware);   // XSS
app.use(hpp());           // HTTP Parameter Pollution

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// ─── API Routes (v1) ─────────────────────────────────────────────────────────
const V1 = '/api/v1';

app.use(`${V1}/health`,     healthRoutes);
app.use(`${V1}/auth`,       authRoutes);
app.use(`${V1}/users`,      userRoutes);
app.use(`${V1}/admin`,      adminRoutes);
app.use(`${V1}/customer`,   customerRoutes);
app.use(`${V1}/vendor`,     vendorRoutes);
app.use(`${V1}/categories`,         categoryRoutes);
app.use(`${V1}/cms`,                cmsRoutes);
app.use(`${V1}/upload`,             uploadRoutes);
app.use(`${V1}/brands`,             brandRoutes);
app.use(`${V1}/cities`,             cityRoutes);
app.use(`${V1}/products`,           productRoutes);
app.use(`${V1}/pricing`,            pricingRoutes);
app.use(`${V1}/inventory`,          inventoryRoutes);
app.use(`${V1}/orders`,             orderRoutes);
app.use(`${V1}/master-orders`,       masterOrderRoutes);
app.use(`${V1}/vendor-orders`,       vendorOrderRoutes);
app.use(`${V1}/shipments`,           shipmentRoutes);
app.use(`${V1}/pickup-schedules`,    pickupRoutes);
app.use(`${V1}/order-documents`,     orderDocumentRoutes);
app.use(`${V1}/replacements`,        replacementRoutes);
app.use(`${V1}/order-chat`,          orderChatRoutes);
app.use(`${V1}/reports/orders`,      orderReportRoutes);
app.use(`${V1}/analytics`,           analyticsRoutes);
app.use(`${V1}/bulk-enquiries`,     bulkEnquiryRoutes);
app.use(`${V1}/concrete-rfqs`,      concreteRFQRoutes);
app.use(`${V1}/category-filters`,   categoryFilterRoutes);
app.use(`${V1}/finance`,            financeRoutes);
app.use(`${V1}/product-relationships`, productRelationshipRoutes);
app.use(`${V1}/admin/coupons`,      adminCouponRoutes);
app.use(`${V1}/coupons`,            customerCouponRoutes);
app.use(`${V1}/payments`,           paymentRoutes);
app.use(`${V1}/customer/projects`,  projectRoutes);

// ─── Swagger UI (admin-only in production) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'StructBay API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
}

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (isDev) {
    const frontendDev = process.env.FRONTEND_DEV_URL || 'http://localhost:3000';
    return res.redirect(302, frontendDev);
  }
  res.json({
    success: true,
    message: 'StructBay API is running',
    version: '1.0.0',
    docs: `${req.protocol}://${req.get('host')}${V1}/health`,
  });
});

// ─── 404 & Global Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
