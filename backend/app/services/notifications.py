"""Order notifications (CLAUDE.md §7).

Isolated here so the provider can be swapped later (Messenger/Zalo/…) without
touching the ordering logic. Currently sends a Discord webhook message on each
new order. Best-effort: never raises into the request path — a failed webhook
must not break checkout.
"""
import json
import logging
import urllib.request
from datetime import datetime, timedelta, timezone

from starlette.concurrency import run_in_threadpool

from ..core.config import settings

logger = logging.getLogger("h2.notifications")

_VN_TZ = timezone(timedelta(hours=7))
_AMBER = 0xF59E0B


def _format_vnd(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", ".") + "₫"


def _vn_time(created_at) -> str:
    if not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)
    if created_at.tzinfo is None:  # Motor returns naive UTC
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.astimezone(_VN_TZ).strftime("%H:%M · %d/%m")


def _build_discord_payload(order: dict) -> dict:
    lines = []
    for it in order.get("items", []):
        line = f"• {it['qty']}× {it['name']}"
        if it.get("toppings"):
            line += " (" + ", ".join(t["name"] for t in it["toppings"]) + ")"
        if it.get("note"):
            line += f" — _{it['note']}_"
        lines.append(line)
    items_text = "\n".join(lines) or "—"

    payment = "Tiền mặt" if order.get("payment_method") == "cash" else "Chuyển khoản (VietQR)"

    fields = [
        {"name": "Khách", "value": order.get("customer_name", "?"), "inline": True},
        {"name": "Phòng", "value": order.get("room_number", "?"), "inline": True},
        {"name": "Tổng tiền", "value": _format_vnd(int(order.get("total", 0))), "inline": True},
    ]
    if order.get("phone"):
        fields.append({"name": "SĐT", "value": order["phone"], "inline": True})
    fields.append({"name": "Thanh toán", "value": payment, "inline": True})
    fields.append({"name": "Giờ đặt", "value": _vn_time(order.get("created_at")), "inline": True})
    fields.append({"name": "Món", "value": items_text, "inline": False})

    embed = {
        "title": f"🔔 Đơn mới · {order.get('order_code', '')}",
        "color": _AMBER,
        "fields": fields,
        "footer": {"text": "H2 Kitchen"},
    }
    return {
        "username": "H2 Kitchen",
        "content": f"**Đơn mới {order.get('order_code', '')}**",
        "embeds": [embed],
    }


def _post(url: str, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


async def send_new_order_notification(order: dict) -> None:
    """Send a 'new order' Discord message. No-op if the webhook isn't configured."""
    url = settings.discord_webhook_url
    if not url:
        return
    try:
        payload = _build_discord_payload(order)
        await run_in_threadpool(_post, url, payload)
    except Exception as exc:  # never break checkout because of a notification
        logger.warning("Discord notification failed: %s", exc)
