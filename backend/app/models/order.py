"""Pydantic schemas for orders (CLAUDE.md §8 `orders`).

Customers are anonymous — an order is identified by its public ``order_code``.
Prices are re-computed server-side from the menu; client-sent prices are ignored.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from ..services.vietqr import build_vietqr

OrderStatus = Literal["pending", "preparing", "done", "cancelled"]
PaymentStatus = Literal["unpaid", "paid"]
PaymentMethod = Literal["vietqr", "cash"]
CancelledBy = Literal["customer", "admin"]
OrderKind = Literal["fnb", "rental"]


# --- Checkout (request) ---------------------------------------------------


class CheckoutTopping(BaseModel):
    """A selected topping with how many of it (e.g. x2 bò viên)."""

    name: str = Field(..., min_length=1)
    qty: int = Field(1, ge=1, le=20)


class CheckoutItem(BaseModel):
    menu_item_id: str
    qty: int = Field(..., ge=1, le=99)
    toppings: list[CheckoutTopping] = Field(default_factory=list)
    note: str | None = Field(None, max_length=200)

    @field_validator("toppings", mode="before")
    @classmethod
    def _coerce_toppings(cls, v):
        # Accept legacy ["name", …] payloads alongside [{"name","qty"}, …].
        if isinstance(v, list):
            return [{"name": t, "qty": 1} if isinstance(t, str) else t for t in v]
        return v


class CheckoutRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    room_number: str = Field(..., min_length=1, max_length=50)
    phone: str | None = Field(None, max_length=20)
    items: list[CheckoutItem] = Field(..., min_length=1)
    payment_method: PaymentMethod = "vietqr"
    # Optional regular-customer discount code (see services/discount.py).
    discount_code: str | None = Field(None, max_length=32)


# --- Order (response) -----------------------------------------------------


class OrderAdminUpdate(BaseModel):
    """Admin update: change order status and/or mark payment received."""

    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None


class OrderItemTopping(BaseModel):
    name: str
    price: int  # per-unit topping price
    qty: int = 1  # how many of this topping on the item


class OrderItemOut(BaseModel):
    menu_item_id: str
    name: str
    kind: OrderKind = "fnb"
    category: str | None = None
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
    kind: OrderKind
    customer_name: str
    room_number: str
    phone: str | None
    items: list[OrderItemOut]
    # subtotal = sum of line totals before discount; total = after discount.
    subtotal: int
    discount_code: str | None = None
    discount_amount: int = 0
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
            kind=i.get("kind", "fnb"),
            category=i.get("category"),
            qty=i["qty"],
            toppings=[
                OrderItemTopping(
                    name=t["name"], price=int(t["price"]), qty=int(t.get("qty", 1))
                )
                for t in i.get("toppings", [])
            ],
            unit_price=int(i.get("unit_price", i["price"] // max(i["qty"], 1))),
            price=int(i["price"]),
            note=i.get("note"),
        )
        for i in doc.get("items", [])
    ]
    transfer_amount = int(doc.get("transfer_amount", doc["total"]))
    total = int(doc["total"])

    vietqr = None
    if doc.get("payment_method") == "vietqr":
        qr = build_vietqr(doc["order_code"], transfer_amount)
        vietqr = VietQrInfo(**qr) if qr else None

    return OrderOut(
        id=str(doc["_id"]),
        order_code=doc["order_code"],
        kind=doc.get("kind", "fnb"),
        customer_name=doc["customer_name"],
        room_number=doc["room_number"],
        phone=doc.get("phone"),
        items=items,
        subtotal=int(doc.get("subtotal", total)),
        discount_code=doc.get("discount_code"),
        discount_amount=int(doc.get("discount_amount", 0)),
        total=total,
        status=doc["status"],
        payment_status=doc["payment_status"],
        payment_method=doc["payment_method"],
        cancelled_by=doc.get("cancelled_by"),
        created_at=doc["created_at"],
        transfer_amount=transfer_amount,
        vietqr=vietqr,
    )
