from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user import UserResponse


class RegistrationCreate(BaseModel):
    workshop_id: int = Field(..., description="ID Workshop đăng ký")
    accept_waitlist: bool = Field(default=True, description="Đồng ý vào Danh sách chờ nếu Workshop đã hết chỗ (BR-02)")


class RegistrationCancel(BaseModel):
    cancel_reason: Optional[str] = Field(None, description="Lý do hủy vé")


class RegistrationResponse(BaseModel):
    registration_id: int
    workshop_id: int
    user_id: int
    status: str  # waitlist, confirmed, cancelled, attended
    waitlist_position: Optional[int] = None
    registered_at: datetime
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    # Optional nested details
    workshop_title: Optional[str] = None
    workshop_start_at: Optional[datetime] = None
    workshop_location: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    qr_payload: Optional[str] = None
    is_cancellable: bool = True

    model_config = ConfigDict(from_attributes=True)
