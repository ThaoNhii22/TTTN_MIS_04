from typing import Any, Dict, List
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_workshops: int
    published_workshops: int
    draft_workshops: int
    pending_workshops: int
    completed_workshops: int
    cancelled_workshops: int
    total_registrations: int
    total_confirmed: int
    total_waitlist: int
    total_attended: int
    total_users: int
    average_fill_rate: float  # Tỷ lệ lấp đầy Quota (%)
    average_attendance_rate: float  # Tỷ lệ tham dự thực tế (%)
    average_satisfaction_score: float  # Điểm hài lòng trung bình (thang điểm 5)
    recent_workshops: List[Dict[str, Any]]
