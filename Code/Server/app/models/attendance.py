from sqlalchemy import Column, BigInteger, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Attendance(Base):
    __tablename__ = "ATTENDANCE"

    attendance_id = Column(BigInteger, primary_key=True, autoincrement=True, comment="Mã bản ghi điểm danh duy nhất")
    registration_id = Column(
        BigInteger,
        ForeignKey("REGISTRATIONS.registration_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Lượt đăng ký được điểm danh (Tối đa 1 bản ghi điểm danh)",
    )
    checkin_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm điểm danh")
    checkin_method = Column(
        Enum("qr", "manual", name="checkin_method_enum"),
        nullable=False,
        default="qr",
        comment="Phương thức điểm danh: qr, manual",
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm tạo bản ghi điểm danh")

    # Relationships
    registration = relationship("Registration", back_populates="attendance")
