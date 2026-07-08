"""Admin self-service account routes (requires admin JWT)."""
from fastapi import APIRouter, Depends, status

from ..core.security import hash_password
from ..db import get_db
from ..deps import get_current_user
from ..models.admin import AdminPublic, PasswordChange
from ..utils import parse_object_id

router = APIRouter(prefix="/admin/me", tags=["admin:account"])


@router.patch("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    payload: PasswordChange, current: AdminPublic = Depends(get_current_user)
):
    """Change the logged-in admin's own password (no old password needed)."""
    await get_db().admins.update_one(
        {"_id": parse_object_id(current.id)},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
