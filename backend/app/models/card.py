"""
카드 모델
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Card(Base):
    """법인카드 정보"""
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    card_number = Column(String(4), unique=True, nullable=False, index=True)  # 끝 4자리
    card_name = Column(String(100), nullable=False)  # 카드 별칭/명칭
    sheet_name = Column(String(100))  # Google Sheets 시트명
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 카드 소유자 (사용자)
    card_type = Column(String(50), default="personal")  # personal, shared, vehicle 등
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # 관계
    user = relationship("User", back_populates="cards")
    patterns = relationship("Pattern", back_populates="card")
    transactions = relationship("Transaction", back_populates="card")

    def __repr__(self):
        return f"<Card {self.card_number}: {self.card_name}>"
