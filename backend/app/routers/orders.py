"""Public order endpoints (no auth) — CLAUDE.md §9.

- POST  /cart/checkout            create an order (decrements stock)
- GET   /orders/{order_code}      look up an order by its public code
- PATCH /orders/{order_code}/cancel  customer self-cancel (only while pending)
"""
import random
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from ..db import get_db
from ..models.order import CheckoutRequest, OrderOut, to_order_out
from ..services import discount as discount_service
from ..services.kitchen import is_kitchen_open
from ..services.notifications import send_new_order_notification
from ..utils import parse_object_id

router = APIRouter(tags=["orders"])

# Unambiguous alphabet (no O/0/I/1) for human-readable, phone-friendly codes.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


async def _generate_order_code(db) -> str:
    for _ in range(10):
        code = "H2" + "".join(random.choices(_CODE_ALPHABET, k=6))
        if not await db.orders.find_one({"order_code": code}):
            return code
    raise HTTPException(status_code=500, detail="Không tạo được mã đơn, vui lòng thử lại")


@router.post("/cart/checkout", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def checkout(payload: CheckoutRequest, background: BackgroundTasks):
    db = get_db()

    # Closing the kitchen only stops prepared (chế biến) items — bottled drinks
    # and rental gear are always available.
    kitchen_open = await is_kitchen_open(db)

    # Validate the discount code up front so an invalid code fails fast (before
    # any stock is touched).
    if payload.discount_code and not discount_service.validate(payload.discount_code):
        raise HTTPException(
            status_code=400, detail="Mã giảm giá không hợp lệ hoặc đã hết hạn"
        )

    # 1) Resolve every line against the live menu; compute prices server-side.
    order_items: list[dict] = []
    decrements: list[tuple] = []  # (ObjectId, qty)
    subtotal = 0
    has_prepared = False
    has_rental = False

    for line in payload.items:
        oid = parse_object_id(line.menu_item_id)
        item = await db.menu_items.find_one({"_id": oid})
        if not item or not item.get("is_available", True):
            raise HTTPException(status_code=400, detail="Có sản phẩm không còn khả dụng")

        kind = item.get("kind", "fnb")
        if kind == "rental":
            has_rental = True
        elif item.get("category") == "prepared":
            has_prepared = True

        stock = int(item.get("quantity", 0))
        if stock < line.qty:
            raise HTTPException(
                status_code=409,
                detail=f"'{item['name']}' chỉ còn {stock} phần",
            )

        available = {t["name"]: int(t["price"]) for t in item.get("toppings", [])}
        chosen = []
        toppings_cost = 0
        for tp in line.toppings:
            if tp.name not in available:
                raise HTTPException(status_code=400, detail=f"Topping không hợp lệ: {tp.name}")
            price = available[tp.name]
            chosen.append({"name": tp.name, "price": price, "qty": tp.qty})
            toppings_cost += price * tp.qty

        unit_price = int(item["price"]) + toppings_cost
        line_total = unit_price * line.qty
        subtotal += line_total
        order_items.append(
            {
                "menu_item_id": str(oid),
                "name": item["name"],
                "kind": kind,
                "category": item.get("category"),
                "qty": line.qty,
                "toppings": chosen,
                "unit_price": unit_price,
                "price": line_total,
                "note": (line.note or "").strip() or None,
            }
        )
        decrements.append((oid, line.qty))

    # Enforce the kitchen gate: only prepared items are blocked when closed.
    if not kitchen_open and has_prepared:
        raise HTTPException(
            status_code=403,
            detail="Bếp đang đóng cửa — hiện chỉ nhận đồ đóng chai, tạm không nhận đồ chế biến.",
        )

    # Apply the discount (F&B lines only; rentals never discounted).
    discount_amount = 0
    discount_code = None
    if payload.discount_code:
        discount_amount = discount_service.compute_discount(order_items)
        discount_code = payload.discount_code.strip().upper()
    total = subtotal - discount_amount

    # 2) Decrement stock with a guard; roll back on partial failure (race safety).
    applied: list[tuple] = []
    for oid, qty in decrements:
        res = await db.menu_items.update_one(
            {"_id": oid, "quantity": {"$gte": qty}}, {"$inc": {"quantity": -qty}}
        )
        if res.modified_count == 0:
            for aoid, aqty in applied:
                await db.menu_items.update_one({"_id": aoid}, {"$inc": {"quantity": aqty}})
            raise HTTPException(
                status_code=409, detail="Sản phẩm vừa hết hàng, vui lòng thử lại"
            )
        applied.append((oid, qty))

    # 3) Insert the order; if that fails, restore stock.
    # Transfer amount == total. Payment is reconciled by the order code embedded
    # in the VietQR transfer content (auto-confirmed via the bank webhook).
    doc = {
        "order_code": await _generate_order_code(db),
        "kind": "rental" if has_rental and not has_prepared else "fnb",
        "customer_name": payload.customer_name.strip(),
        "room_number": payload.room_number.strip(),
        "phone": (payload.phone or "").strip() or None,
        "items": order_items,
        "subtotal": subtotal,
        "discount_code": discount_code,
        "discount_amount": discount_amount,
        "total": total,
        "transfer_amount": total,
        "status": "pending",
        "payment_status": "unpaid",
        "payment_method": payload.payment_method,
        "cancelled_by": None,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = await db.orders.insert_one(doc)
    except Exception:
        for oid, qty in applied:
            await db.menu_items.update_one({"_id": oid}, {"$inc": {"quantity": qty}})
        raise HTTPException(status_code=500, detail="Tạo đơn thất bại, vui lòng thử lại")

    created = await db.orders.find_one({"_id": result.inserted_id})
    # Notify admins of the new order (Discord). Runs after the response is sent.
    background.add_task(send_new_order_notification, created)
    return to_order_out(created)


@router.get("/orders/{order_code}", response_model=OrderOut)
async def get_order(order_code: str):
    doc = await get_db().orders.find_one({"order_code": order_code.strip().upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return to_order_out(doc)


@router.patch("/orders/{order_code}/cancel", response_model=OrderOut)
async def cancel_order(order_code: str):
    db = get_db()
    doc = await db.orders.find_one({"order_code": order_code.strip().upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if doc["status"] == "cancelled":
        return to_order_out(doc)  # idempotent
    if doc["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail="Đơn đã được bếp xử lý, không thể tự huỷ. Vui lòng liên hệ quầy.",
        )

    # Restore stock for the cancelled items.
    for it in doc["items"]:
        await db.menu_items.update_one(
            {"_id": parse_object_id(it["menu_item_id"])}, {"$inc": {"quantity": it["qty"]}}
        )
    await db.orders.update_one(
        {"_id": doc["_id"]}, {"$set": {"status": "cancelled", "cancelled_by": "customer"}}
    )
    updated = await db.orders.find_one({"_id": doc["_id"]})
    return to_order_out(updated)
