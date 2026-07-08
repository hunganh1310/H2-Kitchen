"""Admin order management (CLAUDE.md §4.2, §9). Requires an admin JWT.

- GET   /admin/orders            list orders (newest first, optional status filter)
- PATCH /admin/orders/{id}       update status / payment_status
"""
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..deps import require_admin
from ..models.order import OrderAdminUpdate, OrderOut, OrderStatus, to_order_out
from ..utils import parse_object_id

router = APIRouter(
    prefix="/admin/orders", tags=["admin:orders"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=list[OrderOut])
async def list_orders(status: OrderStatus | None = None):
    query: dict = {}
    if status:
        query["status"] = status
    cursor = get_db().orders.find(query).sort("created_at", -1)
    return [to_order_out(doc) async for doc in cursor]


@router.patch("/{order_id}", response_model=OrderOut)
async def update_order(order_id: str, payload: OrderAdminUpdate):
    db = get_db()
    oid = parse_object_id(order_id)
    doc = await db.orders.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    updates: dict = {}

    if payload.status is not None and payload.status != doc["status"]:
        # Restock when an active order is cancelled by the admin.
        # (Un-cancelling does not re-decrement — admin adjusts stock manually.)
        if payload.status == "cancelled" and doc["status"] != "cancelled":
            for it in doc["items"]:
                await db.menu_items.update_one(
                    {"_id": parse_object_id(it["menu_item_id"])},
                    {"$inc": {"quantity": it["qty"]}},
                )
            updates["cancelled_by"] = "admin"
        updates["status"] = payload.status

    if payload.payment_status is not None:
        updates["payment_status"] = payload.payment_status

    if updates:
        await db.orders.update_one({"_id": oid}, {"$set": updates})

    updated = await db.orders.find_one({"_id": oid})
    return to_order_out(updated)
