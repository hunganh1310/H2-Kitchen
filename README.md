# H2 Kitchen — Band Room F&B Ordering System

Internal food & drink ordering system for a band rehearsal room. Customers order
without any account; only admins log in. See [CLAUDE.md](./CLAUDE.md) for the full
scope, tech stack, and roadmap.

Progress against the roadmap:

- **Step 1 — Project skeleton** ✅ FastAPI + React, MongoDB connection, admin JWT auth.
- **Step 2 — Menu** ✅ Admin menu CRUD (products, toppings, inventory, visibility,
  Cloudinary image upload) + public customer menu display.
- **Step 3 — Cart & ordering** ✅ Customer cart (toppings, notes, quantities),
  checkout (auto stock decrement), order tracking by code (no login, saved in
  `localStorage`), self-cancel while pending (restocks). Mobile-first UI.
- **Step 4 — Admin orders & kitchen** ✅ Admin order list (filter by status,
  live polling), status flow (nhận làm → hoàn thành / huỷ), mark paid, admin
  cancel (restocks). Kitchen open/close toggle that blocks new orders (403) and
  shows a banner to customers.
- **Step 5 — VietQR payment + auto-confirm** ✅ VietQR orders return a QR image
  URL (img.vietqr.io) with the exact amount + order code pre-filled; the order
  page shows the QR + bank details (copy buttons). A **SePay bank webhook**
  (`POST /webhooks/sepay`) auto-marks orders paid when the transfer arrives —
  no admin action needed (manual "mark paid" remains as fallback). Cash orders
  skip the QR. Config via `BANK_ACCOUNT_INFO` + `SEPAY_WEBHOOK_API_KEY`.

- **Step 6 — Discord notifications** ✅ On each new order the backend posts a
  Discord webhook message (customer, room, phone, total, time, items + toppings +
  notes) via a swappable `notifications` module. Fire-and-forget (a failed webhook
  never breaks checkout). Config via `DISCORD_WEBHOOK_URL`.

- **Step 7 — Landing + theme (in progress)** ✅ New 3D landing at `/` (React Three
  Fiber bowl + Framer Motion, lazy-loaded so the heavy 3D chunk stays off every
  other route; mobile/reduced-motion tuned; error-boundary fallback). Site retheme
  to **indigo-mono**. The customer menu moved from `/` to `/order`.

Remaining: further UI polish + deploy (step 8).

