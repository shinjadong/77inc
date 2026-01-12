"""
패턴 모델 (매칭 규칙)
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from backend.app.database import Base


class MatchType(str, enum.Enum):
    """매칭 타입"""
    EXACT = "exact"        # 정확 매칭
    CONTAINS = "contains"  # 포함 매칭
    REGEX = "regex"        # 정규식 매칭


class Pattern(Base):
    """매칭 패턴 (가맹점명 → 사용내역)"""
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, index=True)
    merchant_name = Column(String(200), nullable=False, index=True)  # 가맹점명
    usage_description = Column(String(200), nullable=False)  # 사용내역
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)  # NULL이면 공통 패턴
    match_type = Column(String(20), default=MatchType.EXACT.value)
    priority = Column(Integer, default=0)  # 높을수록 우선
    use_count = Column(Integer, default=0)  # 사용 횟수
    created_by = Column(String(100))  # 생성자
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # 관계
    card = relationship("Card", back_populates="patterns")
    matched_transactions = relationship("Transaction", back_populates="matched_pattern")

    def __repr__(self):
        return f"<Pattern {self.merchant_name} -> {self.usage_description}>"
