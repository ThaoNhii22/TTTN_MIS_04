from sqlalchemy import Column, BigInteger, Integer, String, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "AUDIT_LOGS"

    audit_log_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, comment="Mã nhật ký vết duy nhất")
    actor_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("USERS.user_id", ondelete="RESTRICT"), nullable=False, index=True, comment="Người thực hiện hành động")
    action = Column(String(80), nullable=False, index=True, comment="Hành động được thực hiện (APPROVE_WORKSHOP, CANCEL_BY_ORGANIZER, FORCE_CANCEL_BY_ADMIN, UPDATE_ROLE, ...)")
    target_entity = Column(String(80), nullable=False, index=True, comment="Đối tượng/Entity bị tác động (Workshops, Users, Registrations, ...)")
    target_id = Column(BigInteger().with_variant(Integer, "sqlite"), nullable=True, comment="ID của bản ghi bị tác động")
    old_value = Column(JSON, nullable=True, comment="Dữ liệu trước khi thay đổi")
    new_value = Column(JSON, nullable=True, comment="Dữ liệu sau khi thay đổi")
    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True, comment="Thời điểm ghi log vết")
    ip_address = Column(String(45), nullable=True, comment="Địa chỉ IP của client")

    # Relationships
    actor = relationship("User", back_populates="audit_logs")
