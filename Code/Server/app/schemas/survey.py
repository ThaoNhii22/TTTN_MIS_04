from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SurveySubmit(BaseModel):
    registration_id: int = Field(..., description="Mã lượt đăng ký đã tham dự (BR-09)")
    rating: int = Field(..., ge=1, le=5, description="Đánh giá từ 1 đến 5 sao")
    answers: Dict[str, Any] = Field(default_factory=dict, description="Các câu trả lời chi tiết")
    feedback: Optional[str] = Field(None, description="Ý kiến đóng góp phản hồi")


class SurveyResponse(BaseModel):
    survey_id: int
    registration_id: int
    rating: int
    answers: Dict[str, Any]
    feedback: Optional[str] = None
    submitted_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyStatsResponse(BaseModel):
    workshop_id: int
    workshop_title: str
    total_surveys: int
    average_rating: float
    rating_distribution: Dict[int, int]
    feedback_list: List[Optional[str]]
    surveys: List[SurveyResponse]
