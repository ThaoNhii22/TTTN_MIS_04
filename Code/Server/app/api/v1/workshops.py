from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_client_ip, get_current_user, require_roles, verify_workshop_organizer_or_admin
from app.models.user import User
from app.models.workshop import Workshop
from app.schemas.workshop import (
    WorkshopCancel,
    WorkshopCreate,
    WorkshopDetailResponse,
    WorkshopResponse,
    WorkshopReview,
    WorkshopUpdate,
)
from app.services.workshop_service import (
    cancel_workshop,
    create_workshop,
    get_workshop_stats,
    review_workshop,
    submit_workshop_for_approval,
    update_workshop,
)

router = APIRouter(prefix="/workshops", tags=["Quản lý Workshop (Workshops)"])


def format_workshop_response(db: Session, workshop: Workshop) -> Dict[str, Any]:
    stats = get_workshop_stats(db, workshop)
    return {
        "workshop_id": workshop.workshop_id,
        "organizer_id": workshop.organizer_id,
        "title": workshop.title,
        "description": workshop.description,
        "location": workshop.location,
        "start_at": workshop.start_at,
        "end_at": workshop.end_at,
        "registration_open_at": workshop.registration_open_at,
        "registration_close_at": workshop.registration_close_at,
        "quota": workshop.quota,
        "checkin_code": workshop.checkin_code,
        "checkin_start_at": workshop.checkin_start_at,
        "checkin_end_at": workshop.checkin_end_at,
        "status": workshop.status,
        "cancel_reason": workshop.cancel_reason,
        "rejection_reason": workshop.rejection_reason,
        "created_at": workshop.created_at,
        "updated_at": workshop.updated_at,
        "confirmed_count": stats["confirmed_count"],
        "waitlist_count": stats["waitlist_count"],
        "attended_count": stats["attended_count"],
        "is_full": stats["is_full"],
        "is_registration_open": stats["is_registration_open"],
    }


@router.get(
    "",
    response_model=List[WorkshopResponse],
    summary="UC-08: Xem danh sách Workshop",
)
def list_workshops(
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái: published, draft, pending, cancelled, completed"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tiêu đề hoặc địa điểm"),
    my_organized: bool = Query(False, description="Chỉ lấy Workshop do mình tổ chức (dành cho Organizer)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Use Case 08: Xem danh sách Workshop.
    - Participant: mặc định xem các workshop 'published'.
    - Organizer: có thể xem workshop do mình tổ chức hoặc tất cả.
    - Admin: xem toàn bộ workshop.
    """
    query = db.query(Workshop)

    if my_organized and current_user:
        query = query.filter(Workshop.organizer_id == current_user.user_id)
    elif current_user.role == "participant":
        # Participant chỉ xem được published hoặc đã kết thúc
        if status_filter:
            query = query.filter(Workshop.status == status_filter)
        else:
            query = query.filter(Workshop.status.in_(["published", "completed"]))
    else:
        if status_filter:
            query = query.filter(Workshop.status == status_filter)

    if search:
        kw = f"%{search.strip()}%"
        query = query.filter((Workshop.title.ilike(kw)) | (Workshop.location.ilike(kw)))

    workshops = query.order_by(Workshop.start_at.desc()).all()
    return [format_workshop_response(db, w) for w in workshops]


@router.get(
    "/{workshop_id}",
    response_model=WorkshopDetailResponse,
    summary="Xem chi tiết Workshop",
)
def get_workshop_detail(workshop_id: int, db: Session = Depends(get_db)):
    workshop = db.query(Workshop).filter(Workshop.workshop_id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workshop không tồn tại.")

    data = format_workshop_response(db, workshop)
    data["organizer"] = workshop.organizer
    return data


@router.post(
    "",
    response_model=WorkshopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC-03: Tạo Workshop mới (Organizer)",
    dependencies=[Depends(require_roles(["organizer", "admin"]))],
)
def create_new_workshop(
    workshop_in: WorkshopCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["organizer", "admin"])),
):
    """
    Use Case 03: Người tổ chức tạo Workshop mới trên hệ thống (Khởi tạo ở trạng thái Nháp - BR-07).
    """
    workshop = create_workshop(
        db=db,
        workshop_in=workshop_in,
        organizer_id=current_user.user_id,
        ip_address=get_client_ip(request),
    )
    return format_workshop_response(db, workshop)


@router.put(
    "/{workshop_id}",
    response_model=WorkshopResponse,
    summary="UC-04: Chỉnh sửa Workshop (Organizer)",
)
def edit_workshop(
    workshop_id: int,
    update_in: WorkshopUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Use Case 04: Chỉnh sửa thông tin Workshop.
    Bắt buộc kiểm tra quyền sở hữu workshop.organizer_id == current_user.user_id (Bỏ qua với Admin).
    Kiểm soát thay đổi Quota theo BR-12.
    """
    updated = update_workshop(
        db=db,
        workshop=workshop,
        update_in=update_in,
        actor=current_user,
        ip_address=get_client_ip(request),
    )
    return format_workshop_response(db, updated)


@router.post(
    "/{workshop_id}/submit",
    response_model=WorkshopResponse,
    summary="UC-05: Gửi Workshop để phê duyệt (Organizer)",
)
def submit_workshop(
    workshop_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Use Case 05: Gửi Workshop đã hoàn thiện (draft) đến Quản trị viên để xét duyệt (pending).
    Bắt buộc kiểm tra quyền sở hữu.
    """
    submitted = submit_workshop_for_approval(
        db=db,
        workshop=workshop,
        actor=current_user,
        ip_address=get_client_ip(request),
    )
    return format_workshop_response(db, submitted)


@router.post(
    "/{workshop_id}/review",
    response_model=WorkshopResponse,
    summary="UC-06: Xét duyệt Workshop (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def review_workshop_endpoint(
    workshop_id: int,
    review_in: WorkshopReview,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(["admin"])),
):
    """
    Use Case 06: Quản trị viên kiểm tra và phê duyệt/từ chối Workshop (BR-06).
    Nếu duyệt: Chuyển 'published', gán registration_open_at = thời điểm hiện tại.
    Nếu từ chối: Chuyển 'draft', lưu rejection_reason.
    """
    workshop = db.query(Workshop).filter(Workshop.workshop_id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workshop không tồn tại.")

    reviewed = review_workshop(
        db=db,
        workshop=workshop,
        review_in=review_in,
        admin_user=current_admin,
        ip_address=get_client_ip(request),
    )
    return format_workshop_response(db, reviewed)


@router.post(
    "/{workshop_id}/cancel",
    response_model=WorkshopResponse,
    summary="UC-07 & UC-21: Hủy Workshop (Organizer / Admin)",
)
def cancel_workshop_endpoint(
    workshop_id: int,
    cancel_in: WorkshopCancel,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workshop: Workshop = Depends(verify_workshop_organizer_or_admin),
):
    """
    Use Case 07 & 21: Hủy sự kiện.
    - Organizer hủy sự kiện của mình (kiểm tra ownership) -> Ghi Audit Log CANCEL_BY_ORGANIZER.
    - Admin cưỡng chế hủy sự kiện (bỏ qua check ownership) -> Ghi Audit Log FORCE_CANCEL_BY_ADMIN.
    - BR-13 Cascading: Tự động hủy toàn bộ Registrations liên quan.
    """
    cancelled = cancel_workshop(
        db=db,
        workshop=workshop,
        cancel_reason=cancel_in.cancel_reason,
        actor=current_user,
        ip_address=get_client_ip(request),
    )
    return format_workshop_response(db, cancelled)
