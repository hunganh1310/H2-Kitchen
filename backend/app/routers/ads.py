"""Advertisement endpoints — public listing + admin CRUD (CLAUDE.md ad feature).

Ads are promo banners/popups managed by admins and shown on the public landing
page. Customers only ever see *active* ads for a given placement. Admin routes
require a JWT; the public listing is open.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from ..db import get_db
from ..deps import require_admin
from ..models.ad import AdCreate, AdOut, AdUpdate, Placement, to_ad_out
from ..services import cloudinary_service
from ..utils import parse_object_id

# --- Public ---------------------------------------------------------------

public_router = APIRouter(tags=["ads"])


@public_router.get("/ads", response_model=list[AdOut])
async def list_active_ads(placement: Placement | None = None):
    """Active ads for customers, ordered by ``sort_order`` then newest first."""
    query: dict = {"is_active": True}
    if placement:
        query["placement"] = placement
    cursor = get_db().ads.find(query).sort([("sort_order", 1), ("created_at", -1)])
    return [to_ad_out(doc) async for doc in cursor]


# --- Admin ----------------------------------------------------------------

admin_router = APIRouter(
    prefix="/admin/ads",
    tags=["admin:ads"],
    dependencies=[Depends(require_admin)],
)


@admin_router.get("", response_model=list[AdOut])
async def list_all_ads():
    cursor = get_db().ads.find({}).sort([("sort_order", 1), ("created_at", -1)])
    return [to_ad_out(doc) async for doc in cursor]


@admin_router.post("", response_model=AdOut, status_code=status.HTTP_201_CREATED)
async def create_ad(payload: AdCreate):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await get_db().ads.insert_one(doc)
    created = await get_db().ads.find_one({"_id": result.inserted_id})
    return to_ad_out(created)


@admin_router.patch("/{ad_id}", response_model=AdOut)
async def update_ad(ad_id: str, payload: AdUpdate):
    oid = parse_object_id(ad_id)
    db = get_db()
    updates = payload.model_dump(exclude_unset=True)
    if updates:
        result = await db.ads.update_one({"_id": oid}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy quảng cáo")
    doc = await db.ads.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quảng cáo")
    return to_ad_out(doc)


@admin_router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad(ad_id: str):
    result = await get_db().ads.delete_one({"_id": parse_object_id(ad_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy quảng cáo")


@admin_router.post("/upload")
async def upload_ad_media(file: UploadFile = File(...), kind: str = Form("auto")):
    """Upload one image/video to Cloudinary; return ``{url, type}``.

    Not tied to an ad — admins upload media first, then attach the returned URL
    when creating/editing an ad. ``kind`` is "image" | "video" | "auto".
    """
    if not cloudinary_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary chưa được cấu hình (thiếu CLOUDINARY_URL)",
        )

    content_type = file.content_type or ""
    is_video = content_type.startswith("video/") or kind == "video"
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="File tải lên phải là ảnh hoặc video")

    resource_type = "video" if is_video else "image"
    data = await file.read()
    try:
        url = await run_in_threadpool(
            cloudinary_service.upload_media, data, resource_type
        )
    except Exception as exc:  # network / provider errors
        raise HTTPException(status_code=502, detail=f"Tải media thất bại: {exc}")

    return {"url": url, "type": "video" if is_video else "image"}
