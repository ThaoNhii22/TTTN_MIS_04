from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.user import UserResponse


class WorkshopBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Tên Workshop")
    description: Optional[str] = Field(None, description="Mô tả chi tiết Workshop")
    location: Optional[str] = Field(None, max_length=255, description="Địa điểm tổ chức")
    start_at: datetime = Field(..., description="Thời gian bắt đầu")
    end_at: datetime = Field(..., description="Thời gian kết thúc")
    registration_open_at: Optional[datetime] = Field(None, description="Thời điểm mở đăng ký (tùy chọn)")
    registration_close_at: Optional[datetime] = Field(None, description="Thời điểm đóng đăng ký (BR-15, tùy chọn)")
    quota: int = Field(..., gt=0, description="Số lượng người tham gia tối đa")
    checkin_start_at: datetime = Field(..., description="Thời điểm bắt đầu cho phép check-in")
    checkin_end_at: datetime = Field(..., description="Thời điểm kết thúc check-in")

class WorkshopCreate(WorkshopBase):
    @model_validator(mode="after")
    def validate_times(self):
        if self.end_at <= self.start_at:
            raise ValueError("Thời gian kết thúc sự kiện (end_at) phải sau thời gian bắt đầu (start_at).")
        if self.checkin_end_at <= self.checkin_start_at:
            raise ValueError("Thời điểm kết thúc check-in phải sau thời điểm bắt đầu check-in.")
        if self.checkin_end_at > self.end_at:
            raise ValueError("Thời điểm kết thúc check-in không được sau thời gian kết thúc sự kiện.")
        if self.registration_open_at and self.registration_close_at:
            if self.registration_close_at <= self.registration_open_at:
                raise ValueError("Thời điểm đóng đăng ký phải sau thời điểm mở đăng ký.")
        if self.registration_close_at and self.registration_close_at > self.start_at:
            raise ValueError("Thời điểm đóng đăng ký không được sau thời gian bắt đầu sự kiện.")
        return self


class WorkshopUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    registration_open_at: Optional[datetime] = None
    registration_close_at: Optional[datetime] = None
    quota: Optional[int] = Field(None, gt=0)
    checkin_start_at: Optional[datetime] = None
    checkin_end_at: Optional[datetime] = None


class WorkshopReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$", description="Hành động duyệt (approve) hoặc từ chối (reject)")
    rejection_reason: Optional[str] = Field(None, description="Lý do từ chối nếu action = reject (BR-06)")


class WorkshopCancel(BaseModel):
    cancel_reason: str = Field(..., min_length=3, description="Lý do hủy sự kiện (Bắt buộc theo BR-13)")


class WorkshopResponse(WorkshopBase):
    workshop_id: int
    organizer_id: int
    registration_open_at: Optional[datetime] = None
    checkin_code: Optional[str] = None
    status: str
    cancel_reason: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Computed fields
    confirmed_count: int = 0
    waitlist_count: int = 0
    attended_count: int = 0
    is_full: bool = False
    is_registration_open: bool = False

    model_config = ConfigDict(from_attributes=True)


class WorkshopDetailResponse(WorkshopResponse):
    organizer: Optional[UserResponse] = None
