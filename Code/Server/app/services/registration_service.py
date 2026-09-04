from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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
    return bool(now < cutoff_time)


def register_for_workshop(
    db: Session,
    workshop_id: int,
    current_user: User,
    accept_waitlist: bool = True,
    ip_address: Optional[str] = None,
) -> Registration:
    workshop = (
        db.query(Workshop)
        .filter(Workshop.workshop_id == workshop_id)
        .with_for_update()  # Row-lock Workshop để ngăn race condition khi nhiều người đăng ký đồng thời
        .first()
    )
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
    if workshop.registration_open_at and now < workshop.registration_open_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cổng đăng ký chưa mở (mở lúc {workshop.registration_open_at.strftime('%H:%M %d/%m/%Y')}) theo quy tắc BR-15.",
        )
    if workshop.registration_close_at and now > workshop.registration_close_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sự kiện đã đóng cổng đăng ký lúc {workshop.registration_close_at.strftime('%H:%M %d/%m/%Y')} (BR-15).",
        )
    if not workshop.registration_close_at and now >= workshop.start_at:
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
        )
        .with_for_update()
        .first()
    )
    if existing_reg and existing_reg.status in ["confirmed", "waitlist", "attended"]:
        status_text = "Đã xác nhận" if existing_reg.status in ["confirmed", "attended"] else "Danh sách chờ"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bạn đã có lượt đăng ký ({status_text}) cho Workshop này rồi (BR-01 chống đăng ký trùng).",
        )

    # BR-02: Kiểm soát số lượng vé và Danh sách chờ (Khóa dòng và đọc dữ liệu mới nhất - Current Read)
    confirmed_regs = (
        db.query(Registration)
        .filter(
            Registration.workshop_id == workshop_id,
            Registration.status.in_(["confirmed", "attended"]),
        )
        .with_for_update()
        .all()
    )
    confirmed_count = len(confirmed_regs)
    is_full = confirmed_count >= workshop.quota

    if is_full and not accept_waitlist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workshop đã hết chỗ. Vui lòng xác nhận tham gia Danh sách chờ (BR-02).",
        )

    if is_full:
        # Đưa vào Waitlist với số thứ tự tiếp theo (Đọc có khóa dòng để lấy vị trí chính xác)
        waitlist_regs = (
            db.query(Registration)
            .filter(
                Registration.workshop_id == workshop_id,
                Registration.status == "waitlist",
            )
            .with_for_update()
            .all()
        )
        current_max_pos = max([r.waitlist_position or 0 for r in waitlist_regs], default=0)
        next_pos = current_max_pos + 1

        if existing_reg:
            reg = existing_reg
            setattr(reg, "status", "waitlist")
            setattr(reg, "waitlist_position", next_pos)
            setattr(reg, "registered_at", now)
            setattr(reg, "cancelled_at", None)
            setattr(reg, "cancel_reason", None)
            setattr(reg, "confirmed_at", None)
        else:
            reg = Registration(
                workshop_id=workshop_id,
                user_id=current_user.user_id,
                status="waitlist",
                waitlist_position=next_pos,
                registered_at=now,
                confirmed_at=None,
            )
            db.add(reg)
    else:
        # Xác nhận đăng ký chính thức
        if existing_reg:
            reg = existing_reg
            setattr(reg, "status", "confirmed")
            setattr(reg, "waitlist_position", None)
            setattr(reg, "registered_at", now)
            setattr(reg, "cancelled_at", None)
            setattr(reg, "cancel_reason", None)
            setattr(reg, "confirmed_at", now)
        else:
            reg = Registration(
                workshop_id=workshop_id,
                user_id=current_user.user_id,
                status="confirmed",
                waitlist_position=None,
                registered_at=now,
                confirmed_at=now,
            )
            db.add(reg)

    try:
        db.commit()
        db.refresh(reg)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã có lượt đăng ký cho Workshop này rồi (BR-01 chống đăng ký trùng).",
        )
    except Exception:
        db.rollback()
        raise

    # BR-10: Ghi Audit Log
    try:
        log_audit_action(
            db=db,
            actor_id=getattr(current_user, "user_id"),
            action="CREATE_REGISTRATION",
            target_entity="Registrations",
            target_id=getattr(reg, "registration_id", None),
            new_value={
                "workshop_id": workshop_id,
                "status": reg.status,
                "waitlist_position": reg.waitlist_position,
            },
            ip_address=ip_address,
        )
        db.commit()
    except Exception:
        db.rollback()

    return reg


def cancel_registration_by_user(
    db: Session,
    registration_id: int,
    cancel_reason: Optional[str],
    current_user: User,
    ip_address: Optional[str] = None,
) -> Registration:
    reg = (
        db.query(Registration)
        .filter(Registration.registration_id == registration_id)
        .with_for_update()
        .first()
    )
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

    old_status = str(reg.status)
    old_pos = reg.waitlist_position

    setattr(reg, "status", "cancelled")
    setattr(reg, "cancelled_at", now)
    setattr(reg, "cancel_reason", cancel_reason or "Người tham gia tự hủy")
    setattr(reg, "waitlist_position", None)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    # BR-10: Ghi Audit Log hủy
    try:
        log_audit_action(
            db=db,
            actor_id=getattr(current_user, "user_id"),
            action="CANCEL_REGISTRATION",
            target_entity="Registrations",
            target_id=getattr(reg, "registration_id", None),
            old_value={"status": old_status, "waitlist_position": old_pos},
            new_value={"status": "cancelled", "cancel_reason": reg.cancel_reason},
            ip_address=ip_address,
        )
        db.commit()
    except Exception:
        db.rollback()

    # BR-03: Nếu vé bị hủy là confirmed -> Tự động đôn người đứng đầu trong Waitlist
    if old_status == "confirmed":
        promote_waitlist_entries(
            db=db,
            workshop_id=getattr(workshop, "workshop_id"),
            available_slots=1,
            actor_id=getattr(current_user, "user_id"),
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
            .with_for_update()
            .order_by(Registration.waitlist_position.asc(), Registration.registered_at.asc())
            .all()
        )
        for idx, rem_reg in enumerate(remaining_waitlist, start=1):
            setattr(rem_reg, "waitlist_position", idx)
        try:
            db.commit()
        except Exception:
            db.rollback()

    db.refresh(reg)
    return reg
