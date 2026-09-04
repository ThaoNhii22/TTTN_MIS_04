from sqlalchemy import Column, BigInteger, String, Integer, Text, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Workshop(Base):
    __tablename__ = "WORKSHOPS"

    workshop_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, comment="Mã Workshop duy nhất")
    organizer_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("USERS.user_id", ondelete="CASCADE"), nullable=False, index=True, comment="Người tổ chức Workshop")
    title = Column(String(200), nullable=False, comment="Tên Workshop")
    description = Column(Text, nullable=True, comment="Mô tả chi tiết Workshop")
    location = Column(String(255), nullable=True, comment="Địa điểm tổ chức")
    start_at = Column(DateTime, nullable=False, comment="Thời gian bắt đầu sự kiện")
    end_at = Column(DateTime, nullable=False, comment="Thời gian kết thúc sự kiện")
    registration_open_at = Column(DateTime, nullable=True, comment="Thời điểm mở đăng ký (gán tự động khi chuyển sang published)")
    registration_close_at = Column(DateTime, nullable=True, comment="Thời điểm đóng đăng ký (BR-15, tùy chọn)")
    quota = Column(Integer, nullable=False, comment="Số lượng người tham gia tối đa")
    checkin_code = Column(String(255), unique=True, nullable=True, index=True, comment="Mã dùng để điểm danh Workshop")
    checkin_start_at = Column(DateTime, nullable=False, comment="Thời điểm bắt đầu cho phép check-in")
    checkin_end_at = Column(DateTime, nullable=False, comment="Thời điểm kết thúc check-in")
    status = Column(
        Enum("draft", "pending", "published", "cancelled", "completed", name="workshop_status_enum"),
        nullable=False,
        default="draft",
        comment="Trạng thái Workshop: draft, pending, published, cancelled, completed",
    )
    cancel_reason = Column(Text, nullable=True, comment="Lý do hủy Workshop")
    rejection_reason = Column(Text, nullable=True, comment="Lý do từ chối phê duyệt từ Quản trị viên (BR-06)")
    created_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm tạo Workshop")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True, comment="Thời điểm cập nhật cuối")

    # Relationships
    organizer = relationship("User", back_populates="organized_workshops")
    registrations = relationship("Registration", back_populates="workshop", cascade="all, delete-orphan")
