"""Admin menu management (CLAUDE.md §4.2, §9). All routes require an admin JWT.

Covers: create / list / update / delete products, inventory (``quantity``),
toppings (via the ``toppings`` array on update), visibility (``is_available``),
and product image upload to Cloudinary.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from ..db import get_db
from ..deps import require_admin
from ..models.menu import (
    FNB_CATEGORIES,
    Kind,
    MenuItemCreate,
    MenuItemOut,
    MenuItemUpdate,
    to_menu_item_out,
)
from ..services import cloudinary_service
from ..utils import parse_object_id

router = APIRouter(
    prefix="/admin/menu-items",
    tags=["admin:menu"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[MenuItemOut])
async def list_items(kind: Kind | None = None, category: str | None = None):
    """All items, including ones hidden from customers (``is_available=False``)."""
    query: dict = {}
    if kind:
        query["kind"] = kind
    if category:
        query["category"] = category
    cursor = get_db().menu_items.find(query).sort([("category", 1), ("name", 1)])
    return [to_menu_item_out(doc) async for doc in cursor]


@router.post("", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(payload: MenuItemCreate):
    doc = payload.model_dump()
    result = await get_db().menu_items.insert_one(doc)
    created = await get_db().menu_items.find_one({"_id": result.inserted_id})
    return to_menu_item_out(created)


@router.get("/{item_id}", response_model=MenuItemOut)
async def get_item(item_id: str):
    doc = await get_db().menu_items.find_one({"_id": parse_object_id(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return to_menu_item_out(doc)


@router.patch("/{item_id}", response_model=MenuItemOut)
async def update_item(item_id: str, payload: MenuItemUpdate):
    oid = parse_object_id(item_id)
    updates = payload.model_dump(exclude_unset=True)
    db = get_db()
    if updates:
        # If category changes without kind, validate it against the item's kind.
        if "category" in updates:
            existing = await db.menu_items.find_one({"_id": oid})
            if not existing:
                raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
            kind = updates.get("kind", existing.get("kind", "fnb"))
            category = updates["category"]
            if kind == "fnb" and category not in FNB_CATEGORIES:
                raise HTTPException(
                    status_code=422,
                    detail="Đồ ăn/uống phải thuộc 'bottled' hoặc 'prepared'",
                )
        result = await db.menu_items.update_one({"_id": oid}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    doc = await db.menu_items.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return to_menu_item_out(doc)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str):
    result = await get_db().menu_items.delete_one({"_id": parse_object_id(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")


@router.post("/{item_id}/image", response_model=MenuItemOut)
async def upload_item_image(item_id: str, file: UploadFile = File(...)):
    oid = parse_object_id(item_id)
    db = get_db()

    doc = await db.menu_items.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    if not cloudinary_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary chưa được cấu hình (thiếu CLOUDINARY_URL)",
        )

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="File tải lên phải là ảnh")

    data = await file.read()
    try:
        image_url = await run_in_threadpool(cloudinary_service.upload_image, data)
    except Exception as exc:  # network / provider errors
        raise HTTPException(status_code=502, detail=f"Tải ảnh thất bại: {exc}")

    await db.menu_items.update_one({"_id": oid}, {"$set": {"image_url": image_url}})
    updated = await db.menu_items.find_one({"_id": oid})
    return to_menu_item_out(updated)
