from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.audit import log_audit_action
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.workshop import WorkshopCreate, WorkshopReview, WorkshopUpdate


def get_workshop_stats(db: Session, workshop: Workshop) -> Dict[str, Any]:
    confirmed_count = (
        db.query(func.count(Registration.registration_id))
        .filter(
            Registration.workshop_id == workshop.workshop_id,
            Registration.status.in_(["confirmed", "attended"]),
        )
        .scalar()
        or 0
    )
    waitlist_count = (
        db.query(func.count(Registration.registration_id))
        .filter(
            Registration.workshop_id == workshop.workshop_id,
            Registration.status == "waitlist",
        )
        .scalar()
        or 0
    )
    attended_count = (
        db.query(func.count(Registration.registration_id))
        .filter(
            Registration.workshop_id == workshop.workshop_id,
            Registration.status == "attended",
        )
        .scalar()
        or 0
    )
    is_full = confirmed_count >= workshop.quota

    # BR-15 Check if registration is currently open
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    is_open = False
    if workshop.status == "published":
        open_ok = True
        close_ok = True
        if workshop.registration_open_at:
            open_ok = now >= workshop.registration_open_at
        if workshop.registration_close_at:
            close_ok = now <= workshop.registration_close_at
        else:
            close_ok = now < workshop.start_at
        is_open = open_ok and close_ok

    return {
        "confirmed_count": confirmed_count,
        "waitlist_count": waitlist_count,
        "attended_count": attended_count,
        "is_full": is_full,
        "is_registration_open": is_open,
    }


def validate_workshop_time_constraints(
    start_at: datetime,
    end_at: datetime,
    checkin_start_at: datetime,
    checkin_end_at: datetime,
    registration_open_at: Optional[datetime] = None,
    registration_close_at: Optional[datetime] = None,
):
    if end_at <= start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc sự kiện (end_at) phải sau thời gian bắt đầu (start_at).",
        )
    if checkin_end_at <= checkin_start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời điểm kết thúc check-in phải sau thời điểm bắt đầu check-in.",
        )
    if checkin_end_at > end_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời điểm kết thúc check-in không được sau thời gian kết thúc sự kiện.",
        )
    if registration_open_at and registration_close_at:
        if registration_close_at <= registration_open_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời điểm đóng đăng ký phải sau thời điểm mở đăng ký.",
            )
    if registration_close_at and registration_close_at > start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời điểm đóng đăng ký không được sau thời gian bắt đầu sự kiện.",
        )


def create_workshop(
    db: Session,
    workshop_in: WorkshopCreate,
    organizer_id: int,
    ip_address: Optional[str] = None,
) -> Workshop:
    validate_workshop_time_constraints(
        start_at=workshop_in.start_at,
        end_at=workshop_in.end_at,
        checkin_start_at=workshop_in.checkin_start_at,
        checkin_end_at=workshop_in.checkin_end_at,
        registration_open_at=workshop_in.registration_open_at,
        registration_close_at=workshop_in.registration_close_at,
    )

    checkin_code = f"WS-CHECKIN-{uuid.uuid4().hex[:8].upper()}"

    workshop = Workshop(
        organizer_id=organizer_id,
        title=workshop_in.title,
        description=workshop_in.description,
        location=workshop_in.location,
        start_at=workshop_in.start_at,
        end_at=workshop_in.end_at,
        registration_open_at=workshop_in.registration_open_at,
        registration_close_at=workshop_in.registration_close_at,
        quota=workshop_in.quota,
        checkin_code=checkin_code,
        checkin_start_at=workshop_in.checkin_start_at,
        checkin_end_at=workshop_in.checkin_end_at,
        status="draft",  # BR-07: Khởi tạo ở trạng thái draft
    )
    db.add(workshop)
    db.commit()
    db.refresh(workshop)

    # BR-10: Audit Log
    log_audit_action(
        db=db,
        actor_id=organizer_id,
        action="CREATE_WORKSHOP",
        target_entity="Workshops",
        target_id=workshop.workshop_id,
        new_value={"title": workshop.title, "quota": workshop.quota, "status": workshop.status},
        ip_address=ip_address,
    )
    db.commit()
    return workshop


