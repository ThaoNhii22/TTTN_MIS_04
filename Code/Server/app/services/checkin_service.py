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
    # Tìm Workshop tương ứng
    workshop: Optional[Workshop] = None
    if checkin_in.workshop_id:
        workshop = db.query(Workshop).filter(Workshop.workshop_id == checkin_in.workshop_id).first()
    elif checkin_in.qr_payload and checkin_in.qr_payload.strip().startswith("TTTN_MIS_04|"):
        parts = checkin_in.qr_payload.strip().split("|")
        if len(parts) >= 2:
            try:
                ws_id = int(parts[1])
                workshop = db.query(Workshop).filter(Workshop.workshop_id == ws_id).first()
            except ValueError:
                pass
    elif checkin_in.checkin_code:
        workshop = db.query(Workshop).filter(Workshop.checkin_code == checkin_in.checkin_code.strip()).first()
    elif checkin_in.registration_id:
        reg_temp = db.query(Registration).filter(Registration.registration_id == checkin_in.registration_id).first()
        if reg_temp:
            workshop = reg_temp.workshop

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

    # Xác định Registration cần điểm danh và Kiểm tra Quyền bảo mật
    target_registration: Optional[Registration] = None

    if checkin_in.registration_id:
        target_registration = (
            db.query(Registration)
            .filter(Registration.registration_id == checkin_in.registration_id)
            .with_for_update()
            .first()
        )
        if not target_registration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lượt đăng ký theo mã chỉ định.",
            )
        if target_registration.workshop_id != workshop.workshop_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lượt đăng ký này không thuộc về Workshop đã chọn.",
            )
        # Kiểm tra bảo mật: Participant chỉ được check-in cho chính mình
        if current_user.role == "participant" and target_registration.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền điểm danh cho người khác (Participant chỉ được check-in cho chính mình).",
            )
        if current_user.role == "organizer" and workshop.organizer_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền quản lý điểm danh cho Workshop của người khác.",
            )

    elif checkin_in.qr_payload:
        # Điểm danh bằng QR Payload format: TTTN_MIS_04|{workshop_id}|{registration_id}|{email} hoặc checkin_code
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
                .with_for_update()
                .first()
            )
            if not target_registration:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy lượt đăng ký theo mã QR.",
                )
            # Kiểm tra bảo mật khi Participant tự quét QR của người khác
            if current_user.role == "participant" and target_registration.user_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền điểm danh cho người khác (Participant chỉ được check-in cho chính mình).",
                )
            if current_user.role == "organizer" and workshop.organizer_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền quản lý điểm danh cho Workshop của người khác.",
                )
        else:
            # QR chứa mã checkin_code của Workshop
            if checkin_in.qr_payload.strip() != workshop.checkin_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã QR điểm danh không chính xác (BR-04).",
                )
            target_registration = (
                db.query(Registration)
                .filter(
                    Registration.workshop_id == workshop.workshop_id,
                    Registration.user_id == current_user.user_id,
                )
                .with_for_update()
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
            .with_for_update()
            .first()
        )

    if not target_registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt đăng ký hợp lệ để điểm danh.",
        )

    # Kiểm tra trạng thái vé: Bắt buộc phải là confirmed (hoặc reject rõ lý do)
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

    # BR-14: Chống điểm danh trùng (được bảo vệ bởi Row Lock và DB Unique Constraint)
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

    if target_registration.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái đăng ký '{target_registration.status}' không hợp lệ để điểm danh.",
        )

    # Ghi nhận điểm danh
    attendance = Attendance(
        registration_id=target_registration.registration_id,
        checkin_at=now,
        checkin_method=checkin_in.checkin_method,
        status="present",
    )
    setattr(target_registration, "status", "attended")

    db.add(attendance)
    try:
        db.commit()
        db.refresh(attendance)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt đăng ký này đã được điểm danh trước đó (BR-14 chống điểm danh trùng).",
        )
    except Exception:
        db.rollback()
        raise

    # BR-10: Audit Log
    try:
        log_audit_action(
            db=db,
            actor_id=getattr(current_user, "user_id"),
            action="CHECKIN_PARTICIPANT",
            target_entity="Attendance",
            target_id=getattr(attendance, "attendance_id", None),
            new_value={
                "workshop_id": getattr(workshop, "workshop_id"),
                "registration_id": getattr(target_registration, "registration_id"),
                "checkin_method": checkin_in.checkin_method,
                "status": attendance.status,
                "checkin_at": str(now),
            },
            ip_address=ip_address,
        )
        db.commit()
    except Exception:
        db.rollback()
        # Audit log failure should not crash successful checkin

    return attendance