```
H2 Kitchen/
├── backend/     FastAPI + Motor (MongoDB) + JWT auth
├── frontend/    React (Vite) + TypeScript + Tailwind CSS
└── CLAUDE.md    Project reference (scope, data model, roadmap)
```

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **MongoDB** — a running instance (local or [Atlas](https://www.mongodb.com/atlas)).
  Don't have one locally? Set `USE_MOCK_DB=true` in `backend/.env` to run against an
  in-memory mock (dev only — data is not persisted).

---

## Backend (FastAPI)

```bash
cd backend

# 1. Create & activate a virtual environment
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env        # then edit values (Windows: copy .env.example .env)

# 4. (Optional) seed the 3 admin accounts manually
python -m app.seed
#    Not required if SEED_ON_STARTUP=true — the app seeds them on boot.

# 5. Run the API
uvicorn app.main:app --reload
```

- API: <http://127.0.0.1:8000>
- Interactive docs (Swagger): <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/health>

### Seed admin accounts

| Username     | Password   | Name           |
|--------------|------------|----------------|
| `admin`      | `xxx` | Quản lý chính  |
| `baristahai` | `xxx`   | Hải quầy bar   |
| `beptruong`  | `xxx`   | Bếp trưởng     |

> ⚠️ These are development defaults. Change the passwords (in `app/seed.py`) before
> deploying, and always set a strong `JWT_SECRET`.

### Environment variables (`backend/.env`)

| Variable              | Purpose                                                        |
|-----------------------|----------------------------------------------------------------|
| `MONGODB_URI`         | MongoDB connection string                                      |
| `MONGODB_DB_NAME`     | Database name (default `h2_kitchen`)                           |
| `JWT_SECRET`          | Secret for signing JWTs — **set a long random value**          |
| `JWT_ALGORITHM`       | JWT algorithm (default `HS256`)                                |
| `JWT_EXPIRE_MINUTES`  | Token lifetime in minutes (default `1440`)                     |
| `DISCORD_WEBHOOK_URL` | New-order notifications (wired up in roadmap step 6)           |
| `BANK_ACCOUNT_INFO`   | VietQR receiving account: `<bank_bin>\|<account_no>\|<ACCOUNT NAME>` (e.g. `970422\|0123456789\|NGUYEN VAN A`) |
| `CLOUDINARY_URL`      | Product image hosting (admin menu management)                  |
| `SEPAY_WEBHOOK_API_KEY` | Auto-confirm transfers via SePay webhook (same value in SePay dashboard) |
| `CORS_ORIGINS`        | Comma-separated allowed origins (add your Vercel domain)       |
| `USE_MOCK_DB`         | `true` = in-memory MongoDB for dev (no install). Keep `false` in prod. |
| `SEED_ON_STARTUP`     | `true` = create missing admin accounts on boot                 |

### API endpoints (so far)

| Method | Path                              | Auth       | Description                              |
|--------|-----------------------------------|------------|------------------------------------------|
| POST   | `/auth/login`                     | public     | Admin login → returns a JWT              |
| GET    | `/auth/me`                        | Bearer JWT | Current admin from the token             |
| GET    | `/health`                         | public     | Liveness check                           |
| GET    | `/menu`                           | public     | Customer menu (visible items; `?category=food\|drink`) |
| GET    | `/admin/menu-items`               | admin      | All items, including hidden ones         |
| POST   | `/admin/menu-items`               | admin      | Create a product                         |
| GET    | `/admin/menu-items/{id}`          | admin      | Get one product                          |
| PATCH  | `/admin/menu-items/{id}`          | admin      | Update (price, quantity, toppings, …)    |
| DELETE | `/admin/menu-items/{id}`          | admin      | Delete a product                         |
| POST   | `/admin/menu-items/{id}/image`    | admin      | Upload product image to Cloudinary       |
| POST   | `/cart/checkout`                  | public     | Create an order (decrements stock) → `order_code` |
| GET    | `/orders/{order_code}`            | public     | Look up an order by its code             |
| PATCH  | `/orders/{order_code}/cancel`     | public     | Customer self-cancel (only while pending; restocks) |
| GET    | `/kitchen-status`                 | public     | Is the kitchen open?                     |
| GET    | `/admin/orders`                   | admin      | List orders (newest first; `?status=`)   |
| PATCH  | `/admin/orders/{id}`              | admin      | Update status / payment (cancel restocks) |
| GET    | `/admin/kitchen-status`           | admin      | Kitchen status (with who/when)           |
| PATCH  | `/admin/kitchen-status`           | admin      | Open/close the kitchen                    |
| POST   | `/webhooks/sepay`                 | api key    | SePay bank webhook — auto-confirm payment |

> Image upload needs Cloudinary configured (`CLOUDINARY_URL` or the 3 parts in
> `.env`); without it the endpoint returns 503. You can still set `image_url`
> directly via the create/update endpoints.

---

## Frontend (React + Vite + Tailwind)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # VITE_API_URL -> backend URL (Windows: copy .env.example .env)

# 3. Run the dev server
npm run dev
```

- App: <http://localhost:5173>
- Build for production: `npm run build`  (output in `frontend/dist/`)

### Routes

| Route         | Access      | Description                                          |
|---------------|-------------|------------------------------------------------------|
| `/`           | public      | Landing (3D hero + CTA → `/order`)                   |
| `/order`      | public      | Customer menu (food & drink, out-of-stock badges)    |
| `/login`      | public      | Admin login                                          |
| `/admin`      | admin (JWT) | Admin dashboard — greeting, kitchen toggle, links    |
| `/admin/menu` | admin (JWT) | Menu management (create/edit/delete, toppings, stock, image) |
| `/admin/orders` | admin (JWT) | Order queue — filter, update status, mark paid, kitchen toggle |

The JWT is stored in `localStorage`. On load, the app restores the session from the
token via `/auth/me`; visiting `/admin` unauthenticated redirects to `/login`.

### Environment variables (`frontend/.env`)

| Variable       | Purpose                                              |
|----------------|------------------------------------------------------|
| `VITE_API_URL` | Base URL of the backend (e.g. Render URL in prod)    |

---

## Verifying the auth flow end-to-end

1. Start the backend (`uvicorn app.main:app --reload`) and frontend (`npm run dev`).
2. Open <http://localhost:5173/login> and log in with `admin` / `admin123`.
3. You're redirected to `/admin`, which shows **"Xin chào, Quản lý chính"** —
   proving login → JWT → protected `/auth/me` request works.
4. Click **Đăng xuất** to clear the token and return to login.

## External services setup

### MongoDB (switch from the in-memory mock to a real server)

Local dev defaults to `USE_MOCK_DB=true` (data resets on restart). To use a real
database (MongoDB Atlas free tier recommended):

1. Create an account: <https://www.mongodb.com/cloud/atlas/register>
2. **Create** → **M0 (Free)** cluster, pick a nearby region (e.g. Singapore).
3. **Security → Database Access** → add a database user (username + password).
4. **Security → Network Access** → add IP `0.0.0.0/0` (dev; restrict later).
5. **Connect → Drivers** → copy the connection string:
   `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
6. In `backend/.env`:
   - `MONGODB_URI=` the string above (replace `<password>`; URL-encode special chars)
   - `MONGODB_DB_NAME=h2_kitchen`
   - `USE_MOCK_DB=false`
7. Restart the backend. With `SEED_ON_STARTUP=true` it creates the 3 admins +
   seed menu in Atlas on first boot.

> Self-hosted alternative: install MongoDB Community and set
> `MONGODB_URI=mongodb://localhost:27017`, `USE_MOCK_DB=false`.

### Auto-confirm payments (SePay webhook)

So orders flip to **paid** automatically when the bank transfer arrives:

1. Register at <https://sepay.vn> (free for personal use) and connect your
   receiving bank account (MB Bank supported).
2. SePay dashboard → **Webhooks** → add a webhook:
   - **URL:** `https://<your-backend-domain>/webhooks/sepay`
     (the Render URL after deploy; for local testing use an `ngrok http 8000` URL)
   - **Auth:** API Key → header `Authorization: Apikey <KEY>`
   - **Events:** incoming transfers only
3. Set `SEPAY_WEBHOOK_API_KEY=<KEY>` in `backend/.env` (same `<KEY>`), restart.
4. Test: transfer a small amount with the order code (e.g. `H2ABC123`) in the
   content → the order auto-marks paid. The VietQR already fills this content in,
   so real customers just scan and pay.

> The webhook needs the backend reachable from the internet (deploy in step 8, or
> tunnel with ngrok for local testing). The admin **"Đã thu tiền"** button remains
> as a manual fallback if SePay isn't configured.

### New-order notifications (Discord)

Push a message to your phone whenever an order comes in — no app to build:

1. Create a free Discord server (just for the shop) and a channel, e.g. `#đơn-mới`.
2. **Channel settings → Integrations → Webhooks → New Webhook** → **Copy Webhook URL**.
3. Set `DISCORD_WEBHOOK_URL=<that URL>` in `backend/.env`, restart the backend.
4. Install Discord on the admins' phones, join the server, enable notifications for
   the channel → real push notifications on the lock screen, near-instant.

> Leave `DISCORD_WEBHOOK_URL` empty to disable. Notifications are best-effort —
> a webhook failure is logged and never affects the order.

## Deployment (Render + Vercel)

Config files are included: [`render.yaml`](render.yaml) (backend blueprint),
[`frontend/vercel.json`](frontend/vercel.json) (SPA rewrite), and
[`backend/.python-version`](backend/.python-version).

### 1. Database — MongoDB Atlas
Already set up (see *External services setup*). **Network Access → allow `0.0.0.0/0`**
(Render's free tier has no static outbound IP).

### 2. Backend — Render
1. Push the repo to GitHub.
2. Render → **New → Blueprint** → connect the repo. It reads `render.yaml`
   (`rootDir: backend`, build `pip install -r requirements.txt`, start
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`).
3. Fill the prompted secrets: `MONGODB_URI`, `JWT_SECRET` (a long random string),
   `CORS_ORIGINS` (your Vercel URL, e.g. `https://h2-kitchen.vercel.app`),
   `BANK_ACCOUNT_INFO`, `SEPAY_WEBHOOK_API_KEY`, `DISCORD_WEBHOOK_URL`, `CLOUDINARY_URL`.
4. Deploy → note the URL, e.g. `https://h2-kitchen-api.onrender.com`.

> Free tier sleeps after ~15 min idle → first request cold-starts (~30s). Fine for
> internal use. `SEED_ON_STARTUP=true` creates the 3 admins on first boot — **change
> their passwords** immediately via the admin panel (Đổi mật khẩu).

### 3. Frontend — Vercel
1. Vercel → **New Project** → import the repo, set **Root Directory = `frontend`**
   (Vite preset auto-detected; `vercel.json` handles SPA routing + build).
2. Env var: `VITE_API_URL = https://h2-kitchen-api.onrender.com` (your Render URL).
3. Deploy → note the URL (e.g. `https://h2-kitchen.vercel.app`).

### 4. Wire the pieces
- Add the Vercel URL to `CORS_ORIGINS` on Render (redeploy).
- Point the **SePay** webhook to `https://<render-url>/webhooks/sepay`.
- (Discord/Cloudinary/VietQR need no URL change.)
- Open the Vercel URL, log in at `/login`, change the default admin passwords.
