from sqlalchemy import Column, BigInteger, Integer, Text, Enum, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Registration(Base):
    __tablename__ = "REGISTRATIONS"
    __table_args__ = (
        UniqueConstraint("workshop_id", "user_id", name="uq_workshop_user"),
    )

    registration_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, comment="Mã lượt đăng ký duy nhất")
    workshop_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("WORKSHOPS.workshop_id", ondelete="CASCADE"), nullable=False, index=True, comment="Workshop được đăng ký")
    user_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("USERS.user_id", ondelete="CASCADE"), nullable=False, index=True, comment="Người tham gia đăng ký")
    status = Column(
        Enum("registered", "waitlist", "confirmed", "cancelled", "attended", name="registration_status_enum"),
        nullable=False,
        comment="Trạng thái đăng ký: registered, waitlist, confirmed, cancelled, attended",
    )
    waitlist_position = Column(Integer, nullable=True, comment="Vị trí trong danh sách chờ (nếu status = waitlist)")
    registered_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm gửi đăng ký")
    cancelled_at = Column(DateTime, nullable=True, comment="Thời điểm hủy đăng ký")
    cancel_reason = Column(Text, nullable=True, comment="Lý do hủy đăng ký")
    confirmed_at = Column(DateTime, nullable=True, comment="Thời điểm được xác nhận vé tham gia")

    # Relationships
    workshop = relationship("Workshop", back_populates="registrations")
    user = relationship("User", back_populates="registrations")
    attendance = relationship("Attendance", uselist=False, back_populates="registration", cascade="all, delete-orphan")
    survey = relationship("Survey", uselist=False, back_populates="registration", cascade="all, delete-orphan")
