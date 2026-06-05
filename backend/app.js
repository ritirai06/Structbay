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
const categoryRoutes  = require('./src/routes/category.routes');
const cmsRoutes       = require('./src/routes/cms.routes');
const uploadRoutes    = require('./src/routes/upload.routes');

const app = express();

// ─── Trust Proxy (for Nginx / Docker deployments) ────────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.CUSTOMER_URL,
  process.env.VENDOR_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no origin) or known origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
app.use(`${V1}/categories`, categoryRoutes);
app.use(`${V1}/cms`,        cmsRoutes);
app.use(`${V1}/upload`,     uploadRoutes);

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
