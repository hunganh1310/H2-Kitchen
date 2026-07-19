"""Public menu endpoints (no auth) — CLAUDE.md §9 `GET /menu`."""
from fastapi import APIRouter, Query

from ..db import get_db
from ..models.menu import Kind, MenuItemOut, to_menu_item_out

router = APIRouter(tags=["menu"])


@router.get("/menu", response_model=list[MenuItemOut])
async def list_menu(
    kind: Kind = Query("fnb"),
    category: str | None = Query(None),
):
    """Products visible to customers: only items the admin has left available.

    ``kind`` defaults to ``fnb`` (the food/drink page). The rental page passes
    ``kind=rental``. Out-of-stock items (quantity 0) are still returned so the
    frontend can show a "hết hàng" badge; the admin hides an item entirely via
    ``is_available``.
    """
    query: dict = {"is_available": True, "kind": kind}
    if category:
        query["category"] = category
    cursor = get_db().menu_items.find(query).sort([("category", 1), ("name", 1)])
    return [to_menu_item_out(doc) async for doc in cursor]
