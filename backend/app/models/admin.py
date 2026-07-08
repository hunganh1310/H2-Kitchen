"""Pydantic schemas for admin auth.

Per CLAUDE.md section 8, only admins have accounts — customers are anonymous.
The ``role`` field is kept for forward-compatibility but is always "admin".
"""
from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["admin"]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChange(BaseModel):
    # Self-service password change — no old password required (internal tool).
    new_password: str = Field(..., min_length=4, max_length=128)


class AdminPublic(BaseModel):
    """Safe admin representation returned to clients (never includes the hash)."""

    id: str
    username: str
    name: str
    role: Role = "admin"
