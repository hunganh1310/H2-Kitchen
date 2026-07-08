"""H2 Kitchen — FastAPI application entrypoint.

Run locally:  uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .db import close_mongo_connection, connect_to_mongo, get_db
from .routers import (
    admin_account,
    admin_menu,
    admin_orders,
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
# Menu: public listing (customers) + admin CRUD.
app.include_router(menu.router)
app.include_router(admin_menu.router)
# Orders: public checkout / lookup / cancel + admin management.
app.include_router(orders.router)
app.include_router(admin_orders.router)
# Kitchen open/close: public status + admin control.
app.include_router(kitchen.router)
app.include_router(kitchen.admin_router)
# Bank transfer webhook: auto-confirm VietQR payments.
app.include_router(webhooks.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "H2 Kitchen API", "mock_db": settings.use_mock_db}
