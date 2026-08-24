from sqlalchemy import Column, BigInteger, Integer, String, Enum, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "USERS"

    user_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, comment="Mã định danh người dùng")
    full_name = Column(String(100), nullable=False, comment="Họ và tên người dùng")
    email = Column(String(255), unique=True, nullable=False, index=True, comment="Email đăng nhập duy nhất")
    password_hash = Column(String(255), nullable=False, comment="Mật khẩu đã mã hóa")
    role = Column(
        Enum("admin", "organizer", "participant", name="user_role_enum"),
        nullable=False,
        default="participant",
        comment="Vai trò: admin, organizer, participant",
    )
    status = Column(
        Enum("active", "inactive", "locked", name="user_status_enum"),
        nullable=False,
        default="active",
        comment="Trạng thái tài khoản: active, inactive, locked",
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm tạo tài khoản")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True, comment="Thời điểm cập nhật cuối")

    # Relationships
    organized_workshops = relationship("Workshop", back_populates="organizer", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")
