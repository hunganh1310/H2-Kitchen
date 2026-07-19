"""Rotating discount code for regular customers (CLAUDE.md §4.3, feature request).

A fresh code is "generated" every 4 hours with **zero storage**: it is derived
deterministically from a server secret and the current 4-hour time bucket, so any
process can compute and validate the same code. Validation accepts both the
current bucket's code and the previous one, giving a grace window across the
4-hour boundary (a code shared just before rotation keeps working for a while).

Applying a valid code discounts F&B lines only:
- prepared (đồ chế biến) → 20% off
- bottled  (đồ đóng chai) → 10% off
- rental / anything else  → no discount
"""
import hashlib
import hmac
from datetime import datetime, timezone

from ..core.config import settings

# Rotation period.
ROTATE_SECONDS = 4 * 60 * 60  # 4 hours

# Discount rates by F&B category.
PREPARED_PERCENT = 20
BOTTLED_PERCENT = 10

# Unambiguous alphabet (no O/0/I/1), consistent with order codes.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CODE_LEN = 6


def _secret() -> bytes:
    return (settings.discount_secret or settings.jwt_secret).encode("utf-8")


def _bucket(at: datetime | None = None) -> int:
    now = at or datetime.now(timezone.utc)
    return int(now.timestamp()) // ROTATE_SECONDS


def _code_for_bucket(bucket: int) -> str:
    digest = hmac.new(_secret(), str(bucket).encode("utf-8"), hashlib.sha256).digest()
    return "".join(_ALPHABET[b % len(_ALPHABET)] for b in digest[:_CODE_LEN])


def current_code(at: datetime | None = None) -> str:
    """The discount code valid for the current 4-hour window."""
    return _code_for_bucket(_bucket(at))


def valid_until(at: datetime | None = None) -> datetime:
    """When the current code stops being freshly issued (start of next bucket)."""
    next_bucket = _bucket(at) + 1
    return datetime.fromtimestamp(next_bucket * ROTATE_SECONDS, tz=timezone.utc)


def validate(code: str | None, at: datetime | None = None) -> bool:
    """True if ``code`` matches the current or previous bucket (grace window)."""
    if not code:
        return False
    code = code.strip().upper()
    bucket = _bucket(at)
    return code in (_code_for_bucket(bucket), _code_for_bucket(bucket - 1))


def _percent_for(item: dict) -> int:
    if item.get("kind", "fnb") != "fnb":
        return 0
    category = item.get("category")
    if category == "prepared":
        return PREPARED_PERCENT
    if category == "bottled":
        return BOTTLED_PERCENT
    return 0


def compute_discount(order_items: list[dict]) -> int:
    """Total discount (VND) for a set of resolved order lines.

    Each line carries ``kind``, ``category`` and ``price`` (line total). The
    discount is rounded to the nearest đồng per line.
    """
    total = 0
    for item in order_items:
        percent = _percent_for(item)
        if percent:
            total += round(int(item["price"]) * percent / 100)
    return total
