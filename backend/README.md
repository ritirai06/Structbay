# StructBay Backend — Phase 1 Foundation

Production-ready Node.js/Express backend for StructBay, a B2B construction marketplace.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + Refresh Tokens + RBAC |
| File Storage | Cloudinary |
| Validation | express-validator |
| Logging | Winston + Daily Rotate |
| Security | Helmet, CORS, Rate Limit, XSS, HPP, Mongo Sanitize |
| Process Manager | PM2 |

---

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- MongoDB Atlas account
- Cloudinary account

---

## Installation

```bash
cd backend
npm install
```

---

## Environment Setup

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `FRONTEND_URL` | Customer frontend origin |
| `ADMIN_URL` | Admin panel origin |
| `VENDOR_URL` | Vendor panel origin |

---

## MongoDB Setup

1. Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for development)
4. Copy the connection string into `MONGODB_URI`

---

## Cloudinary Setup

1. Register at [Cloudinary](https://cloudinary.com)
2. From the dashboard, copy Cloud Name, API Key, and API Secret
3. Paste into the corresponding `.env` variables

---

## Running Locally

```bash
npm run dev
```

Server starts at `http://localhost:5000`

Health check: `GET http://localhost:5000/api/v1/health`

---

## Running in Production

```bash
# Standard
npm start

# With PM2 (recommended)
npm run pm2:start
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

---

## API Versioning

All routes are prefixed with `/api/v1/`. Future versions will use `/api/v2/`.

| Prefix | Description |
|---|---|
| `/api/v1/health` | Server health check |
| `/api/v1/auth` | Authentication |
| `/api/v1/admin` | Admin panel (ADMIN role) |
| `/api/v1/customer` | Customer panel (CUSTOMER role) |
| `/api/v1/vendor` | Vendor panel (VENDOR role) |
| `/api/v1/categories` | Category management |
| `/api/v1/cms` | Homepage CMS |
| `/api/v1/upload` | File uploads (Cloudinary) |

---

## Folder Structure

```
backend/
├── app.js                    # Express app — middleware + routes
├── server.js                 # Entry point — DB connect + listen
├── ecosystem.config.js       # PM2 cluster config
├── .env.example              # Environment variable template
├── logs/                     # Winston daily rotate logs
└── src/
    ├── config/
    │   ├── db.js             # MongoDB Atlas connection
    │   ├── cloudinary.js     # Cloudinary helpers (upload/delete/update)
    │   ├── logger.js         # Winston logger instance
    │   └── constants.js      # Roles, statuses, upload folders, limits
    ├── controllers/          # Route handlers (Phase 2)
    ├── services/             # Business logic layer (Phase 2)
    ├── repositories/         # DB query layer (Phase 2)
    ├── models/
    │   ├── User.js           # Unified user model (Admin/Customer/Vendor)
    │   ├── Category.js       # Product category with slug + soft delete
    │   └── CMS.js            # Singleton homepage content model
    ├── routes/
    │   ├── health.routes.js
    │   ├── auth.routes.js
    │   ├── admin.routes.js
    │   ├── customer.routes.js
    │   ├── vendor.routes.js
    │   ├── category.routes.js
    │   ├── cms.routes.js
    │   └── upload.routes.js
    ├── middleware/
    │   ├── auth.middleware.js    # JWT verify + user attach
    │   ├── role.middleware.js    # RBAC + vendor approval guard
    │   ├── upload.middleware.js  # Multer → Cloudinary pipeline
    │   ├── validate.middleware.js# express-validator error collector
    │   ├── logger.middleware.js  # HTTP request logger
    │   └── error.middleware.js   # Global error handler + 404
    ├── validators/
    │   ├── auth.validator.js
    │   └── category.validator.js
    ├── utils/
    │   ├── AppError.js       # Custom operational error class
    │   ├── apiResponse.js    # Standardised response formatter
    │   ├── asyncHandler.js   # try/catch wrapper for async controllers
    │   └── tokenUtils.js     # JWT sign/verify helpers
    └── constants/
        └── httpConstants.js  # HTTP status codes + common messages
```

---

## Security Features

- **Helmet** — Secure HTTP headers
- **CORS** — Whitelist-based origin control
- **Rate Limiting** — 100 req/15min globally, 20 req/15min on auth routes
- **Mongo Sanitize** — Blocks NoSQL injection (`$` / `.` in inputs)
- **XSS Clean** — Strips malicious HTML from request body
- **HPP** — Prevents HTTP parameter pollution
- **JWT** — Short-lived access tokens (15m) + long-lived refresh tokens (7d)
- **RBAC** — Role-based access: ADMIN / CUSTOMER / VENDOR
- **Password Hashing** — bcrypt with salt rounds = 12

---

## Logging

Logs are written to `logs/` with daily rotation:

| File | Content |
|---|---|
| `combined-YYYY-MM-DD.log` | All levels — kept 14 days |
| `error-YYYY-MM-DD.log` | Errors only — kept 30 days |

Console output is enabled in `development` mode only.

---

## Docker Compatibility

The server uses `trust proxy` and graceful SIGTERM/SIGINT shutdown, making it fully compatible with Docker and Nginx reverse proxies.

---

## Phases Roadmap

| Phase | Scope |
|---|---|
| **Phase 1** ✅ | Backend Foundation (this) |
| Phase 2 | Auth Module (register/login/refresh/reset) |
| Phase 3 | Category + CMS APIs |
| Phase 4 | Vendor onboarding + document upload |
| Phase 5 | RFQ, Orders, Payments, Chat, AI |
