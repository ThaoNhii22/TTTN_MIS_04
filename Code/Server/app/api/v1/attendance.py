from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_client_ip, get_current_user, require_roles, verify_workshop_organizer_or_admin
from app.models.attendance import Attendance
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.attendance import AttendanceResponse, CheckinRequest
from app.services.checkin_service import process_checkin

router = APIRouter(tags=["Điểm danh & Check-in (Attendance)"])


def format_attendance_response(att: Attendance) -> Dict[str, Any]:
    reg = att.registration
    workshop = reg.workshop if reg else None
    user = reg.user if reg else None

    return {
        "attendance_id": att.attendance_id,
        "registration_id": att.registration_id,
        "checkin_at": att.checkin_at,
        "checkin_method": att.checkin_method,
        "workshop_id": workshop.workshop_id if workshop else None,
        "workshop_title": workshop.title if workshop else None,
        "user_name": user.full_name if user else None,
        "user_email": user.email if user else None,
        "message": "Điểm danh thành công.",
    }


@router.post(
    "/attendance/check-in",
    response_model=AttendanceResponse,
    summary="UC-12: Điểm danh bằng mã QR hoặc Mã sự kiện",
)
def check_in_participant(
    checkin_in: CheckinRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 12: Điểm danh người tham gia tại sự kiện.
    - BR-04: Kiểm tra mã QR / mã check-in hợp lệ.
    - BR-05: Kiểm soát khung giờ điểm danh (checkin_start_at đến checkin_end_at).
    - BR-14: Chống điểm danh trùng (1 lượt đăng ký chỉ điểm danh 1 lần).
    """
    att = process_checkin(
        db=db,
        checkin_in=checkin_in,
        current_user=current_user,
        ip_address=get_client_ip(request),
    )
    return format_attendance_response(att)


@router.get(
    "/attendance/my",
    response_model=List[AttendanceResponse],
    summary="UC-13: Xem lịch sử điểm danh của bản thân",
)
def get_my_attendance_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 13: Người tham gia xem thông tin và trạng thái điểm danh của mình đối với các Workshop đã tham dự.
    """
    attendances = (
        db.query(Attendance)
        .join(Registration, Attendance.registration_id == Registration.registration_id)
        .filter(Registration.user_id == current_user.user_id)
        .order_by(Attendance.checkin_at.desc())
        .all()
    )
    return [format_attendance_response(a) for a in attendances]


@router.get(
    "/workshops/{workshop_id}/attendance",
    response_model=List[AttendanceResponse],
    summary="Organizer xem danh sách người đã điểm danh của Workshop",
)
def get_workshop_attendance_list(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Organizer / Admin xem danh sách tất cả người đã điểm danh của Workshop.
    Bắt buộc kiểm tra quyền sở hữu Workshop.
    """
    attendances = (
        db.query(Attendance)
        .join(Registration, Attendance.registration_id == Registration.registration_id)
        .filter(Registration.workshop_id == workshop.workshop_id)
        .order_by(Attendance.checkin_at.desc())
        .all()
    )
    return [format_attendance_response(a) for a in attendances]
