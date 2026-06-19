# StructBay

B2B construction marketplace monorepo: **Express + MongoDB** API and a **React (Vite)** single-page app that serves the **public shop**, **admin control center**, and **vendor portal** from one build.

---

## Prerequisites

- **Node.js** 18 or newer  
- **npm** 9 or newer  
- **MongoDB** reachable from your machine — typically [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (recommended) or a local `mongod` on `127.0.0.1:27017`  
- **Cloudinary** account (uploads: products, brands, CMS, invoices, documents)

---

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | REST API (`server.js`, `src/routes`, `src/models`, `src/services`) |
| `frontend/` | Vite + React app |
| `frontend/src/main.tsx` | App entry |
| `frontend/src/App.tsx` | React Router: `/`, `/admin/*`, `/vendor/*` |
| `frontend/src/customer/` | Marketplace and `/account/*` customer area |
| `frontend/src/admin/` | Admin UI |
| `frontend/src/vendor/` | Vendor UI |
| `frontend/shared/` | Shared components and styles (import alias `@shared`) |

Admin, customer, and vendor UIs live under `frontend/src/`, not as separate top-level folders.

### Requirements vs implementation

- **`Project requirement Document .pdf`** — client PRD (repo root).
- **`docs/MVP_SCOPE.md`** — Phase 2 vs MVP, and PRD-alignment implementation notes.
- **`docs/ADMIN_CRUD_STANDARD.md`** — admin tables: View / Edit / Delete, bulk actions, confirm modals, and module checklist (apply incrementally).

---

## Quick start (two terminals)

Run the **API first**, then the **UI**.

### 1. Backend API

**macOS / Linux**

```bash
cd backend
cp .env.example .env
# Edit .env: MONGODB_URI, JWT_* secrets, Cloudinary, FRONTEND_URL / *_URL
npm install
npm run dev
```

**Windows (PowerShell)**

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env in your editor
npm install
npm run dev
```

- Default API base: `http://localhost:5000`  
- Health check: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)  
- API routes are under `/api/v1/` (see `backend/README.md` for route map, PM2, and full env table).

### 2. Frontend

**macOS / Linux**

```bash
cd frontend
cp .env.example .env
# Ensure VITE_API_URL matches your API, e.g. http://localhost:5000/api/v1
npm install
npm run dev
```

**Windows (PowerShell)**

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

- Default app URL: [http://localhost:3000](http://localhost:3000)  
- In **development**, requests to `/api/*` are **proxied** to the backend (see `frontend/vite.config.ts`). You can override the proxy target with `VITE_DEV_API_ORIGIN` in `frontend/.env`.  
- Admin and vendor panels use the same origin, for example:  
  - [http://localhost:3000/admin](http://localhost:3000/admin)  
  - [http://localhost:3000/vendor](http://localhost:3000/vendor)

---

## Environment variables (summary)

### Backend (`backend/.env`)

Copy from `backend/.env.example` and set at least:

| Variable | Notes |
|----------|--------|
| `MONGODB_URI` | Atlas SRV string or local MongoDB URI |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` | Strong random strings (not `JWT_SECRET` — the code uses these names) |
| `CLOUDINARY_*` | Cloud name, API key, API secret |
| `FRONTEND_URL`, `ADMIN_URL`, `CUSTOMER_URL`, `VENDOR_URL` | Browser origins allowed by CORS. For this SPA on port **3000**, set all four to `http://localhost:3000`. |

Optional: SMTP / Gmail (`backend/src/services/email.service.js`), Zoho (`ZOHO_*` in `backend/src/services/zoho.service.js`).

### Frontend (`frontend/.env`)

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Full API prefix, e.g. `http://localhost:5000/api/v1` (used by admin and some customer flows) |
| `VITE_DEV_API_ORIGIN` | Optional; proxy target for dev (default `http://127.0.0.1:5000`) |

Never commit real `.env` files or secrets. Use `.env.example` only as a template.

---

## Production build (frontend)

```bash
cd frontend
npm run build
```

Output is in `frontend/dist/`. Serve static files behind a reverse proxy that also forwards `/api` to the Node API (or ensure all clients use a full `VITE_API_URL` at build time).

---

## Troubleshooting

### `MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017`

Your `MONGODB_URI` points at **local** MongoDB, but nothing is listening on that host/port. Either:

- Point `MONGODB_URI` to **MongoDB Atlas** (user, password, cluster host, IP allowlist), or  
- Install and start **MongoDB Community** locally and use a matching URI.

The API will not listen until Mongoose connects successfully.

### CORS errors in the browser

Ensure `FRONTEND_URL` (and related `*_URL` values) in `backend/.env` match the **exact** origin you use in the browser (scheme + host + port), e.g. `http://localhost:3000`.

### Vendor or customer calls return 404 on `/api/...` in dev

Start the backend on the port expected by the Vite proxy (default **5000**), or set `VITE_DEV_API_ORIGIN` in `frontend/.env`.

---

## Scripts reference

| Location | Command | Purpose |
|----------|---------|---------|
| `backend/` | `npm run dev` | API with nodemon |
| `backend/` | `npm start` | API with Node (production-style) |
| `backend/` | `npm test` | Jest tests |
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | Production bundle |
| `frontend/` | `npm run preview` | Preview production build locally |

---

## Further reading

- **`backend/README.md`** — API versioning, PM2, detailed environment list, MongoDB and Cloudinary setup.
Why does this keep happening? Each time nodemon crashes, the Node.js child process sometimes doesn't release the port. To avoid this in future, you can use this one-liner to kill port 5000 and restart in one shot:

powershell
# Save as a script or just run when needed:
taskkill /F /IM node.exe ; npm run dev
netstat -ano | findstr ":5000"
# Then kill the PID shown in the last column:
taskkill /PID <PID> /F
⚠️ Note: taskkill /F /IM node.exe kills all Node processes — only use it if you're not running other Node apps simultaneously.