def update_workshop(
    db: Session,
    workshop: Workshop,
    update_in: WorkshopUpdate,
    actor: User,
    ip_address: Optional[str] = None,
) -> Workshop:
    if workshop.status not in ["draft", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể chỉnh sửa Workshop ở trạng thái '{workshop.status}'.",
        )

    update_dict = update_in.model_dump(exclude_unset=True)

    # Tính toán các mốc thời gian sau cập nhật để validate
    new_start_at = update_dict.get("start_at", workshop.start_at)
    new_end_at = update_dict.get("end_at", workshop.end_at)
    new_checkin_start = update_dict.get("checkin_start_at", workshop.checkin_start_at)
    new_checkin_end = update_dict.get("checkin_end_at", workshop.checkin_end_at)
    new_reg_open = update_dict.get("registration_open_at", workshop.registration_open_at)
    new_reg_close = update_dict.get("registration_close_at", workshop.registration_close_at)

    validate_workshop_time_constraints(
        start_at=new_start_at,
        end_at=new_end_at,
        checkin_start_at=new_checkin_start,
        checkin_end_at=new_checkin_end,
        registration_open_at=new_reg_open,
        registration_close_at=new_reg_close,
    )

    old_data = {
        "title": workshop.title,
        "quota": workshop.quota,
        "start_at": str(workshop.start_at),
        "end_at": str(workshop.end_at),
    }

    # BR-12: Thay đổi Quota sau công bố
    if update_in.quota is not None and update_in.quota != workshop.quota:
        stats = get_workshop_stats(db, workshop)
        confirmed_count = stats["confirmed_count"]

        if update_in.quota < confirmed_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không thể giảm Quota ({update_in.quota}) nhỏ hơn số lượng đã xác nhận ({confirmed_count}) theo quy tắc BR-12.",
            )

        # Nếu tăng Quota và có người trong Waitlist -> Kích hoạt đôn Waitlist theo BR-03, BR-12
        added_slots = update_in.quota - workshop.quota
        workshop.quota = update_in.quota

        if added_slots > 0:
            promote_waitlist_entries(db, workshop.workshop_id, added_slots, actor.user_id, ip_address)

    if "quota" in update_dict:
        del update_dict["quota"]  # Đã xử lý ở trên

    # Cập nhật các trường được set (kể cả None)
    for key, value in update_dict.items():
        setattr(workshop, key, value)

    db.commit()
    db.refresh(workshop)

    # BR-10: Ghi Audit Log
    new_data = {
        "title": workshop.title,
        "quota": workshop.quota,
        "start_at": str(workshop.start_at),
        "end_at": str(workshop.end_at),
    }
    log_audit_action(
        db=db,
        actor_id=actor.user_id,
        action="UPDATE_WORKSHOP",
        target_entity="Workshops",
        target_id=workshop.workshop_id,
        old_value=old_data,
        new_value=new_data,
        ip_address=ip_address,
    )
    db.commit()
    return workshop


def submit_workshop_for_approval(
    db: Session,
    workshop: Workshop,
    actor: User,
    ip_address: Optional[str] = None,
) -> Workshop:
    if workshop.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể gửi duyệt Workshop đang ở trạng thái Nháp (draft).",
        )

    old_status = workshop.status
    workshop.status = "pending"
    workshop.rejection_reason = None
    db.commit()
    db.refresh(workshop)

    log_audit_action(
        db=db,
        actor_id=actor.user_id,
        action="SUBMIT_FOR_APPROVAL",
        target_entity="Workshops",
        target_id=workshop.workshop_id,
        old_value={"status": old_status},
        new_value={"status": "pending"},
        ip_address=ip_address,
    )
    db.commit()
    return workshop


