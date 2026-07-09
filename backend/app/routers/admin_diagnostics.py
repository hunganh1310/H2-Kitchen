"""Admin diagnostics — verify integrations from the *running* server.

Handy after deploy to confirm env vars (e.g. DISCORD_WEBHOOK_URL) actually
reached the process and that outbound delivery works. Admin JWT required.
"""
from fastapi import APIRouter, Depends, HTTPException

from ..core.config import settings
from ..deps import require_admin
from ..services.notifications import send_test_notification

router = APIRouter(
    prefix="/admin",
    tags=["admin:diagnostics"],
    dependencies=[Depends(require_admin)],
)


@router.post("/notifications/test")
async def test_discord_webhook():
    """Send a test message to the configured Discord webhook and report the result."""
    if not settings.discord_webhook_url:
        raise HTTPException(
            status_code=400,
            detail="DISCORD_WEBHOOK_URL chưa được thiết lập trong môi trường máy chủ. "
            "Kiểm tra Environment trên Render rồi redeploy.",
        )
    try:
        await send_test_notification()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gửi tới Discord thất bại: {exc}")
    return {"ok": True, "message": "Đã gửi tin nhắn test — kiểm tra kênh Discord."}
