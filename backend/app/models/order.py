"""Pydantic schemas for orders (CLAUDE.md §8 `orders`).

Customers are anonymous — an order is identified by its public ``order_code``.
Prices are re-computed server-side from the menu; client-sent prices are ignored.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from ..services.vietqr import build_vietqr

OrderStatus = Literal["pending", "preparing", "done", "cancelled"]
PaymentStatus = Literal["unpaid", "paid"]
PaymentMethod = Literal["vietqr", "cash"]
CancelledBy = Literal["customer", "admin"]


# --- Checkout (request) ---------------------------------------------------


class CheckoutItem(BaseModel):
    menu_item_id: str
    qty: int = Field(..., ge=1, le=99)
    toppings: list[str] = Field(default_factory=list)  # selected topping names
    note: str | None = Field(None, max_length=200)


class CheckoutRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    room_number: str = Field(..., min_length=1, max_length=50)
    phone: str | None = Field(None, max_length=20)
    items: list[CheckoutItem] = Field(..., min_length=1)
    payment_method: PaymentMethod = "vietqr"


# --- Order (response) -----------------------------------------------------


class OrderAdminUpdate(BaseModel):
    """Admin update: change order status and/or mark payment received."""

    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None


class OrderItemTopping(BaseModel):
    name: str
    price: int


class OrderItemOut(BaseModel):
    menu_item_id: str
    name: str
    qty: int
    toppings: list[OrderItemTopping]
    unit_price: int  # base + toppings, per unit
    price: int  # line total (unit_price * qty)
    note: str | None = None


class VietQrInfo(BaseModel):
    qr_image_url: str
    bank_code: str
    bank_name: str
    account_number: str
    account_name: str
    amount: int
    content: str  # transfer content = order_code


class OrderOut(BaseModel):
    id: str
    order_code: str
    customer_name: str
    room_number: str
    phone: str | None
    items: list[OrderItemOut]
    total: int
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    cancelled_by: CancelledBy | None = None
    created_at: datetime
    # Amount to transfer (usually == total; a few đồng may be added so each
    # unpaid VietQR order has a unique amount for note-free reconciliation).
    transfer_amount: int
    # Computed for VietQR orders when bank info is configured; null otherwise.
    vietqr: VietQrInfo | None = None


def to_order_out(doc: dict) -> OrderOut:
    items = [
        OrderItemOut(
            menu_item_id=i["menu_item_id"],
            name=i["name"],
            qty=i["qty"],
            toppings=[OrderItemTopping(**t) for t in i.get("toppings", [])],
            unit_price=int(i.get("unit_price", i["price"] // max(i["qty"], 1))),
            price=int(i["price"]),
            note=i.get("note"),
        )
        for i in doc.get("items", [])
    ]
    transfer_amount = int(doc.get("transfer_amount", doc["total"]))

    vietqr = None
    if doc.get("payment_method") == "vietqr":
        qr = build_vietqr(doc["order_code"], transfer_amount)
        vietqr = VietQrInfo(**qr) if qr else None

    return OrderOut(
        id=str(doc["_id"]),
        order_code=doc["order_code"],
        customer_name=doc["customer_name"],
        room_number=doc["room_number"],
        phone=doc.get("phone"),
        items=items,
        total=int(doc["total"]),
        status=doc["status"],
        payment_status=doc["payment_status"],
        payment_method=doc["payment_method"],
        cancelled_by=doc.get("cancelled_by"),
        created_at=doc["created_at"],
        transfer_amount=transfer_amount,
        vietqr=vietqr,
    )
