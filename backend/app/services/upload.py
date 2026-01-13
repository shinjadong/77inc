"""
파일 업로드 처리 서비스
"""
from typing import Tuple
from pathlib import Path
from sqlalchemy.orm import Session

from app.repositories.session_repo import SessionRepository
from app.services.excel_parser import ExcelParserService
from app.services.transaction import TransactionService
from app.models.session import UploadSession, SessionStatus


class UploadService:
    """파일 업로드 처리 서비스"""

    def __init__(self, db: Session):
        self.db = db
        self.session_repo = SessionRepository(db)
        self.parser = ExcelParserService()
        self.transaction_service = TransactionService(db)

    def process_upload(
        self,
        file_bytes: bytes,
        filename: str,
        created_by: str = None,
    ) -> Tuple[UploadSession, dict]:
        """
        업로드 파일 처리

        Args:
            file_bytes: 파일 바이트
            filename: 원본 파일명
            created_by: 업로드 사용자

        Returns:
            (UploadSession, 처리 통계)
        """
        # 1. 세션 생성
        session = self.session_repo.create(
            filename=filename,
            created_by=created_by,
        )

        try:
            # 2. 상태 업데이트: 처리 중
            self.session_repo.update_status(session.id, SessionStatus.PROCESSING.value)

            # 3. Excel 파싱
            parsed_transactions = self.parser.parse_bytes(file_bytes, filename)

            # 4. 거래 데이터 변환
            transactions_data = [
                {
                    "card_number": tx.card_number,
                    "transaction_date": tx.transaction_date,
                    "merchant_name": tx.merchant_name,
                    "amount": tx.amount,
                    "industry": tx.industry,
                }
                for tx in parsed_transactions
            ]

            # 5. 거래 생성 및 자동 매칭
            stats = self.transaction_service.bulk_create_transactions(
                session_id=session.id,
                transactions_data=transactions_data,
                auto_match=True,
            )

            # 6. 세션 카운트 업데이트
            self.session_repo.update_counts(
                session.id,
                total=stats["created"],
                matched=stats["matched"],
                pending=stats["created"] - stats["matched"],
            )

            # 7. 상태 업데이트: 완료
            self.session_repo.update_status(session.id, SessionStatus.COMPLETED.value)

            self.db.refresh(session)
            return session, stats

        except Exception as e:
            # 오류 발생 시 세션 상태 유지 (PENDING)
            self.session_repo.update_status(session.id, SessionStatus.PENDING.value)
            raise e

    def get_session_detail(self, session_id: int) -> dict:
        """
        세션 상세 정보 조회

        Returns:
            세션 정보 + 거래 요약
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("세션을 찾을 수 없습니다")

        summary = self.transaction_service.get_session_summary(session_id)

        return {
            "session": {
                "id": session.id,
                "filename": session.filename,
                "upload_date": session.upload_date.isoformat() if session.upload_date else None,
                "status": session.status,
                "created_by": session.created_by,
            },
            "summary": summary,
        }

    def get_recent_sessions(self, limit: int = 10) -> list:
        """최근 업로드 세션 목록"""
        sessions = self.session_repo.get_all(limit=limit)
        return [
            {
                "id": s.id,
                "filename": s.filename,
                "upload_date": s.upload_date.isoformat() if s.upload_date else None,
                "total_transactions": s.total_transactions,
                "matched_count": s.matched_count,
                "pending_count": s.pending_count,
                "status": s.status,
            }
            for s in sessions
        ]
