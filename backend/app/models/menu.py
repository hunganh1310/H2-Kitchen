"""Pydantic schemas for menu items (food/drink) and their toppings.

Mirrors the ``menu_items`` collection in CLAUDE.md §8. Prices are stored as
whole VND (integers). ``is_available`` is the admin's manual show/hide toggle;
stock availability is derived separately from ``quantity`` (``in_stock``).
"""
from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["food", "drink"]


class Topping(BaseModel):
    name: str = Field(..., min_length=1)
    price: int = Field(0, ge=0)  # VND


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category: Category
    price: int = Field(..., ge=0)  # VND
    description: str = ""
    image_url: str | None = None
    quantity: int = Field(0, ge=0)
    is_available: bool = True
    toppings: list[Topping] = Field(default_factory=list)


class MenuItemUpdate(BaseModel):
    """Partial update — only the fields sent are changed."""

    name: str | None = Field(None, min_length=1)
    category: Category | None = None
    price: int | None = Field(None, ge=0)
    description: str | None = None
    image_url: str | None = None
    quantity: int | None = Field(None, ge=0)
    is_available: bool | None = None
    toppings: list[Topping] | None = None


class MenuItemOut(BaseModel):
    id: str
    name: str
    category: Category
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
        category=doc["category"],
        price=int(doc.get("price", 0)),
        description=doc.get("description", ""),
        image_url=doc.get("image_url"),
        quantity=quantity,
        is_available=bool(doc.get("is_available", True)),
        toppings=doc.get("toppings", []),
        in_stock=quantity > 0,
    )
