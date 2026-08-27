from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import log_audit_action
from app.models.attendance import Attendance
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.attendance import CheckinRequest


def process_checkin(
    db: Session,
    checkin_in: CheckinRequest,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Attendance:
    workshop = db.query(Workshop).filter(Workshop.workshop_id == checkin_in.workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop không tồn tại trên hệ thống.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # BR-05: Kiểm soát thời gian điểm danh
    if now < workshop.checkin_start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chưa đến giờ điểm danh (Cổng check-in mở lúc {workshop.checkin_start_at.strftime('%H:%M %d/%m/%Y')}) theo quy tắc BR-05.",
        )
    if now > workshop.checkin_end_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Đã hết thời gian điểm danh (Cổng check-in đóng lúc {workshop.checkin_end_at.strftime('%H:%M %d/%m/%Y')}) theo quy tắc BR-05.",
        )

    # Xác định Registration cần điểm danh
    target_registration: Optional[Registration] = None

    if checkin_in.registration_id:
        # Check-in chỉ định bởi Organizer / Admin
        target_registration = (
            db.query(Registration)
            .filter(
                Registration.registration_id == checkin_in.registration_id,
                Registration.workshop_id == workshop.workshop_id,
            )
            .first()
        )
    elif checkin_in.qr_payload:
        # Điểm danh bằng QR Payload format: TTTN_MIS_04|{workshop_id}|{registration_id}|{email}
        parts = checkin_in.qr_payload.strip().split("|")
        if len(parts) >= 3 and parts[0] == "TTTN_MIS_04":
            ws_id = int(parts[1])
            reg_id = int(parts[2])
            if ws_id != workshop.workshop_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã QR này thuộc về Workshop khác, không hợp lệ cho sự kiện này.",
                )
            target_registration = (
                db.query(Registration)
                .filter(
                    Registration.registration_id == reg_id,
                    Registration.workshop_id == workshop.workshop_id,
                )
                .first()
            )
    elif checkin_in.checkin_code:
        # BR-04: Kiểm tra mã check-in của Workshop
        if checkin_in.checkin_code.strip() != workshop.checkin_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã điểm danh không chính xác (BR-04).",
            )
        # Người tham gia tự check-in bằng mã của Workshop
        target_registration = (
            db.query(Registration)
            .filter(
                Registration.workshop_id == workshop.workshop_id,
                Registration.user_id == current_user.user_id,
            )
            .first()
        )

    if not target_registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt đăng ký hợp lệ để điểm danh.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # FIX RACE CONDITION (BR-14): Khóa dòng Registration trước khi kiểm tra và ghi
    # điểm danh. Ngăn 2 request đồng thời quét cùng 1 mã QR:
    #   - Cũ: SELECT EXISTS → False (cả 2 thread) → cả 2 INSERT → Duplicate Attendance
    #   - Mới: with_for_update() giữ Row Lock → chỉ 1 request xử lý tại 1 thời điểm
    #
    # Kết hợp 2 lớp bảo vệ:
    #   1. with_for_update() — ngăn race ở tầng app (chính)
    #   2. IntegrityError catch — bắt UNIQUE(registration_id) ở tầng DB (defense in depth)
    # ─────────────────────────────────────────────────────────────────────────
    target_registration = (
        db.query(Registration)
        .filter(Registration.registration_id == target_registration.registration_id)
        .with_for_update()  # InnoDB Row Lock
        .first()
    )

    # Kiểm tra trạng thái vé: Phải là confirmed
    if target_registration.status == "waitlist":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt đăng ký đang ở Danh sách chờ (chưa được xác nhận vé chính thức), không thể điểm danh.",
        )
    if target_registration.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt đăng ký này đã bị hủy, không thể điểm danh.",
        )

    # BR-14: Chống điểm danh trùng — kiểm tra tầng app (SAU KHI đã có Row Lock)
    existing_attendance = (
        db.query(Attendance)
        .filter(Attendance.registration_id == target_registration.registration_id)
        .first()
    )
    if existing_attendance or target_registration.status == "attended":
        checkin_time_str = existing_attendance.checkin_at.strftime("%H:%M:%S ngày %d/%m/%Y") if existing_attendance else "trước đó"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lượt đăng ký này đã được điểm danh lúc {checkin_time_str} (BR-14 chống điểm danh trùng).",
        )

    # Ghi nhận điểm danh
    attendance = Attendance(
        registration_id=target_registration.registration_id,
        checkin_at=now,
        checkin_method=checkin_in.checkin_method,
    )
    target_registration.status = "attended"

    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        # Lớp bảo vệ thứ 2: Bắt UNIQUE(registration_id) constraint từ tầng DB
        # Trường hợp hiếm hơn nhưng vẫn có thể xảy ra ở tầng connection pool
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lượt đăng ký này đã được điểm danh rồi (BR-14). Vui lòng kiểm tra lại.",
        )
    db.refresh(attendance)

    # BR-10: Audit Log
    log_audit_action(
        db=db,
        actor_id=current_user.user_id,
        action="CHECKIN_PARTICIPANT",
        target_entity="Attendance",
        target_id=attendance.attendance_id,
        new_value={
            "workshop_id": workshop.workshop_id,
            "registration_id": target_registration.registration_id,
            "checkin_method": checkin_in.checkin_method,
            "checkin_at": str(now),
        },
        ip_address=ip_address,
    )
    db.commit()
    return attendance
