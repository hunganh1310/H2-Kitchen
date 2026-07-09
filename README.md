<div align="center">

# 🍜 H2 Kitchen

**A lightweight, self‑hosted food & drink ordering system for small venues.**
No customer accounts. QR payments with auto‑confirmation. Real‑time kitchen status. Built for a band rehearsal room — useful for any café, pop‑up, or small kitchen.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## ✨ Why H2 Kitchen?

Most ordering systems assume customer sign‑ups, loyalty accounts, and a payment gateway.
A small venue rarely needs any of that. H2 Kitchen is deliberately simple:

- **Customers never register or log in** — they scan, order anonymously, and track by an order code.
- **Payments are just a bank transfer** — a pre‑filled VietQR is generated per order and marked *paid* automatically when the money lands (via a [SePay](https://sepay.vn) webhook). No payment gateway, no fees.
- **Admins get a phone push** for every new order through a Discord webhook — no mobile app to build.
- **Runs on free tiers** — MongoDB Atlas M0, Render, Vercel, Cloudinary.

> The stack favours **simple, reliable, easy to maintain** over scaling for large traffic.

## 🎯 Features

**Customers (no account needed)**
- Browse the menu (food & drink) with live stock and out‑of‑stock badges.
- Customize noodle toppings **with quantities** (e.g. ×2 beef balls, ×1 fish cake) and per‑item notes.
- Cart, checkout, and order tracking by code (saved in `localStorage`) — self‑cancel while pending, quick re‑order.
- Pay by **VietQR** (amount + order code pre‑filled) or cash at the counter.

**Admins**
- JWT login; self‑service password change.
- **Order queue** — filter by status, live polling, advance status, mark paid, cancel (auto‑restock).
- **Kitchen open/close** toggle — closing blocks *food* orders only; drinks stay available.
- **Menu management** — full CRUD, per‑item toppings, inventory, visibility, Cloudinary image upload.
- **Ad / promo manager** — banners on the landing page + a welcome popup, admin‑controlled. Supports **images, video, and multi‑image carousels** at any aspect ratio (16:9, 3:4, 1:1, 9:16, …), each with a click‑through link. Nothing shows until you add and enable an ad.

**Payments & notifications**
- **VietQR** generation via `img.vietqr.io` (no SDK).
- **SePay bank webhook** auto‑confirms transfers → order flips to *paid*; manual "mark paid" remains a fallback.
- **Discord webhooks** for new orders and for payment confirmations (best‑effort — a failed webhook never breaks checkout).

**Landing page**
- 3D hero (React Three Fiber + Framer Motion), lazy‑loaded so the heavy 3D chunk stays off every other route; mobile / reduced‑motion tuned with an error‑boundary fallback.

## 🧱 Architecture

```
        ┌─────────────┐      REST / JSON      ┌──────────────┐
        │  React SPA  │ ◄──────────────────►  │   FastAPI    │
        │   (Vite)    │                       │   backend    │
        └─────────────┘                       └──────┬───────┘
                                                     │
        ┌───────────────┬───────────────┬────────────┼───────────────┐
        ▼               ▼               ▼            ▼               ▼
   MongoDB Atlas    Cloudinary      Discord      VietQR img     SePay webhook
   (data store)   (images/video/  (order & paid   (payment QR)  (auto‑confirm
                   ad media)        alerts)                       transfers)
```

- Frontend is a single React app: `/` landing, `/order` customer menu (no login), `/admin/*` (JWT).
- Backend exposes REST endpoints; JWT is required only for `/admin/*`. The SePay webhook is protected by an API key.
- No WebSockets — admins/customers use lightweight polling.

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| 3D / motion | React Three Fiber (`@react-three/fiber` + `drei`) + Framer Motion |
| Fonts | Be Vietnam Pro (body) + Dela Gothic One (display) — self‑hosted via `@fontsource` |
| Backend | FastAPI + Motor (async MongoDB) |
| Database | MongoDB (Atlas M0 free tier, or self‑hosted) |
| Auth | JWT (admin only) |
| Media | Cloudinary |
| Payments | VietQR + SePay auto‑confirm webhook |
| Notifications | Discord webhooks |
| Hosting | Vercel (frontend) · Render (backend) |

## 📸 Screenshots

> _Add your own screenshots/GIFs here._

| Landing | Customer menu | Admin orders |
|---|---|---|
| _`docs/landing.png`_ | _`docs/menu.png`_ | _`docs/admin.png`_ |

## 🚀 Getting started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **MongoDB** — local, [Atlas](https://www.mongodb.com/atlas) (free M0), or set `USE_MOCK_DB=true` to run against an in‑memory mock (dev only; data is not persisted).

### 1. Clone

```bash
git clone https://github.com/<your-username>/h2-kitchen.git
cd h2-kitchen
```

### 2. Backend (FastAPI)

```bash
cd backend

# create & activate a virtual environment
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS / Linux:         source .venv/bin/activate

# install dependencies
pip install -r requirements.txt

# configure environment
cp .env.example .env          # Windows: copy .env.example .env
#   then edit values (at minimum MONGODB_URI + JWT_SECRET)

# run the API (invoke uvicorn via python -m for a stable launcher)
python -m uvicorn app.main:app --reload
```

- API → <http://127.0.0.1:8000>
- Swagger docs → <http://127.0.0.1:8000/docs>
- Health → <http://127.0.0.1:8000/health>

With `SEED_ON_STARTUP=true`, the app seeds the demo admin accounts and menu on first boot. You can also seed manually: `python -m app.seed`.

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_URL to your backend URL
npm run dev
```

- App → <http://localhost:5173>
- Production build → `npm run build` (output in `frontend/dist/`)

### Demo admin accounts

| Username | Name |
|---|---|
| `admin` | Quản lý chính |
| `baristahai` | Hải quầy bar |
| `beptruong` | Bếp trưởng |

> ⚠️ **Default passwords live in [`backend/app/seed.py`](backend/app/seed.py) and are for local dev only.** Change them (and set a strong `JWT_SECRET`) before deploying — the admin panel has a "Đổi mật khẩu" (change password) action.

## ⚙️ Configuration

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name (default `h2_kitchen`) |
| `JWT_SECRET` | **Set a long random value.** `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `JWT_ALGORITHM` / `JWT_EXPIRE_MINUTES` | JWT algorithm (`HS256`) / token lifetime (`1440`) |
| `DISCORD_WEBHOOK_URL` | New‑order & payment notifications (leave empty to disable) |
| `BANK_ACCOUNT_INFO` | VietQR receiving account: `<bank_bin>\|<account_no>\|<ACCOUNT NAME>` (e.g. `970422\|0123456789\|NGUYEN VAN A`) |
| `SEPAY_WEBHOOK_API_KEY` | Auto‑confirm transfers via SePay (same value in the SePay dashboard) |
| `CLOUDINARY_URL` | Media hosting for product & ad images/video |
| `CORS_ORIGINS` | Comma‑separated allowed origins (add your frontend domain) |
| `USE_MOCK_DB` | `true` = in‑memory MongoDB for dev; keep `false` in prod |
| `SEED_ON_STARTUP` | `true` = seed missing admins + menu on boot |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend (e.g. your Render URL in prod) |

<details>
<summary><b>External services — quick setup (Atlas · SePay · Discord · Cloudinary)</b></summary>

**MongoDB Atlas (free M0)** — create an M0 cluster, add a database user, allow network access `0.0.0.0/0` (dev), copy the SRV URI into `MONGODB_URI`, set `USE_MOCK_DB=false`. URL‑encode special characters in the password.

**SePay auto‑confirm** — register at [sepay.vn](https://sepay.vn), connect your receiving bank account, add a webhook to `https://<backend>/webhooks/sepay` with header `Authorization: Apikey <KEY>` for incoming transfers, and set `SEPAY_WEBHOOK_API_KEY=<KEY>`. The VietQR embeds the order code in the transfer content, so customers just scan and pay. For local testing, tunnel with `ngrok http 8000`.

**Discord notifications** — create a channel webhook (Channel settings → Integrations → Webhooks), set `DISCORD_WEBHOOK_URL`, and install Discord on the admins' phones for real push notifications.

**Cloudinary** — grab your `CLOUDINARY_URL` from the dashboard. Without it, media‑upload endpoints return `503`; you can still set image URLs directly.

</details>

## 📂 Project structure

```
h2-kitchen/
├── backend/                  FastAPI + Motor (MongoDB) + JWT
│   ├── app/
│   │   ├── main.py           app entrypoint & router registration
│   │   ├── routers/          auth, menu, orders, kitchen, ads, webhooks
│   │   ├── models/           Pydantic schemas
│   │   ├── services/         cloudinary, vietqr, notifications, kitchen
│   │   ├── core/             config & security
│   │   └── seed.py           demo admins + menu
│   └── requirements.txt
├── frontend/                 React (Vite) + TypeScript + Tailwind
│   └── src/
│       ├── pages/            Landing, Customer, Cart, Order, Admin*
│       ├── components/       AdCarousel, AdPopup, ProductModal, …
│       ├── context/          Cart & Auth providers
│       └── api/              typed REST client
└── CLAUDE.md                 detailed design spec (scope, data model)
```

## 🔌 API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Admin login → JWT |
| GET | `/auth/me` | admin | Current admin |
| PATCH | `/admin/me/password` | admin | Change own password |
| GET | `/menu` | public | Customer menu (`?category=food\|drink`) |
| GET/POST | `/admin/menu-items` | admin | List (incl. hidden) / create product |
| PATCH/DELETE | `/admin/menu-items/{id}` | admin | Update / delete product |
| POST | `/admin/menu-items/{id}/image` | admin | Upload product image (Cloudinary) |
| POST | `/cart/checkout` | public | Create order (decrements stock) → `order_code` |
| GET | `/orders/{order_code}` | public | Look up order by code |
| PATCH | `/orders/{order_code}/cancel` | public | Self‑cancel while pending (restocks) |
| GET/PATCH | `/admin/orders` · `/admin/orders/{id}` | admin | List / update status & payment |
| GET/PATCH | `/kitchen-status` · `/admin/kitchen-status` | mixed | Kitchen open/close |
| GET | `/ads` | public | Active ads (`?placement=landing\|popup`) |
| GET/POST | `/admin/ads` | admin | List all / create ad |
| PATCH/DELETE | `/admin/ads/{id}` | admin | Update / delete ad |
| POST | `/admin/ads/upload` | admin | Upload ad media (image/video) |
| POST | `/webhooks/sepay` | api key | SePay bank webhook — auto‑confirm payment |

Full request/response models are in the Swagger docs (`/docs`).

## ☁️ Deployment

Included config: [`render.yaml`](render.yaml) (backend blueprint), [`frontend/vercel.json`](frontend/vercel.json) (SPA rewrite), and a GitHub Actions [CI/CD workflow](.github/workflows/ci-cd.yml).

1. **Database** — MongoDB Atlas; allow network access `0.0.0.0/0` (Render's free tier has no static outbound IP).
2. **Backend → Render** — New → Blueprint → connect the repo (reads `render.yaml`). Set the env vars above. Note the URL.
3. **Frontend → Vercel** — import the repo with **Root Directory = `frontend`**; set `VITE_API_URL` to the Render URL.
4. **Wire it up** — add the Vercel domain to `CORS_ORIGINS`, point the SePay webhook to `https://<render-url>/webhooks/sepay`, then log in and change the default admin passwords.

> Render's free tier sleeps after ~15 min idle → first request cold‑starts (~30s). Fine for internal use.

## 🗺️ Roadmap

- [x] Menu CRUD + public menu
- [x] Cart, checkout & order tracking (no login)
- [x] Admin order queue + kitchen open/close
- [x] VietQR + SePay auto‑confirm
- [x] Discord notifications (new order + paid)
- [x] 3D landing + indigo‑mono theme + admin password change
- [x] Ad / promo manager (banners + popup, image/video/carousel)
- [x] Per‑topping quantities
- [ ] Admin statistics dashboard (revenue, best‑sellers)
- [ ] Low‑stock alerts & automatic operating hours

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`.
2. Make your change. Keep the existing style (TypeScript strict; Python type hints; small, focused modules).
3. Sanity‑check locally:
   - Frontend: `npm run build` (runs typecheck + bundle).
   - Backend: run the app and hit the affected endpoints (`/docs` is handy). `USE_MOCK_DB=true` needs no database.
4. Open a pull request describing the change and how you tested it.

Please open an issue first for larger features so we can align on the approach.

## 📄 License

Released under the **MIT License**. See [`LICENSE`](LICENSE).

## 🙏 Acknowledgements

- Payment QR by [VietQR](https://vietqr.io) · auto‑confirmation by [SePay](https://sepay.vn)
- Media hosting by [Cloudinary](https://cloudinary.com) · notifications via [Discord](https://discord.com)
- 3D via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) · fonts from [Fontsource](https://fontsource.org)
- Built by [Crazy Builders Lab](https://www.instagram.com/crazybuilders.lab)
