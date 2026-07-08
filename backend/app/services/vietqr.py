"""VietQR payment QR generation (CLAUDE.md §6).

No payment gateway — we build an image URL against the public VietQR image API
(img.vietqr.io). The amount and transfer content (the order code) are encoded
into the QR itself, so scanning it in any banking app pre-fills the transfer.

Bank config comes from the ``BANK_ACCOUNT_INFO`` env var, formatted as:
    "<bank_bin_or_code>|<account_number>|<ACCOUNT NAME>"
e.g. "970422|0123456789|NGUYEN VAN A"
"""
from __future__ import annotations

from urllib.parse import urlencode

from ..core.config import settings

# VietQR image template: compact2 shows logo + amount + content, scanner-friendly.
_TEMPLATE = "compact2"

# Common Vietnamese bank BINs -> display name (best-effort; falls back to the code).
_BANK_NAMES = {
    "970405": "Agribank",
    "970407": "Techcombank",
    "970415": "VietinBank",
    "970416": "ACB",
    "970418": "BIDV",
    "970422": "MB Bank",
    "970423": "TPBank",
    "970426": "MSB",
    "970431": "Eximbank",
    "970432": "VPBank",
    "970436": "Vietcombank",
    "970437": "HDBank",
    "970441": "VIB",
    "970443": "SHB",
    "970448": "OCB",
}


def parse_bank_info(raw: str) -> tuple[str, str, str] | None:
    """Return (bank_code, account_number, account_name) or None if unconfigured."""
    if not raw:
        return None
    parts = [p.strip() for p in raw.split("|")]
    if len(parts) < 3 or not all(parts[:3]):
        return None
    return parts[0], parts[1], parts[2]


def is_configured() -> bool:
    return parse_bank_info(settings.bank_account_info) is not None


def build_vietqr(order_code: str, amount: int) -> dict | None:
    """Build the VietQR payload for an order, or None if bank info is missing."""
    parsed = parse_bank_info(settings.bank_account_info)
    if not parsed:
        return None
    bank_code, account_number, account_name = parsed
    query = urlencode(
        {"amount": int(amount), "addInfo": order_code, "accountName": account_name}
    )
    qr_image_url = (
        f"https://img.vietqr.io/image/{bank_code}-{account_number}-{_TEMPLATE}.png?{query}"
    )
    return {
        "qr_image_url": qr_image_url,
        "bank_code": bank_code,
        "bank_name": _BANK_NAMES.get(bank_code, bank_code),
        "account_number": account_number,
        "account_name": account_name,
        "amount": int(amount),
        "content": order_code,
    }
