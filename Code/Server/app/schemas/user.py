from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Họ và tên người dùng")
    email: EmailStr = Field(..., description="Email đăng nhập duy nhất")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Mật khẩu khởi tạo")
    role: str = Field(default="participant", pattern="^(admin|organizer|participant)$", description="Vai trò")
    status: Optional[str] = Field(default="active", pattern="^(active|inactive|locked)$")


class UserUpdateRole(BaseModel):
    role: str = Field(..., pattern="^(admin|organizer|participant)$", description="Vai trò mới")


class UserUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(active|inactive|locked)$", description="Trạng thái tài khoản mới")


class UserResponse(UserBase):
    user_id: int
    role: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
