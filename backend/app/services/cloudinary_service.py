"""Cloudinary image upload for product images (CLAUDE.md §2, §9).

Isolated here so the rest of the app doesn't depend on Cloudinary directly and
the provider can be swapped later. Uploads are optional: if Cloudinary isn't
configured, ``is_configured()`` returns False and callers should respond with a
clear error instead of crashing.
"""
from __future__ import annotations

from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader

from ..core.config import settings

_configured = False


def is_configured() -> bool:
    return bool(
        settings.cloudinary_url
        or (
            settings.cloudinary_cloud_name
            and settings.cloudinary_api_key
            and settings.cloudinary_api_secret
        )
    )


def _ensure_config() -> None:
    global _configured
    if _configured:
        return
    if settings.cloudinary_url:
        # Parse cloudinary://<api_key>:<api_secret>@<cloud_name> ourselves — the
        # SDK only auto-parses CLOUDINARY_URL from the real environment, not from
        # a value passed as a kwarg.
        parsed = urlparse(settings.cloudinary_url)
        cloudinary.config(
            cloud_name=parsed.hostname,
            api_key=parsed.username,
            api_secret=parsed.password,
            secure=True,
        )
    else:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
    _configured = True


def upload_image(data: bytes, folder: str = "h2_kitchen/menu") -> str:
    """Upload raw image bytes and return the secure HTTPS URL.

    Blocking network call — run via ``starlette.concurrency.run_in_threadpool``
    from async request handlers.
    """
    _ensure_config()
    result = cloudinary.uploader.upload(data, folder=folder, resource_type="image")
    return result["secure_url"]


def upload_media(
    data: bytes, resource_type: str = "auto", folder: str = "h2_kitchen/ads"
) -> str:
    """Upload raw media bytes (image or video) and return the secure HTTPS URL.

    ``resource_type="auto"`` lets Cloudinary detect image vs. video. Blocking
    network call — run via ``run_in_threadpool`` from async handlers. For very
    large videos prefer pasting an external URL instead of uploading.
    """
    _ensure_config()
    result = cloudinary.uploader.upload(data, folder=folder, resource_type=resource_type)
    return result["secure_url"]
