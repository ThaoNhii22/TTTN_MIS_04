from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_action
from app.core.database import get_db
from app.core.deps import get_client_ip, require_roles
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdateRole, UserUpdateStatus

router = APIRouter(prefix="/users", tags=["Quản lý Tài khoản & Phân quyền (Users)"])


@router.get(
    "",
    response_model=List[UserResponse],
    summary="UC-15: Quản lý danh sách tài khoản (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def list_users(
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Use Case 15: Xem danh sách toàn bộ người dùng trong hệ thống nội bộ.
    """
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if status_filter:
        query = query.filter(User.status == status_filter)
    if search:
        kw = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(kw)) | (User.email.ilike(kw)))

    return query.order_by(User.user_id.asc()).all()


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC-14: Cấp tài khoản nội bộ mới (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_internal_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(["admin"])),
):
    """
    Use Case 14: Quản trị viên (Admin) cấp tài khoản nội bộ mới (Participant, Organizer, Admin).
    """
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' đã tồn tại trong hệ thống.",
        )

    user = User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        status=user_in.status or "active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # BR-10: Ghi vết Audit Log
    log_audit_action(
        db=db,
        actor_id=current_admin.user_id,
        action="CREATE_USER",
        target_entity="Users",
        target_id=user.user_id,
        new_value={"email": user.email, "role": user.role, "status": user.status},
        ip_address=get_client_ip(request),
    )
    db.commit()
    return user


@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="UC-14: Phân quyền vai trò người dùng (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_user_role(
    user_id: int,
    role_in: UserUpdateRole,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(["admin"])),
):
    """
    Use Case 14: Quản trị viên thay đổi vai trò (Role) của người dùng.
    Ghi vết nhật ký bắt buộc vào AuditLogs với action = "UPDATE_ROLE" (BR-10).
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    old_role = user.role
    user.role = role_in.role
    db.commit()
    db.refresh(user)

    # BR-10: Ghi vết thay đổi vai trò
    log_audit_action(
        db=db,
        actor_id=current_admin.user_id,
        action="UPDATE_ROLE",
        target_entity="Users",
        target_id=user.user_id,
        old_value={"role": old_role},
        new_value={"role": user.role},
        ip_address=get_client_ip(request),
    )
    db.commit()
    return user


@router.put(
    "/{user_id}/status",
    response_model=UserResponse,
    summary="UC-15: Khóa/Mở khóa/Cập nhật trạng thái tài khoản (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_user_status(
    user_id: int,
    status_in: UserUpdateStatus,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(["admin"])),
):
    """
    Use Case 15: Khóa hoặc kích hoạt lại tài khoản người dùng.
    Ghi vết nhật ký vào AuditLogs (BR-10).
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    old_status = user.status
    user.status = status_in.status
    db.commit()
    db.refresh(user)

    log_audit_action(
        db=db,
        actor_id=current_admin.user_id,
        action="UPDATE_STATUS",
        target_entity="Users",
        target_id=user.user_id,
        old_value={"status": old_status},
        new_value={"status": user.status},
        ip_address=get_client_ip(request),
    )
    db.commit()
    return user
