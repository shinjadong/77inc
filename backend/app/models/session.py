"""
업로드 세션 모델
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from backend.app.database import Base


class SessionStatus(str, enum.Enum):
    """세션 상태"""
    PENDING = "pending"        # 업로드됨, 미처리
    PROCESSING = "processing"  # 처리 중
    COMPLETED = "completed"    # 완료
    SYNCED = "synced"          # 시트 동기화됨


class UploadSession(Base):
    """파일 업로드 세션"""
    __tablename__ = "upload_sessions"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    total_transactions = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    status = Column(String(20), default=SessionStatus.PENDING.value)
    created_by = Column(String(100))

    # 관계
    transactions = relationship("Transaction", back_populates="session")

    def __repr__(self):
        return f"<UploadSession {self.id}: {self.filename}>"
