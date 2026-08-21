from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.audit import log_audit_action
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop
from app.services.workshop_service import get_workshop_stats, promote_waitlist_entries


def format_qr_payload(workshop_id: int, registration_id: int, user_email: str) -> str:
    return f"TTTN_MIS_04|{workshop_id}|{registration_id}|{user_email}"


def check_is_cancellable(workshop: Workshop) -> bool:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff_time = workshop.start_at - timedelta(hours=24)  # BR-11 Mặc định trước 24h
    return now < cutoff_time


def register_for_workshop(
    db: Session,
    workshop_id: int,
    current_user: User,
    accept_waitlist: bool = True,
    ip_address: Optional[str] = None,
) -> Registration:
    workshop = db.query(Workshop).filter(Workshop.workshop_id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop không tồn tại trên hệ thống.",
        )

    # BR-08: Chỉ cho phép đăng ký Workshop đã được công bố chính thức
    if workshop.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sự kiện hiện đang ở trạng thái '{workshop.status}', chưa mở đăng ký (BR-08).",
        )

    # BR-15: Kiểm tra khung thời gian mở/đóng đăng ký
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if workshop.registration_close_at:
        if now > workshop.registration_close_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sự kiện đã đóng cổng đăng ký lúc {workshop.registration_close_at.strftime('%H:%M %d/%m/%Y')} (BR-15).",
            )
    else:
        if now >= workshop.start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã bắt đầu, không thể đăng ký thêm (BR-08).",
            )

    # BR-01: Chống đăng ký trùng (1 email/user = 1 vé)
    existing_reg = (
        db.query(Registration)
        .filter(
            Registration.workshop_id == workshop_id,
            Registration.user_id == current_user.user_id,
            Registration.status.in_(["confirmed", "waitlist", "attended"]),
        )
        .first()
    )
    if existing_reg:
        status_text = "Đã xác nhận" if existing_reg.status in ["confirmed", "attended"] else "Danh sách chờ"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bạn đã có lượt đăng ký ({status_text}) cho Workshop này rồi (BR-01 chống đăng ký trùng).",
        )

    # BR-02: Kiểm soát số lượng vé và Danh sách chờ
    stats = get_workshop_stats(db, workshop)
    is_full = stats["is_full"]

    if is_full and not accept_waitlist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workshop đã hết chỗ. Vui lòng xác nhận tham gia Danh sách chờ (BR-02).",
        )

    if is_full:
        # Đưa vào Waitlist với số thứ tự tiếp theo
        current_max_pos = (
            db.query(func.max(Registration.waitlist_position))
            .filter(
                Registration.workshop_id == workshop_id,
                Registration.status == "waitlist",
            )
            .scalar()
            or 0
        )
        next_pos = current_max_pos + 1

        reg = Registration(
            workshop_id=workshop_id,
            user_id=current_user.user_id,
            status="waitlist",
            waitlist_position=next_pos,
            registered_at=now,
            confirmed_at=None,
        )
    else:
        # Xác nhận đăng ký chính thức
        reg = Registration(
            workshop_id=workshop_id,
            user_id=current_user.user_id,
            status="confirmed",
            waitlist_position=None,
            registered_at=now,
            confirmed_at=now,
        )

    db.add(reg)
    db.commit()
    db.refresh(reg)

    # BR-10: Ghi Audit Log
    log_audit_action(
        db=db,
        actor_id=current_user.user_id,
        action="CREATE_REGISTRATION",
        target_entity="Registrations",
        target_id=reg.registration_id,
        new_value={
            "workshop_id": workshop_id,
            "status": reg.status,
            "waitlist_position": reg.waitlist_position,
        },
        ip_address=ip_address,
    )
    db.commit()
    return reg


def cancel_registration_by_user(
    db: Session,
    registration_id: int,
    cancel_reason: Optional[str],
    current_user: User,
    ip_address: Optional[str] = None,
) -> Registration:
    reg = db.query(Registration).filter(Registration.registration_id == registration_id).first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin đăng ký.",
        )

    # Kiểm tra quyền hủy: Phải là chính chủ hoặc Admin
    if current_user.role != "admin" and reg.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền hủy lượt đăng ký của người khác.",
        )

    if reg.status not in ["confirmed", "waitlist"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể hủy lượt đăng ký ở trạng thái '{reg.status}'.",
        )

    workshop = reg.workshop
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # BR-11: Kiểm soát hạn chót hủy vé (Cutoff time)
    if not check_is_cancellable(workshop) and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã quá hạn chót hủy vé (trước 24 giờ khi sự kiện diễn ra) theo quy tắc BR-11.",
        )

    old_status = reg.status
    old_pos = reg.waitlist_position

    reg.status = "cancelled"
    reg.cancelled_at = now
    reg.cancel_reason = cancel_reason or "Người tham gia tự hủy"
    reg.waitlist_position = None
    db.commit()

    # BR-10: Ghi Audit Log hủy
    log_audit_action(
        db=db,
        actor_id=current_user.user_id,
        action="CANCEL_REGISTRATION",
        target_entity="Registrations",
        target_id=reg.registration_id,
        old_value={"status": old_status, "waitlist_position": old_pos},
        new_value={"status": "cancelled", "cancel_reason": reg.cancel_reason},
        ip_address=ip_address,
    )
    db.commit()

    # BR-03: Nếu vé bị hủy là confirmed -> Tự động đôn người đứng đầu trong Waitlist
    if old_status == "confirmed":
        promote_waitlist_entries(
            db=db,
            workshop_id=workshop.workshop_id,
            available_slots=1,
            actor_id=current_user.user_id,
            ip_address=ip_address,
        )
    elif old_status == "waitlist":
        # Đánh lại số thứ tự cho các người còn lại trong Waitlist
        remaining_waitlist = (
            db.query(Registration)
            .filter(
                Registration.workshop_id == workshop.workshop_id,
                Registration.status == "waitlist",
            )
            .order_by(Registration.waitlist_position.asc(), Registration.registered_at.asc())
            .all()
        )
        for idx, rem_reg in enumerate(remaining_waitlist, start=1):
            rem_reg.waitlist_position = idx
        db.commit()

    db.refresh(reg)
    return reg
