from typing import Callable, List, Optional
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.workshop import Workshop

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực. Vui lòng đăng nhập.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ hoặc đã hết hạn.",
            )
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )

    user = db.query(User).filter(User.user_id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")
    if user.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.",
        )
    if user.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa được kích hoạt.",
        )
    return user


def get_optional_current_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.user_id == int(user_id)).first()
    except Exception:
        return None


def require_roles(allowed_roles: List[str]) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối. Chức năng yêu cầu vai trò: {', '.join(allowed_roles)}.",
            )
        return current_user

    return role_checker


def verify_workshop_organizer_or_admin(
    workshop_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workshop:
    """
    Kiểm tra quyền sở hữu Workshop cho các endpoint Organizer-scoped.
    Nếu user là Admin -> Bỏ qua kiểm tra sở hữu.
    Nếu user là Organizer -> Bắt buộc workshop.organizer_id == current_user.user_id.
    Ngược lại -> 403 Forbidden.
    """
    workshop = db.query(Workshop).filter(Workshop.workshop_id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop không tồn tại trên hệ thống.",
        )

    if current_user.role == "admin":
        return workshop

    if current_user.role == "organizer":
        if workshop.organizer_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền quản lý Workshop này (Chỉ chính chủ người tổ chức hoặc Admin mới có quyền).",
            )
        return workshop

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền thực hiện thao tác này.",
    )


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"
