from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Xác thực & Phiên làm việc (Auth)"])


@router.post("/login", response_model=TokenResponse, summary="UC-01: Đăng nhập hệ thống")
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    """
    Use Case 01: Đăng nhập hệ thống nội bộ
    Xác thực Email và Mật khẩu, trả về Access Token JWT và thông tin vai trò.
    """
    user = db.query(User).filter(User.email == login_in.email.strip().lower()).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

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

    access_token = create_access_token(subject=user.user_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/logout", summary="UC-02: Đăng xuất")
def logout(current_user: User = Depends(get_current_user)):
    """
    Use Case 02: Đăng xuất khỏi hệ thống
    """
    return {"message": "Đăng xuất thành công."}


@router.get("/me", response_model=UserResponse, summary="Lấy thông tin tài khoản hiện tại")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin profile, vai trò và trạng thái của người dùng đang đăng nhập.
    """
    return current_user
