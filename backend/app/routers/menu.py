"""Public menu endpoints (no auth) — CLAUDE.md §9 `GET /menu`."""
from fastapi import APIRouter, Query

from ..db import get_db
from ..models.menu import Category, MenuItemOut, to_menu_item_out

router = APIRouter(tags=["menu"])


@router.get("/menu", response_model=list[MenuItemOut])
async def list_menu(category: Category | None = Query(None)):
    """Menu visible to customers: only items the admin has left available.

    Out-of-stock items (quantity 0) are still returned so the frontend can show
    a "hết hàng" badge; the admin can hide an item entirely via ``is_available``.
    """
    query: dict = {"is_available": True}
    if category:
        query["category"] = category
    cursor = get_db().menu_items.find(query).sort([("category", 1), ("name", 1)])
    return [to_menu_item_out(doc) async for doc in cursor]
