"""Reusable FastAPI dependencies for authentication & authorization."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from .core.security import decode_access_token
from .db import get_db
from .models.admin import AdminPublic

# tokenUrl is used by the Swagger "Authorize" button; auth itself is header-based.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Không xác thực được (token không hợp lệ hoặc đã hết hạn)",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> AdminPublic:
    """Decode the bearer token and load the matching admin from the database."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise _credentials_exc
        oid = ObjectId(user_id)
    except (JWTError, InvalidId):
        raise _credentials_exc

    doc = await get_db().admins.find_one({"_id": oid})
    if not doc:
        raise _credentials_exc

    return AdminPublic(
        id=str(doc["_id"]),
        username=doc["username"],
        name=doc["name"],
        role=doc.get("role", "admin"),
    )


async def require_admin(user: AdminPublic = Depends(get_current_user)) -> AdminPublic:
    """Guard for admin-only routes. (All accounts are admins today, but this
    keeps authorization explicit for future role expansion.)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền admin",
        )
    return user
