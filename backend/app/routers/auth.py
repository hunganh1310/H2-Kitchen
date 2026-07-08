"""Auth routes: admin login and current-user lookup.

Only admins authenticate — customers order anonymously (CLAUDE.md §3, §8).
"""
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.security import create_access_token, verify_password
from ..db import get_db
from ..deps import get_current_user
from ..models.admin import AdminPublic, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    admin = await get_db().admins.find_one({"username": payload.username})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
        )
    token = create_access_token(
        subject=str(admin["_id"]),
        extra_claims={"role": admin.get("role", "admin"), "username": admin["username"]},
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=AdminPublic)
async def read_me(current_user: AdminPublic = Depends(get_current_user)) -> AdminPublic:
    return current_user