def review_workshop(
    db: Session,
    workshop: Workshop,
    review_in: WorkshopReview,
    admin_user: User,
    ip_address: Optional[str] = None,
) -> Workshop:
    if workshop.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể duyệt Workshop đang ở trạng thái Chờ duyệt (pending).",
        )

    old_status = workshop.status
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if review_in.action == "approve":
        # BR-06: Phê duyệt -> Chuyển published, đồng thời gán registration_open_at = thời điểm hiện tại
        workshop.status = "published"
        workshop.registration_open_at = now
        workshop.rejection_reason = None
        action_name = "APPROVE_WORKSHOP"
        new_val = {"status": "published", "registration_open_at": str(now)}
    else:
        # Từ chối -> Chuyển về draft kèm lý do từ chối
        if not review_in.rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bắt buộc phải nhập lý do từ chối khi từ chối Workshop.",
            )
        workshop.status = "draft"
        workshop.rejection_reason = review_in.rejection_reason
        action_name = "REJECT_WORKSHOP"
        new_val = {"status": "draft", "rejection_reason": review_in.rejection_reason}

    db.commit()
    db.refresh(workshop)

    log_audit_action(
        db=db,
        actor_id=admin_user.user_id,
        action=action_name,
        target_entity="Workshops",
        target_id=workshop.workshop_id,
        old_value={"status": old_status},
        new_value=new_val,
        ip_address=ip_address,
    )
    db.commit()
    return workshop


def cancel_workshop(
    db: Session,
    workshop: Workshop,
    cancel_reason: str,
    actor: User,
    ip_address: Optional[str] = None,
) -> Workshop:
    if workshop.status in ["cancelled", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workshop đã ở trạng thái '{workshop.status}', không thể hủy.",
        )

    old_status = workshop.status
    workshop.status = "cancelled"
    workshop.cancel_reason = cancel_reason

    # BR-13 Cascading: Hủy toàn bộ đăng ký liên quan (confirmed + waitlist)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    registrations = (
        db.query(Registration)
        .filter(
            Registration.workshop_id == workshop.workshop_id,
            Registration.status.in_(["confirmed", "waitlist"]),
        )
        .all()
    )

    for reg in registrations:
        reg.status = "cancelled"
        reg.cancel_reason = f"Workshop bị hủy: {cancel_reason}"
        reg.cancelled_at = now

    db.commit()
    db.refresh(workshop)

    # Phân biệt Action ghi Audit Log theo actor (Organizer vs Admin - UC-07 & UC-21)
    action_name = "FORCE_CANCEL_BY_ADMIN" if actor.role == "admin" else "CANCEL_BY_ORGANIZER"
    log_audit_action(
        db=db,
        actor_id=actor.user_id,
        action=action_name,
        target_entity="Workshops",
        target_id=workshop.workshop_id,
        old_value={"status": old_status},
        new_value={"status": "cancelled", "cancel_reason": cancel_reason, "cancelled_registrations_count": len(registrations)},
        ip_address=ip_address,
    )
    db.commit()
    return workshop


def promote_waitlist_entries(
    db: Session,
    workshop_id: int,
    available_slots: int,
    actor_id: int,
    ip_address: Optional[str] = None,
) -> List[Registration]:
    """
    BR-03: Tự động đôn hàng đợi Waitlist (FIFO) khi có chỗ trống.
    Ưu tiên lượt đăng ký có waitlist_position nhỏ nhất (hoặc registered_at sớm nhất).
    """
    if available_slots <= 0:
        return []

    # Lấy danh sách Waitlist xếp theo thứ tự FIFO
    waitlist_candidates = (
        db.query(Registration)
        .filter(
            Registration.workshop_id == workshop_id,
            Registration.status == "waitlist",
        )
        .order_by(Registration.waitlist_position.asc(), Registration.registered_at.asc())
        .limit(available_slots)
        .all()
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    promoted = []

    for reg in waitlist_candidates:
        old_pos = reg.waitlist_position
        reg.status = "confirmed"
        reg.confirmed_at = now
        reg.waitlist_position = None
        promoted.append(reg)

        # BR-10: Ghi vết đôn waitlist
        log_audit_action(
            db=db,
            actor_id=actor_id,
            action="AUTO_PROMOTE_WAITLIST",
            target_entity="Registrations",
            target_id=reg.registration_id,
            old_value={"status": "waitlist", "waitlist_position": old_pos},
            new_value={"status": "confirmed", "confirmed_at": str(now)},
            ip_address=ip_address,
        )

    # Đánh lại số thứ tự waitlist_position cho những người còn lại trong Waitlist
    remaining_waitlist = (
        db.query(Registration)
        .filter(
            Registration.workshop_id == workshop_id,
            Registration.status == "waitlist",
        )
        .order_by(Registration.waitlist_position.asc(), Registration.registered_at.asc())
        .all()
    )

    for idx, rem_reg in enumerate(remaining_waitlist, start=1):
        rem_reg.waitlist_position = idx

    db.commit()
    return promoted
