"""
거래 내역 모델
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class MatchStatus(str, enum.Enum):
    """매칭 상태"""
    PENDING = "pending"    # 대기 (미매칭)
    AUTO = "auto"          # 자동 매칭
    MANUAL = "manual"      # 수동 입력


class Transaction(Base):
    """거래 내역"""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("upload_sessions.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    transaction_date = Column(Date, nullable=False)
    merchant_name = Column(String(200), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    industry = Column(String(100))  # 업종
    usage_description = Column(String(200))  # 매칭된 사용내역
    match_status = Column(String(20), default=MatchStatus.PENDING.value, index=True)
    matched_pattern_id = Column(Integer, ForeignKey("patterns.id"), nullable=True)
    synced_to_sheets = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # 관계
    session = relationship("UploadSession", back_populates="transactions")
    card = relationship("Card", back_populates="transactions")
    matched_pattern = relationship("Pattern", back_populates="matched_transactions")

    def __repr__(self):
        return f"<Transaction {self.transaction_date} {self.merchant_name} {self.amount}>"
