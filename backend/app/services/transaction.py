"""
거래 처리 서비스
"""
from typing import List, Optional, Dict
from datetime import date
from sqlalchemy.orm import Session

from backend.app.repositories.transaction_repo import TransactionRepository
from backend.app.repositories.card_repo import CardRepository
from backend.app.services.matching import MatchingService
from backend.app.models.transaction import Transaction, MatchStatus


class TransactionService:
    """거래 처리 서비스"""

    def __init__(self, db: Session):
        self.db = db
        self.transaction_repo = TransactionRepository(db)
        self.card_repo = CardRepository(db)
        self.matching_service = MatchingService(db)

    def create_transaction(
        self,
        session_id: int,
        card_number: str,
        transaction_date: date,
        merchant_name: str,
        amount: int,
        industry: Optional[str] = None,
        auto_match: bool = True,
    ) -> Transaction:
        """
        새 거래 생성

        Args:
            session_id: 업로드 세션 ID
            card_number: 카드번호 (끝 4자리)
            transaction_date: 거래일
            merchant_name: 가맹점명
            amount: 금액
            industry: 업종
            auto_match: 자동 매칭 시도 여부

        Returns:
            생성된 Transaction
        """
        # 카드 조회
        card = self.card_repo.get_by_number(card_number)
        if not card:
            raise ValueError(f"등록되지 않은 카드: {card_number}")

        # 중복 확인
        if self.transaction_repo.exists(card.id, transaction_date, merchant_name, amount):
            raise ValueError("중복된 거래입니다")

        # 거래 생성
        transaction = self.transaction_repo.create(
            session_id=session_id,
            card_id=card.id,
            transaction_date=transaction_date,
            merchant_name=merchant_name,
            amount=amount,
            industry=industry,
        )

        # 자동 매칭 시도
        if auto_match:
            usage, pattern_id = self.matching_service.find_match(
                merchant_name, card.id
            )
            if usage:
                self.transaction_repo.update_match(
                    transaction.id,
                    usage_description=usage,
                    pattern_id=pattern_id,
                    match_status=MatchStatus.AUTO.value,
                )
                self.db.refresh(transaction)

        return transaction

    def bulk_create_transactions(
        self,
        session_id: int,
        transactions_data: List[dict],
        auto_match: bool = True,
    ) -> Dict[str, int]:
        """
        대량 거래 생성

        Args:
            session_id: 업로드 세션 ID
            transactions_data: 거래 데이터 리스트
            auto_match: 자동 매칭 시도 여부

        Returns:
            결과 통계 {created, duplicates, errors, matched}
        """
        stats = {
            "created": 0,
            "duplicates": 0,
            "errors": 0,
            "matched": 0,
        }

        for data in transactions_data:
            try:
                tx = self.create_transaction(
                    session_id=session_id,
                    card_number=data["card_number"],
                    transaction_date=data["transaction_date"],
                    merchant_name=data["merchant_name"],
                    amount=data["amount"],
                    industry=data.get("industry"),
                    auto_match=auto_match,
                )
                stats["created"] += 1
                if tx.match_status != MatchStatus.PENDING.value:
                    stats["matched"] += 1

            except ValueError as e:
                if "중복" in str(e):
                    stats["duplicates"] += 1
                else:
                    stats["errors"] += 1
            except Exception as e:
                print(f"거래 생성 오류: {e}")
                stats["errors"] += 1

        return stats

    def update_manual_match(
        self,
        transaction_id: int,
        usage_description: str,
        save_pattern: bool = True,
    ) -> Transaction:
        """
        수동 매칭 업데이트

        Args:
            transaction_id: 거래 ID
            usage_description: 사용내역
            save_pattern: 새 패턴으로 저장할지 여부

        Returns:
            업데이트된 Transaction
        """
        transaction = self.transaction_repo.get_by_id(transaction_id)
        if not transaction:
            raise ValueError("거래를 찾을 수 없습니다")

        # 매칭 업데이트
        self.transaction_repo.update_match(
            transaction_id,
            usage_description=usage_description,
            pattern_id=None,
            match_status=MatchStatus.MANUAL.value,
        )

        # 패턴으로 저장
        if save_pattern:
            self.matching_service.create_pattern_from_manual(
                merchant_name=transaction.merchant_name,
                usage_description=usage_description,
                card_id=None,  # 공통 패턴으로 저장
                created_by="manual",
            )

        self.db.refresh(transaction)
        return transaction

    def get_pending_by_card(self, session_id: int) -> Dict[str, List[Transaction]]:
        """
        카드별 미매칭 거래 조회

        Returns:
            {card_number: [transactions...]}
        """
        pending = self.transaction_repo.get_by_session(
            session_id, status=MatchStatus.PENDING.value
        )

        result = {}
        for tx in pending:
            card_number = tx.card.card_number
            if card_number not in result:
                result[card_number] = []
            result[card_number].append(tx)

        return result

    def get_session_summary(self, session_id: int) -> dict:
        """세션별 거래 요약"""
        stats = self.transaction_repo.get_stats_by_session(session_id)
        transactions = self.transaction_repo.get_by_session(session_id)

        # 카드별 분류
        by_card = {}
        for tx in transactions:
            card_number = tx.card.card_number
            if card_number not in by_card:
                by_card[card_number] = {
                    "card_name": tx.card.card_name,
                    "total": 0,
                    "matched": 0,
                    "pending": 0,
                    "amount_total": 0,
                }
            by_card[card_number]["total"] += 1
            by_card[card_number]["amount_total"] += tx.amount
            if tx.match_status == MatchStatus.PENDING.value:
                by_card[card_number]["pending"] += 1
            else:
                by_card[card_number]["matched"] += 1

        return {
            **stats,
            "by_card": by_card,
        }
