"""Seed the 3 admin accounts.

Run standalone:  python -m app.seed
Or automatically on startup when SEED_ON_STARTUP=true (see app/main.py).

Idempotent: an admin is only created if its username does not already exist,
so this is safe to run repeatedly.

NOTE: Per CLAUDE.md only admins have accounts — customers never log in, so
there are no sample "user" accounts to seed.
"""
import asyncio
import sys

from .core.security import hash_password
from .db import close_mongo_connection, connect_to_mongo, get_db

# Default dev credentials. CHANGE THESE (or the passwords) before deploying.
SEED_ADMINS = [
    {"username": "admin", "password": "admin123", "name": "Quản lý chính"},
    {"username": "baristahai", "password": "hai123", "name": "Hải quầy bar"},
    {"username": "beptruong", "password": "bep123", "name": "Bếp trưởng"},
]


# Initial menu (CLAUDE.md §5). Managed dynamically via the admin panel afterwards.
# Prices are in VND. The Indomie noodle bowl carries the topping system.
SEED_MENU = [
    {
        "name": "Mì trộn Indomie",
        "category": "food",
        "price": 20000,
        "description": "Mì trộn Indomie sốt đặc trưng, thêm topping tuỳ chọn.",
        "image_url": None,
        "quantity": 20,
        "is_available": True,
        "toppings": [
            {"name": "Trứng ốp la", "price": 5000},
            {"name": "Xúc xích", "price": 8000},
            {"name": "Chả cá", "price": 7000},
            {"name": "Phô mai", "price": 5000},
            {"name": "Rau cải", "price": 3000},
        ],
    },
    {"name": "Coca-Cola", "category": "drink", "price": 12000, "quantity": 24},
    {"name": "Pepsi", "category": "drink", "price": 12000, "quantity": 24},
    {"name": "Sprite", "category": "drink", "price": 12000, "quantity": 18},
    {"name": "Sting dâu", "category": "drink", "price": 12000, "quantity": 20},
    {"name": "Red Bull", "category": "drink", "price": 15000, "quantity": 15},
    {"name": "Trà Cozy", "category": "drink", "price": 10000, "quantity": 20},
    {"name": "Trà TEA+", "category": "drink", "price": 12000, "quantity": 18},
    {"name": "Nước suối", "category": "drink", "price": 5000, "quantity": 30},
]


async def seed_admins(db) -> int:
    """Insert any missing seed admins. Returns the total admin count."""
    for a in SEED_ADMINS:
        if await db.admins.find_one({"username": a["username"]}):
            continue
        await db.admins.insert_one(
            {
                "username": a["username"],
                "password_hash": hash_password(a["password"]),
                "name": a["name"],
                "role": "admin",
            }
        )
    return await db.admins.count_documents({})


async def seed_menu(db) -> int:
    """Insert any missing seed menu items (matched by name). Returns total count."""
    for item in SEED_MENU:
        if await db.menu_items.find_one({"name": item["name"]}):
            continue
        doc = {
            "name": item["name"],
            "category": item["category"],
            "price": item["price"],
            "description": item.get("description", ""),
            "image_url": item.get("image_url"),
            "quantity": item.get("quantity", 0),
            "is_available": item.get("is_available", True),
            "toppings": item.get("toppings", []),
        }
        await db.menu_items.insert_one(doc)
    return await db.menu_items.count_documents({})


async def _main() -> None:
    # Windows consoles often default to a legacy codepage that can't encode
    # Vietnamese names; force UTF-8 so the summary print never crashes.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    await connect_to_mongo()
    total_admins = await seed_admins(get_db())
    total_menu = await seed_menu(get_db())
    print(f"[seed] Done. Admins: {total_admins}, menu items: {total_menu}")
    print("[seed] Login with one of:")
    for a in SEED_ADMINS:
        print(f"        {a['username']} / {a['password']}  ({a['name']})")
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(_main())
