from sqlalchemy import Column, BigInteger, SmallInteger, Text, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Survey(Base):
    __tablename__ = "SURVEYS"

    survey_id = Column(BigInteger, primary_key=True, autoincrement=True, comment="Mã khảo sát duy nhất")
    registration_id = Column(
        BigInteger,
        ForeignKey("REGISTRATIONS.registration_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Lượt đăng ký thực hiện khảo sát",
    )
    rating = Column(SmallInteger, nullable=False, comment="Mức độ đánh giá (1-5 sao)")
    answers = Column(JSON, nullable=False, comment="Nội dung câu trả lời khảo sát dạng JSON")
    feedback = Column(Text, nullable=True, comment="Ý kiến đóng góp phản hồi")
    submitted_at = Column(DateTime, server_default=func.now(), nullable=False, comment="Thời điểm gửi khảo sát")

    # Relationships
    registration = relationship("Registration", back_populates="survey")
