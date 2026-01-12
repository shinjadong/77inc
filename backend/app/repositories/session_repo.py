"""
업로드 세션 Repository
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from backend.app.models.session import UploadSession, SessionStatus


class SessionRepository:
    """업로드 세션 CRUD 연산"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, limit: int = 50) -> List[UploadSession]:
        """최근 세션 목록 조회"""
        return (
            self.db.query(UploadSession)
            .order_by(UploadSession.upload_date.desc())
            .limit(limit)
            .all()
        )

    def get_by_id(self, session_id: int) -> Optional[UploadSession]:
        """ID로 세션 조회"""
        return self.db.query(UploadSession).filter(UploadSession.id == session_id).first()

    def get_by_status(self, status: str) -> List[UploadSession]:
        """상태별 세션 조회"""
        return (
            self.db.query(UploadSession)
            .filter(UploadSession.status == status)
            .order_by(UploadSession.upload_date.desc())
            .all()
        )

    def create(self, filename: str, created_by: Optional[str] = None) -> UploadSession:
        """새 세션 생성"""
        session = UploadSession(
            filename=filename,
            created_by=created_by,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def update_status(self, session_id: int, status: str) -> Optional[UploadSession]:
        """세션 상태 업데이트"""
        session = self.get_by_id(session_id)
        if not session:
            return None
        session.status = status
        self.db.commit()
        self.db.refresh(session)
        return session

    def update_counts(
        self,
        session_id: int,
        total: Optional[int] = None,
        matched: Optional[int] = None,
        pending: Optional[int] = None,
    ) -> Optional[UploadSession]:
        """세션 카운트 업데이트"""
        session = self.get_by_id(session_id)
        if not session:
            return None
        if total is not None:
            session.total_transactions = total
        if matched is not None:
            session.matched_count = matched
        if pending is not None:
            session.pending_count = pending
        self.db.commit()
        self.db.refresh(session)
        return session

    def mark_completed(self, session_id: int) -> Optional[UploadSession]:
        """세션 완료 처리"""
        return self.update_status(session_id, SessionStatus.COMPLETED.value)

    def mark_synced(self, session_id: int) -> Optional[UploadSession]:
        """세션 동기화 완료 처리"""
        return self.update_status(session_id, SessionStatus.SYNCED.value)

    def delete(self, session_id: int) -> bool:
        """세션 삭제 (관련 거래도 함께 삭제됨 - cascade)"""
        session = self.get_by_id(session_id)
        if not session:
            return False
        self.db.delete(session)
        self.db.commit()
        return True
