"""Kitchen open/closed status (CLAUDE.md §8 `kitchen_status`).

A single document controls whether customers can place new orders.
"""
from datetime import datetime

from pydantic import BaseModel


class KitchenStatusOut(BaseModel):
    is_open: bool
    updated_at: datetime | None = None
    updated_by: str | None = None


class KitchenStatusUpdate(BaseModel):
    is_open: bool
