"""Bank transfer webhook — auto-confirm VietQR payments (CLAUDE.md §6, §4.3).

A bank-monitoring service (SePay: https://sepay.vn) calls this endpoint whenever
money arrives in the receiving account. We read the order code from the transfer
content (the VietQR embeds it automatically, so the customer types nothing),
verify the amount, and mark the order paid — no admin action needed.

Security: the request must carry ``Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>``.
SePay lets you configure this exact header + value in its webhook settings.
"""
import re

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status

from ..core.config import settings
from ..db import get_db
from ..services.notifications import send_payment_confirmed_notification

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Order codes are "H2" + 6 chars from an unambiguous alphabet — easy to find
# inside a bank's transfer content, which may add its own prefix/suffix text.
_ORDER_CODE_RE = re.compile(r"H2[A-Z0-9]{6}")


@router.post("/sepay")
async def sepay_webhook(
    payload: dict,
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
):
    if not settings.sepay_webhook_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook chưa được cấu hình (thiếu SEPAY_WEBHOOK_API_KEY)",
        )
    if authorization != f"Apikey {settings.sepay_webhook_api_key}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai API key")

    # Only incoming transfers matter.
    if str(payload.get("transferType", "")).lower() != "in":
        return {"success": True, "note": "ignored: not an incoming transfer"}

    content = f"{payload.get('content', '')} {payload.get('description', '')}".upper()
    match = _ORDER_CODE_RE.search(content)
    if not match:
        return {"success": True, "note": "ignored: no order code in content"}
    order_code = match.group(0)

    db = get_db()
    order = await db.orders.find_one({"order_code": order_code})
    if not order:
        return {"success": True, "note": f"ignored: order {order_code} not found"}
    if order.get("payment_status") == "paid":
        return {"success": True, "note": "already paid"}

    amount = int(payload.get("transferAmount") or 0)
    if amount < int(order["total"]):
        # Underpaid — leave unpaid for the admin to handle manually.
        return {"success": True, "note": "ignored: amount below order total"}

    await db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {
                "payment_status": "paid",
                "payment_meta": {
                    "source": "sepay",
                    "gateway": payload.get("gateway"),
                    "amount": amount,
                    "reference": payload.get("referenceCode"),
                    "transaction_date": payload.get("transactionDate"),
                    "sepay_id": payload.get("id"),
                },
            }
        },
    )
    # Ping admins on Discord that the transfer landed (best-effort, after response).
    background.add_task(send_payment_confirmed_notification, order)
    return {"success": True, "order_code": order_code, "marked_paid": True}
