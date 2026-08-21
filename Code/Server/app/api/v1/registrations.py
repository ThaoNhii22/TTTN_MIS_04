from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_client_ip, get_current_user, require_roles, verify_workshop_organizer_or_admin
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.registration import RegistrationCancel, RegistrationCreate, RegistrationResponse
from app.services.registration_service import (
    cancel_registration_by_user,
    check_is_cancellable,
    format_qr_payload,
    register_for_workshop,
)

router = APIRouter(tags=["Quản lý Đăng ký & Waitlist (Registrations)"])


def format_registration_response(reg: Registration) -> Dict[str, Any]:
    workshop = reg.workshop
    user = reg.user
    qr_payload = format_qr_payload(reg.workshop_id, reg.registration_id, user.email) if reg.status in ["confirmed", "attended"] else None
    is_cancellable = check_is_cancellable(workshop) if workshop and reg.status in ["confirmed", "waitlist"] else False

    return {
        "registration_id": reg.registration_id,
        "workshop_id": reg.workshop_id,
        "user_id": reg.user_id,
        "status": reg.status,
        "waitlist_position": reg.waitlist_position,
        "registered_at": reg.registered_at,
        "cancelled_at": reg.cancelled_at,
        "cancel_reason": reg.cancel_reason,
        "confirmed_at": reg.confirmed_at,
        "workshop_title": workshop.title if workshop else None,
        "workshop_start_at": workshop.start_at if workshop else None,
        "workshop_location": workshop.location if workshop else None,
        "user_name": user.full_name if user else None,
        "user_email": user.email if user else None,
        "qr_payload": qr_payload,
        "is_cancellable": is_cancellable,
    }


@router.post(
    "/registrations",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC-09: Đăng ký tham gia Workshop",
)
def create_registration(
    reg_in: RegistrationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 09: Đăng ký tham gia Workshop.
    - Hệ thống tự động lấy thông tin của người dùng đăng nhập (current_user).
    - BR-01: Chống đăng ký trùng (1 email/user = 1 vé).
    - BR-02: Kiểm soát số lượng vé và Danh sách chờ (Waitlist).
    - BR-08: Chỉ cho phép đăng ký Workshop đã công bố (published).
    - BR-15: Kiểm soát khung giờ mở/đóng đăng ký.
    """
    reg = register_for_workshop(
        db=db,
        workshop_id=reg_in.workshop_id,
        current_user=current_user,
        accept_waitlist=reg_in.accept_waitlist,
        ip_address=get_client_ip(request),
    )
    return format_registration_response(reg)


@router.post(
    "/registrations/{registration_id}/cancel",
    response_model=RegistrationResponse,
    summary="UC-10: Hủy đăng ký Workshop",
)
def cancel_registration(
    registration_id: int,
    cancel_in: RegistrationCancel,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 10: Hủy lượt đăng ký Workshop.
    - BR-11: Kiểm soát hạn chót hủy vé (trước 24h).
    - BR-03: Tự động đôn người đầu tiên trong Danh sách chờ lên xác nhận vé.
    """
    cancelled_reg = cancel_registration_by_user(
        db=db,
        registration_id=registration_id,
        cancel_reason=cancel_in.cancel_reason,
        current_user=current_user,
        ip_address=get_client_ip(request),
    )
    return format_registration_response(cancelled_reg)


@router.get(
    "/registrations/my",
    response_model=List[RegistrationResponse],
    summary="UC-11: Xem trạng thái đăng ký của bản thân",
)
def get_my_registrations(
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái: waitlist, confirmed, cancelled, attended"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Use Case 11: Xem danh sách các Workshop mà mình đã đăng ký, vị trí Waitlist và mã QR tham dự.
    """
    query = db.query(Registration).filter(Registration.user_id == current_user.user_id)
    if status_filter:
        query = query.filter(Registration.status == status_filter)

    registrations = query.order_by(Registration.registered_at.desc()).all()
    return [format_registration_response(r) for r in registrations]


@router.get(
    "/workshops/{workshop_id}/registrations",
    response_model=List[RegistrationResponse],
    summary="Organizer xem danh sách người đăng ký & Waitlist của Workshop",
)
def get_workshop_registrations(
    workshop_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Organizer / Admin xem toàn bộ danh sách đăng ký và hàng đợi Waitlist của Workshop.
    Bắt buộc kiểm tra quyền sở hữu Workshop.
    """
    query = db.query(Registration).filter(Registration.workshop_id == workshop.workshop_id)
    if status_filter:
        query = query.filter(Registration.status == status_filter)

    registrations = query.order_by(Registration.waitlist_position.asc(), Registration.registered_at.asc()).all()
    return [format_registration_response(r) for r in registrations]
