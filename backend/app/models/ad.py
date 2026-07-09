"""Pydantic schemas for advertisements / promo banners.

Ads are admin-managed content shown on the public landing page — merch, shows,
ticket sales, affiliate promos, etc. They only appear once an admin creates them
(CLAUDE.md task: banner + popup ads).

An ad has one or more media (images/videos). With more than one, the frontend
renders a small carousel. ``aspect_ratio`` lets the same component render many ad
sizes responsively (16:9 banner, 3:4 poster, 1:1 square…).
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Where the ad renders on the site.
Placement = Literal["landing", "popup"]
MediaType = Literal["image", "video"]
# How often a popup ad reappears for a visitor (popup placement only):
#   "session" = once per browser session · "always" = on every page load / refresh
PopupFrequency = Literal["session", "always"]
# Common creative sizes. Kept as a closed set so the UI can offer a picker and
# the frontend can map each to a CSS aspect-ratio.
AspectRatio = Literal["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]


class AdMedia(BaseModel):
    type: MediaType = "image"
    url: str = Field(..., min_length=1)  # Cloudinary URL or any external URL


class AdCreate(BaseModel):
    title: str = ""  # internal label (not shown to customers)
    placement: Placement = "landing"
    media: list[AdMedia] = Field(default_factory=list)
    aspect_ratio: AspectRatio = "16:9"
    link_url: str = ""  # click-through target (opens in a new tab); optional
    is_active: bool = True
    sort_order: int = 0  # lower shows first
    popup_frequency: PopupFrequency = "session"  # popup placement only


class AdUpdate(BaseModel):
    """Partial update — only the fields sent are changed."""

    title: str | None = None
    placement: Placement | None = None
    media: list[AdMedia] | None = None
    aspect_ratio: AspectRatio | None = None
    link_url: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    popup_frequency: PopupFrequency | None = None


class AdOut(BaseModel):
    id: str
    title: str
    placement: Placement
    media: list[AdMedia]
    aspect_ratio: AspectRatio
    link_url: str
    is_active: bool
    sort_order: int
    popup_frequency: PopupFrequency
    created_at: datetime


def to_ad_out(doc: dict) -> AdOut:
    return AdOut(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        placement=doc.get("placement", "landing"),
        media=[AdMedia(**m) for m in doc.get("media", [])],
        aspect_ratio=doc.get("aspect_ratio", "16:9"),
        link_url=doc.get("link_url", ""),
        is_active=bool(doc.get("is_active", True)),
        sort_order=int(doc.get("sort_order", 0)),
        popup_frequency=doc.get("popup_frequency", "session"),
        created_at=doc.get("created_at", datetime.now()),
    )
