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
| `MONGODB_URI_DIRECT` | Optional non-SRV `mongodb://...` fallback if `querySrv` fails |
| `MONGODB_DNS_SERVERS` | Optional DNS for Node, e.g. `8.8.8.8,8.8.4.4` (before connect) |
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
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Outbound mail (e.g. Gmail: `smtp.gmail.com`, `587`, `false`) |
| `SMTP_USER`, `SMTP_PASS` | SMTP auth (Gmail: use an **App Password**, not your normal password) |
| `SMTP_FROM` | From address (defaults to `SMTP_USER` or `GMAIL_USER` if unset) |
| `GMAIL_USER`, `GMAIL_PASS` | Optional fallback if `SMTP_USER` / `SMTP_PASS` are empty |
| `RATE_LIMIT_MAX` | Max API requests per IP per window (default higher in prod; see `.env.example`) |
| `ENABLE_RATE_LIMIT_IN_DEV` | Set to `true` to enforce limits in `development` (off by default so local SPA is not throttled) |

---

## MongoDB Setup

1. Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for development)
4. Copy the connection string into `MONGODB_URI` in `backend/.env`

**If `querySrv ECONNREFUSED` appears (common on some networks):** in Atlas **Connect → Drivers**, copy the **standard** `mongodb://host1:27017,host2:27017,...` string (not `mongodb+srv`) into `MONGODB_URI_DIRECT`. The server tries `MONGODB_URI` first, then `MONGODB_URI_DIRECT`.

### Outbound email (verification, password reset, vendor notices)

Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `backend/.env` (see `src/services/email.service.js`). Values are trimmed automatically. For **Gmail**, use an [App Password](https://support.google.com/accounts/answer/185833), not your normal account password. `GMAIL_USER` / `GMAIL_PASS` are used as fallbacks if SMTP user/pass are empty. Ensure `FRONTEND_URL` matches your customer site so email links work. If email is not configured or sending fails, check Winston logs under `backend/logs/` — API flows (e.g. register) still complete.

### Admin login (`/admin/login`)

The admin UI calls `POST /api/v1/auth/login`. There is **no default admin account** in the database. If you see **"Invalid email or password"**, either no user exists for that email or the password is wrong.

**Create or reset an admin user** (from `backend/`):

1. In `.env`, set (one-time):

   ```env
   SEED_ADMIN_EMAIL=you@example.com
   SEED_ADMIN_PASSWORD=YourSecurePass1
   ```

   Password must be **at least 8 characters** (User model). Use a strong password in production.

2. Run:

   ```bash
   npm run seed:admin
   ```

3. Sign in at `/admin/login` with that email and password. The account is created with `role: ADMIN`, `status: ACTIVE`, and `isEmailVerified: true`.

If the email already exists as `ADMIN`, the script **updates the password** and ensures ACTIVE + verified.

**Only one `ADMIN` user** is allowed in the database (enforced on save). The seed script refuses to create a second admin; use `SEED_ADMIN_EMAIL` matching the existing admin to reset their password.

### Admin inventory bulk upload

`POST /api/v1/inventory/bulk-import` (admin JWT, JSON body) accepts `{ "rows": [ ... ] }` with up to **500** objects per request. Each row supports **`sku`** or **`productId`**, **`city`** (name, case-insensitive) or **`cityId`**, **`quantity`** (or `qty`), optional **`type`** (`ADD` | `DEDUCT` | `ADJUST`, default `ADD`), optional **`reason`**, optional **`variation`**, optional **`lowStockThreshold`**. Behaviour matches `POST /api/v1/inventory/adjust` (creates product+city inventory row if missing, writes `InventoryLog` per row, one summary admin audit entry). The admin **Inventory** page includes a CSV bulk upload that calls this endpoint.

### Admin city pricing bulk upload

`POST /api/v1/pricing/bulk-import` (admin JWT, JSON body) accepts `{ "rows": [ ... ] }` with up to **500** rows. Each row upserts **`CityPricing`** (same keys as `POST /api/v1/pricing`): resolve **`sku`** or **`productId`**, **`citySlug`** or **`cityId`** or **`cityName`**, **`regularPrice`**; optional **`salePrice`**, **`isVisible`**, **`variationSku`** / **`variationId`**, **`wholesaleSlabs`** as a **JSON array** string or **compact tiers** like `50:400|100:395` (min:price per `|` segment; max qty is inferred up to the next tier). Omitted optional fields are left unchanged on update. The admin **Pricing Engine** page includes a CSV upload and downloadable template.

### Customers vs vendors

- **Customers** can self-register via `POST /api/v1/auth/register/customer` (many accounts).
- **Vendors** are created by the administrator by default: `POST /api/v1/admin/vendors` (admin JWT). The admin UI **Vendors → Add vendor** calls this API. New vendors are **APPROVED** and **ACTIVE** so they can log in with the password you set.
- **Public vendor signup** (`POST /api/v1/auth/register/vendor`) is **disabled** unless you set `ALLOW_PUBLIC_VENDOR_REGISTRATION=true` in `.env` (legacy / open marketplace mode).

**Ban / suspend:** `PUT /api/v1/admin/users/:id/status` with `SUSPENDED` or `DELETED` (admin only) revokes refresh tokens for that user.

### City-scoped catalogue (customer)

Public customer routes accept an optional query **`cityId`** (Mongo ObjectId of an **ACTIVE**, **serviceable** city). When present, **products**, **category/brand pages**, **PDP**, **related products**, **categories** and **brands** lists, and **global search** are constrained to products that have **visible `CityPricing`** in that city **and** **positive available inventory** (`quantity - reserved > 0`) in that city. Omitting `cityId` keeps the previous behaviour (no city filter).

Vendor users may later use **`serviceCityIds`** on the User document (empty = treat as all cities for legacy data).

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
