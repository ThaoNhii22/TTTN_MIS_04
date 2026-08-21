from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CheckinRequest(BaseModel):
    workshop_id: int = Field(..., description="Mã Workshop")
    checkin_code: Optional[str] = Field(None, description="Mã điểm danh nhập tay hoặc từ mã QR")
    qr_payload: Optional[str] = Field(None, description="Chuỗi payload giải mã từ mã QR")
    registration_id: Optional[int] = Field(None, description="Mã lượt đăng ký cần điểm danh (dành cho Organizer điểm danh thủ công)")
    checkin_method: str = Field(default="qr", pattern="^(qr|manual)$", description="Phương thức điểm danh: qr, manual")


class AttendanceResponse(BaseModel):
    attendance_id: int
    registration_id: int
    checkin_at: datetime
    checkin_method: str
    workshop_id: Optional[int] = None
    workshop_title: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    message: str = "Điểm danh thành công"

    model_config = ConfigDict(from_attributes=True)
