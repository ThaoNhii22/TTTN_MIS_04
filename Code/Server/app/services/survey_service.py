from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.audit import log_audit_action
from app.models.registration import Registration
from app.models.survey import Survey
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.survey import SurveyStatsResponse, SurveySubmit


def submit_workshop_survey(
    db: Session,
    survey_in: SurveySubmit,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Survey:
    reg = db.query(Registration).filter(Registration.registration_id == survey_in.registration_id).first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lượt đăng ký không tồn tại.",
        )

    # Kiểm tra quyền: Phải là chính chủ đã đăng ký
    if current_user.role != "admin" and reg.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền gửi khảo sát cho lượt đăng ký của người khác.",
        )

    # BR-09: Khảo sát chỉ dành cho người có trạng thái Đã tham dự (attended)
    if reg.status != "attended":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ người tham gia đã được ghi nhận điểm danh (Đã tham dự) mới được thực hiện khảo sát đánh giá theo quy tắc BR-09.",
        )

    # Kiểm tra nếu đã làm khảo sát trước đó
    existing_survey = db.query(Survey).filter(Survey.registration_id == reg.registration_id).first()
    if existing_survey:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã hoàn thành khảo sát cho Workshop này rồi.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    survey = Survey(
        registration_id=reg.registration_id,
        rating=survey_in.rating,
        answers=survey_in.answers,
        feedback=survey_in.feedback,
        submitted_at=now,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    # BR-10: Ghi Audit Log
    log_audit_action(
        db=db,
        actor_id=current_user.user_id,
        action="SUBMIT_SURVEY",
        target_entity="Surveys",
        target_id=survey.survey_id,
        new_value={
            "workshop_id": reg.workshop_id,
            "registration_id": reg.registration_id,
            "rating": survey.rating,
        },
        ip_address=ip_address,
    )
    db.commit()
    return survey


def get_workshop_survey_analytics(db: Session, workshop: Workshop) -> Dict[str, Any]:
    surveys = (
        db.query(Survey)
        .join(Registration, Survey.registration_id == Registration.registration_id)
        .filter(Registration.workshop_id == workshop.workshop_id)
        .all()
    )

    total = len(surveys)
    if total == 0:
        return {
            "workshop_id": workshop.workshop_id,
            "workshop_title": workshop.title,
            "total_surveys": 0,
            "average_rating": 0.0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "feedback_list": [],
            "surveys": [],
        }

    total_rating = sum(s.rating for s in surveys)
    avg_rating = round(total_rating / total, 2)

    dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    feedbacks = []
    survey_list = []

    for s in surveys:
        dist[s.rating] = dist.get(s.rating, 0) + 1
        if s.feedback:
            feedbacks.append(s.feedback)

        user_name = s.registration.user.full_name if s.registration and s.registration.user else None
        user_email = s.registration.user.email if s.registration and s.registration.user else None

        survey_list.append({
            "survey_id": s.survey_id,
            "registration_id": s.registration_id,
            "rating": s.rating,
            "answers": s.answers,
            "feedback": s.feedback,
            "submitted_at": s.submitted_at,
            "user_name": user_name,
            "user_email": user_email,
        })

    return {
        "workshop_id": workshop.workshop_id,
        "workshop_title": workshop.title,
        "total_surveys": total,
        "average_rating": avg_rating,
        "rating_distribution": dist,
        "feedback_list": feedbacks,
        "surveys": survey_list,
    }
