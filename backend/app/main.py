"""H2 Kitchen — FastAPI application entrypoint.

Run locally:  uvicorn app.main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .db import close_mongo_connection, connect_to_mongo, get_db

logger = logging.getLogger("h2")
from .routers import (
    admin_account,
    admin_diagnostics,
    admin_menu,
    admin_orders,
    ads,
    auth,
    kitchen,
    menu,
    orders,
    webhooks,
)
from .seed import seed_admins, seed_menu


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    await connect_to_mongo()
    if settings.seed_on_startup:
        await seed_admins(get_db())
        await seed_menu(get_db())
    # Surface a missing Discord webhook early — the #1 cause of "no order pings".
    if settings.discord_webhook_url:
        logger.info("Discord notifications enabled.")
    else:
        logger.warning(
            "DISCORD_WEBHOOK_URL is not set — new-order/paid notifications are disabled. "
            "Set it in the Render environment (it is not read from a gitignored .env there)."
        )
    yield
    # --- shutdown ---
    await close_mongo_connection()


app = FastAPI(title="H2 Kitchen API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes (admin login + /auth/me) + self-service account.
app.include_router(auth.router)
app.include_router(admin_account.router)
# Admin diagnostics (test Discord webhook, etc.).
app.include_router(admin_diagnostics.router)
# Menu: public listing (customers) + admin CRUD.
app.include_router(menu.router)
app.include_router(admin_menu.router)
# Orders: public checkout / lookup / cancel + admin management.
app.include_router(orders.router)
app.include_router(admin_orders.router)
# Kitchen open/close: public status + admin control.
app.include_router(kitchen.router)
app.include_router(kitchen.admin_router)
# Ads/promo banners: public listing + admin CRUD + media upload.
app.include_router(ads.public_router)
app.include_router(ads.admin_router)
# Bank transfer webhook: auto-confirm VietQR payments.
app.include_router(webhooks.router)


@app.get("/health", tags=["health"])
async def health():
    # `discord_configured` lets you verify (without logging in) whether the
    # DISCORD_WEBHOOK_URL env var actually reached this running process.
    return {
        "status": "ok",
        "service": "H2 Kitchen API",
        "mock_db": settings.use_mock_db,
        "discord_configured": bool(settings.discord_webhook_url),
    }
