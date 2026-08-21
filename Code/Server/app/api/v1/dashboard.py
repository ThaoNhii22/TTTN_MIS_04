from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.registration import Registration
from app.models.survey import Survey
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.dashboard import DashboardStatsResponse
from app.services.workshop_service import get_workshop_stats

router = APIRouter(prefix="/dashboard", tags=["Bảng điều khiển & KPI (Dashboard)"])


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="UC-18 & UC-19: Xem Bảng điều khiển và Chỉ số KPI",
    dependencies=[Depends(require_roles(["organizer", "admin"]))],
)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["organizer", "admin"])),
):
    """
    Use Case 18 & 19: Bảng chỉ số KPI tổng hợp theo thời gian thực:
    - Tỷ lệ lấp đầy Quota (%)
    - Tỷ lệ tham dự thực tế (%)
    - Mức độ hài lòng trung bình (Thang điểm 5)
    """
    # Nếu là Organizer -> chỉ thống kê các workshop của mình; Nếu là Admin -> toàn bộ hệ thống
    ws_query = db.query(Workshop)
    reg_query = db.query(Registration)

    if current_user.role == "organizer":
        ws_query = ws_query.filter(Workshop.organizer_id == current_user.user_id)
        reg_query = reg_query.join(Workshop, Registration.workshop_id == Workshop.workshop_id).filter(
            Workshop.organizer_id == current_user.user_id
        )

    all_workshops = ws_query.all()
    total_workshops = len(all_workshops)
    published_count = sum(1 for w in all_workshops if w.status == "published")
    draft_count = sum(1 for w in all_workshops if w.status == "draft")
    pending_count = sum(1 for w in all_workshops if w.status == "pending")
    completed_count = sum(1 for w in all_workshops if w.status == "completed")
    cancelled_count = sum(1 for w in all_workshops if w.status == "cancelled")

    total_registrations = reg_query.count()
    total_confirmed = reg_query.filter(Registration.status.in_(["confirmed", "attended"])).count()
    total_waitlist = reg_query.filter(Registration.status == "waitlist").count()
    total_attended = reg_query.filter(Registration.status == "attended").count()
    total_users = db.query(User).count() if current_user.role == "admin" else 0

    # Tính KPI
    # 1. Tỷ lệ lấp đầy: (Tổng confirmed / Tổng quota của các published/completed workshop) * 100
    valid_workshops = [w for w in all_workshops if w.status in ["published", "completed"]]
    total_capacity = sum(w.quota for w in valid_workshops)
    avg_fill_rate = round((total_confirmed / total_capacity * 100), 2) if total_capacity > 0 else 0.0

    # 2. Tỷ lệ tham dự: (Tổng attended / Tổng confirmed) * 100
    avg_attendance_rate = round((total_attended / total_confirmed * 100), 2) if total_confirmed > 0 else 0.0

    # 3. Điểm hài lòng trung bình
    survey_query = db.query(func.avg(Survey.rating))
    if current_user.role == "organizer":
        survey_query = (
            survey_query.join(Registration, Survey.registration_id == Registration.registration_id)
            .join(Workshop, Registration.workshop_id == Workshop.workshop_id)
            .filter(Workshop.organizer_id == current_user.user_id)
        )
    avg_satisfaction = survey_query.scalar() or 0.0
    avg_satisfaction = round(float(avg_satisfaction), 2)

    # Danh sách workshop gần nhất kèm stats
    recent_workshops_list = []
    for w in sorted(all_workshops, key=lambda x: x.created_at, reverse=True)[:5]:
        stats = get_workshop_stats(db, w)
        recent_workshops_list.append({
            "workshop_id": w.workshop_id,
            "title": w.title,
            "status": w.status,
            "quota": w.quota,
            "confirmed_count": stats["confirmed_count"],
            "waitlist_count": stats["waitlist_count"],
            "attended_count": stats["attended_count"],
            "start_at": str(w.start_at),
        })

    return {
        "total_workshops": total_workshops,
        "published_workshops": published_count,
        "draft_workshops": draft_count,
        "pending_workshops": pending_count,
        "completed_workshops": completed_count,
        "cancelled_workshops": cancelled_count,
        "total_registrations": total_registrations,
        "total_confirmed": total_confirmed,
        "total_waitlist": total_waitlist,
        "total_attended": total_attended,
        "total_users": total_users,
        "average_fill_rate": avg_fill_rate,
        "average_attendance_rate": avg_attendance_rate,
        "average_satisfaction_score": avg_satisfaction,
        "recent_workshops": recent_workshops_list,
    }
