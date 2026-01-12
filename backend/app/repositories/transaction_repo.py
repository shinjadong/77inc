"""
거래내역 Repository
"""
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_

from backend.app.models.transaction import Transaction, MatchStatus


class TransactionRepository:
    """거래내역 CRUD 연산"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, transaction_id: int) -> Optional[Transaction]:
        """ID로 거래 조회"""
        return self.db.query(Transaction).filter(Transaction.id == transaction_id).first()

    def get_by_session(
        self, session_id: int, status: Optional[str] = None
    ) -> List[Transaction]:
        """세션별 거래 조회"""
        query = self.db.query(Transaction).filter(Transaction.session_id == session_id)
        if status:
            query = query.filter(Transaction.match_status == status)
        return query.order_by(Transaction.transaction_date, Transaction.id).all()

    def get_by_card(
        self,
        card_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Transaction]:
        """카드별 거래 조회"""
        query = self.db.query(Transaction).filter(Transaction.card_id == card_id)
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
        return query.order_by(Transaction.transaction_date.desc()).all()

    def get_pending(self, session_id: Optional[int] = None) -> List[Transaction]:
        """미매칭 거래 조회"""
        query = self.db.query(Transaction).filter(
            Transaction.match_status == MatchStatus.PENDING.value
        )
        if session_id:
            query = query.filter(Transaction.session_id == session_id)
        return query.order_by(Transaction.card_id, Transaction.transaction_date).all()

    def get_unsynced(self) -> List[Transaction]:
        """시트 미동기화 거래 조회"""
        return (
            self.db.query(Transaction)
            .filter(Transaction.synced_to_sheets == False)
            .order_by(Transaction.card_id, Transaction.transaction_date)
            .all()
        )

    def create(
        self,
        session_id: int,
        card_id: int,
        transaction_date: date,
        merchant_name: str,
        amount: int,
        industry: Optional[str] = None,
    ) -> Transaction:
        """새 거래 생성"""
        transaction = Transaction(
            session_id=session_id,
            card_id=card_id,
            transaction_date=transaction_date,
            merchant_name=merchant_name,
            amount=amount,
            industry=industry,
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def bulk_create(self, transactions_data: List[dict]) -> List[Transaction]:
        """대량 거래 생성"""
        transactions = []
        for data in transactions_data:
            transaction = Transaction(**data)
            self.db.add(transaction)
            transactions.append(transaction)
        self.db.commit()
        for t in transactions:
            self.db.refresh(t)
        return transactions

    def update_match(
        self,
        transaction_id: int,
        usage_description: str,
        pattern_id: Optional[int] = None,
        match_status: str = MatchStatus.AUTO.value,
    ) -> Optional[Transaction]:
        """매칭 정보 업데이트"""
        transaction = self.get_by_id(transaction_id)
        if not transaction:
            return None
        transaction.usage_description = usage_description
        transaction.matched_pattern_id = pattern_id
        transaction.match_status = match_status
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def mark_synced(self, transaction_ids: List[int]) -> int:
        """시트 동기화 완료 표시"""
        count = (
            self.db.query(Transaction)
            .filter(Transaction.id.in_(transaction_ids))
            .update({Transaction.synced_to_sheets: True}, synchronize_session=False)
        )
        self.db.commit()
        return count

    def get_stats_by_session(self, session_id: int) -> dict:
        """세션별 통계"""
        transactions = self.get_by_session(session_id)
        total = len(transactions)
        matched = sum(1 for t in transactions if t.match_status != MatchStatus.PENDING.value)
        pending = total - matched

        return {
            "total": total,
            "matched": matched,
            "pending": pending,
            "match_rate": round(matched / total * 100, 1) if total > 0 else 0,
        }

    def exists(
        self,
        card_id: int,
        transaction_date: date,
        merchant_name: str,
        amount: int,
    ) -> bool:
        """중복 거래 확인"""
        return (
            self.db.query(Transaction)
            .filter(
                and_(
                    Transaction.card_id == card_id,
                    Transaction.transaction_date == transaction_date,
                    Transaction.merchant_name == merchant_name,
                    Transaction.amount == amount,
                )
            )
            .first()
            is not None
        )
