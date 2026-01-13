"""
사용자(직원) 모델
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class User(Base):
    """사용자/직원 정보"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, index=True)  # 사번
    name = Column(String(100), nullable=False)  # 이름
    department = Column(String(100))  # 부서
    position = Column(String(100))  # 직책
    phone = Column(String(20))  # 전화번호
    email = Column(String(100))  # 이메일
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # 관계 - 사용자가 소유한 카드들
    cards = relationship("Card", back_populates="user")

    def __repr__(self):
        return f"<User {self.name} ({self.employee_id})>"
