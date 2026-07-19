"""Pydantic schemas for products (F&B menu + rental gear) and their toppings.

Mirrors the ``menu_items`` collection in CLAUDE.md §8. A single collection holds
two kinds of product, distinguished by ``kind``:

- ``kind="fnb"`` — food & drink. ``category`` is one of ``bottled`` (đồ đóng chai)
  or ``prepared`` (đồ chế biến). Closing the kitchen blocks only ``prepared`` items.
- ``kind="rental"`` — gear for hire (guitar, bass, IEM…). ``category`` is a free
  admin-defined group name.

Prices are stored as whole VND (integers). ``is_available`` is the admin's manual
show/hide toggle; stock availability is derived separately from ``quantity``
(``in_stock``).
"""
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Kind = Literal["fnb", "rental"]
FnbCategory = Literal["bottled", "prepared"]
FNB_CATEGORIES = ("bottled", "prepared")


class Topping(BaseModel):
    name: str = Field(..., min_length=1)
    price: int = Field(0, ge=0)  # VND


def _validate_category(kind: str, category: str | None) -> None:
    """F&B items must use a fixed category; rentals allow any non-empty group."""
    if category is None:
        return
    if kind == "fnb" and category not in FNB_CATEGORIES:
        raise ValueError("Đồ ăn/uống phải thuộc 'bottled' hoặc 'prepared'")
    if kind == "rental" and not category.strip():
        raise ValueError("Đồ thuê phải có nhóm phân loại")


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    kind: Kind = "fnb"
    category: str = Field(..., min_length=1)
    price: int = Field(..., ge=0)  # VND
    description: str = ""
    image_url: str | None = None
    quantity: int = Field(0, ge=0)
    is_available: bool = True
    toppings: list[Topping] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_category(self):
        _validate_category(self.kind, self.category)
        return self


class MenuItemUpdate(BaseModel):
    """Partial update — only the fields sent are changed."""

    name: str | None = Field(None, min_length=1)
    kind: Kind | None = None
    category: str | None = Field(None, min_length=1)
    price: int | None = Field(None, ge=0)
    description: str | None = None
    image_url: str | None = None
    quantity: int | None = Field(None, ge=0)
    is_available: bool | None = None
    toppings: list[Topping] | None = None

    @model_validator(mode="after")
    def _check_category(self):
        # Only validate when both kind and category are provided together; a
        # standalone category change is validated in the router against the doc.
        if self.kind is not None:
            _validate_category(self.kind, self.category)
        return self


class MenuItemOut(BaseModel):
    id: str
    name: str
    kind: Kind
    category: str
    price: int
    description: str
    image_url: str | None
    quantity: int
    is_available: bool
    toppings: list[Topping]
    in_stock: bool


def to_menu_item_out(doc: dict) -> MenuItemOut:
    """Convert a raw MongoDB document into the public output schema."""
    quantity = int(doc.get("quantity", 0))
    return MenuItemOut(
        id=str(doc["_id"]),
        name=doc["name"],
        kind=doc.get("kind", "fnb"),
        category=doc["category"],
        price=int(doc.get("price", 0)),
        description=doc.get("description", ""),
        image_url=doc.get("image_url"),
        quantity=quantity,
        is_available=bool(doc.get("is_available", True)),
        toppings=doc.get("toppings", []),
        in_stock=quantity > 0,
    )
