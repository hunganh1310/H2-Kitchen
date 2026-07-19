"""Discount code endpoints (CLAUDE.md §4.3, feature request).

- GET /discount/validate      public — preview whether a code is valid + rates
- GET /admin/discount-code    admin  — the current code to hand to regulars
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..deps import require_admin
from ..services import discount

router = APIRouter(tags=["discount"])


class DiscountValidateOut(BaseModel):
    valid: bool
    prepared_percent: int
    bottled_percent: int


class AdminDiscountOut(DiscountValidateOut):
    code: str
    valid_until: str
    rotates_every_hours: int


@router.get("/discount/validate", response_model=DiscountValidateOut)
async def validate_discount(code: str = Query(..., min_length=1)):
    return DiscountValidateOut(
        valid=discount.validate(code),
        prepared_percent=discount.PREPARED_PERCENT,
        bottled_percent=discount.BOTTLED_PERCENT,
    )


admin_router = APIRouter(prefix="/admin", tags=["admin:discount"])


@admin_router.get(
    "/discount-code",
    response_model=AdminDiscountOut,
    dependencies=[Depends(require_admin)],
)
async def admin_current_discount():
    return AdminDiscountOut(
        code=discount.current_code(),
        valid_until=discount.valid_until().isoformat(),
        rotates_every_hours=discount.ROTATE_SECONDS // 3600,
        valid=True,
        prepared_percent=discount.PREPARED_PERCENT,
        bottled_percent=discount.BOTTLED_PERCENT,
    )
