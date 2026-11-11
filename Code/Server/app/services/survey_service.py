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


def normalize_to_utc_naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def check_survey_eligibility(
    reg: Registration,
    db: Optional[Session] = None,
    now: Optional[datetime] = None,
) -> tuple[bool, Optional[str]]:
    """
    Helper chung xác định điều kiện khảo sát cho lượt đăng ký:
    - reg.status == 'attended'
    - Workshop liên quan tồn tại
    - Workshop status in ('published', 'completed')
    - now > end_at (thời điểm hiện tại phải SAU end_at)
    - Chưa có khảo sát nào cho registration đó
    Trả về: (is_eligible, error_message)
    """
    if reg.status != "attended":
        return False, "Chỉ người tham gia đã được ghi nhận điểm danh mới được thực hiện khảo sát đánh giá."

    workshop = reg.workshop
    if workshop is None and db is not None:
        workshop = db.query(Workshop).filter(Workshop.workshop_id == reg.workshop_id).first()

    if workshop is None:
        return False, "Không tìm thấy thông tin Workshop liên quan."

    if workshop.status == "cancelled":
        return False, "Workshop đã bị hủy, không thể thực hiện khảo sát."

    if workshop.status not in ("published", "completed"):
        return False, f"Workshop đang ở trạng thái '{workshop.status}', không mở khảo sát."

    current_time = normalize_to_utc_naive(now) or datetime.now(timezone.utc).replace(tzinfo=None)
    end_at = normalize_to_utc_naive(workshop.end_at)

    if end_at is not None and current_time <= end_at:
        return False, "Khảo sát chỉ mở sau khi sự kiện kết thúc."

    has_survey = False
    if db is not None:
        has_survey = (
            db.query(Survey.survey_id)
            .filter(Survey.registration_id == reg.registration_id)
            .first()
            is not None
        )
    elif getattr(reg, "survey", None) is not None:
        has_survey = True

    if has_survey:
        return False, "Bạn đã hoàn thành khảo sát cho Workshop này rồi."

    return True, None


def is_survey_available(
    reg: Registration,
    db: Optional[Session] = None,
    now: Optional[datetime] = None,
) -> bool:
    """
    Helper xác định xem khảo sát có sẵn sàng để thực hiện hay không.
    Dùng cho trường is_survey_available trong response đăng ký.
    """
    eligible, _ = check_survey_eligibility(reg, db=db, now=now)
    return eligible


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

    # Kiểm tra quyền: Phải là chính chủ đã đăng ký hoặc Admin
    if current_user.role != "admin" and reg.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền gửi khảo sát cho lượt đăng ký của người khác.",
        )

    # Sử dụng helper chung để kiểm tra toàn diện các điều kiện khảo sát
    is_eligible, error_message = check_survey_eligibility(reg, db=db)
    if not is_eligible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message or "Không đủ điều kiện thực hiện khảo sát.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    answers_data = survey_in.answers if isinstance(survey_in.answers, dict) else {}

    survey = Survey(
        registration_id=reg.registration_id,
        rating=survey_in.rating,
        answers=answers_data,
        feedback=survey_in.feedback,
        submitted_at=now,
    )

    try:
        db.add(survey)
        db.flush()  # sinh survey_id cho audit log

        # BR-10: Ghi Audit Log trong cùng giao dịch
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
        db.refresh(survey)
    except Exception:
        db.rollback()
        raise

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
