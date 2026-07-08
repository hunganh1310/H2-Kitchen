"""Kitchen status endpoints.

- GET  /kitchen-status         public — customers see if the kitchen is open
- GET  /admin/kitchen-status   admin
- PATCH /admin/kitchen-status  admin — open/close the kitchen
"""
from fastapi import APIRouter, Depends

from ..db import get_db
from ..deps import require_admin
from ..models.admin import AdminPublic
from ..models.kitchen import KitchenStatusOut, KitchenStatusUpdate
from ..services import kitchen as kitchen_service

router = APIRouter(tags=["kitchen"])


@router.get("/kitchen-status", response_model=KitchenStatusOut)
async def public_kitchen_status():
    doc = await kitchen_service.get_kitchen_status(get_db())
    return KitchenStatusOut(is_open=doc["is_open"], updated_at=doc.get("updated_at"))


admin_router = APIRouter(
    prefix="/admin", tags=["admin:kitchen"], dependencies=[Depends(require_admin)]
)


@admin_router.get("/kitchen-status", response_model=KitchenStatusOut)
async def admin_get_kitchen_status():
    doc = await kitchen_service.get_kitchen_status(get_db())
    return KitchenStatusOut(
        is_open=doc["is_open"], updated_at=doc.get("updated_at"), updated_by=doc.get("updated_by")
    )


@admin_router.patch("/kitchen-status", response_model=KitchenStatusOut)
async def admin_set_kitchen_status(
    payload: KitchenStatusUpdate, admin: AdminPublic = Depends(require_admin)
):
    doc = await kitchen_service.set_kitchen_status(get_db(), payload.is_open, admin.username)
    return KitchenStatusOut(
        is_open=doc["is_open"], updated_at=doc.get("updated_at"), updated_by=doc.get("updated_by")
    )
