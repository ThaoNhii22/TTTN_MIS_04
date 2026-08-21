from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_client_ip, get_current_user, require_roles, verify_workshop_organizer_or_admin
from app.models.survey import Survey
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.survey import SurveyResponse, SurveyStatsResponse, SurveySubmit
from app.services.survey_service import get_workshop_survey_analytics, submit_workshop_survey

router = APIRouter(tags=["Khảo sát & Đánh giá (Surveys)"])


@router.post(
    "/surveys",
    response_model=SurveyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC-16: Thực hiện khảo sát sau Workshop",
)
def submit_survey(
    survey_in: SurveySubmit,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 16: Người tham gia thực hiện khảo sát đánh giá Workshop.
    - BR-09: Chỉ người tham gia đã được ghi nhận ở trạng thái 'Đã tham dự' (attended) mới được gửi khảo sát.
    """
    survey = submit_workshop_survey(
        db=db,
        survey_in=survey_in,
        current_user=current_user,
        ip_address=get_client_ip(request),
    )
    user_name = survey.registration.user.full_name if survey.registration and survey.registration.user else None
    user_email = survey.registration.user.email if survey.registration and survey.registration.user else None

    return {
        "survey_id": survey.survey_id,
        "registration_id": survey.registration_id,
        "rating": survey.rating,
        "answers": survey.answers,
        "feedback": survey.feedback,
        "submitted_at": survey.submitted_at,
        "user_name": user_name,
        "user_email": user_email,
    }


@router.get(
    "/workshops/{workshop_id}/surveys",
    response_model=SurveyStatsResponse,
    summary="UC-17: Xem kết quả khảo sát của Workshop",
)
def get_workshop_surveys(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Use Case 17: Người tổ chức / Admin xem và theo dõi kết quả đánh giá, ý kiến phản hồi và điểm hài lòng của Workshop.
    Bắt buộc kiểm tra quyền sở hữu Workshop.
    """
    return get_workshop_survey_analytics(db, workshop)
