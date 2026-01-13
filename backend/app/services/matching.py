"""
매칭 서비스
가맹점명 → 사용내역 자동 매칭
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.repositories.pattern_repo import PatternRepository
from app.models.pattern import Pattern, MatchType


class MatchingService:
    """패턴 매칭 서비스"""

    def __init__(self, db: Session):
        self.db = db
        self.pattern_repo = PatternRepository(db)

    def find_match(
        self,
        merchant_name: str,
        card_id: Optional[int] = None,
    ) -> Tuple[Optional[str], Optional[int]]:
        """
        가맹점명으로 사용내역 찾기

        3단계 매칭 로직:
        1. 카드 전용 정확 매칭
        2. 공통 정확 매칭
        3. 포함(CONTAINS) 매칭

        Args:
            merchant_name: 가맹점명
            card_id: 카드 ID (카드 전용 패턴 우선 검색용)

        Returns:
            (사용내역, 패턴ID) 튜플. 매칭 없으면 (None, None)
        """
        pattern = self.pattern_repo.find_matching_pattern(merchant_name, card_id)

        if pattern:
            # 사용 횟수 증가
            self.pattern_repo.increment_use_count(pattern.id)
            return pattern.usage_description, pattern.id

        return None, None

    def create_pattern_from_manual(
        self,
        merchant_name: str,
        usage_description: str,
        card_id: Optional[int] = None,
        created_by: Optional[str] = None,
    ) -> Pattern:
        """
        수동 입력에서 새 패턴 생성

        Args:
            merchant_name: 가맹점명
            usage_description: 사용내역
            card_id: 카드 ID (None이면 공통 패턴)
            created_by: 생성자

        Returns:
            생성된 Pattern
        """
        return self.pattern_repo.create(
            merchant_name=merchant_name,
            usage_description=usage_description,
            card_id=card_id,
            match_type=MatchType.EXACT.value,
            priority=0 if card_id is None else 10,  # 카드 전용은 우선순위 높음
            created_by=created_by,
        )

    def get_match_stats(self) -> dict:
        """매칭 통계 조회"""
        all_patterns = self.pattern_repo.get_all()

        total = len(all_patterns)
        by_type = {}
        by_card = {}

        for p in all_patterns:
            # 타입별 분류
            match_type = p.match_type
            by_type[match_type] = by_type.get(match_type, 0) + 1

            # 카드별 분류
            card_key = "common" if p.card_id is None else f"card_{p.card_id}"
            by_card[card_key] = by_card.get(card_key, 0) + 1

        return {
            "total_patterns": total,
            "by_type": by_type,
            "by_card": by_card,
        }

    def batch_rematch(self, card_id: Optional[int] = None) -> dict:
        """
        미매칭 거래에 대해 재매칭 시도

        Args:
            card_id: 특정 카드만 재매칭 (None이면 전체)

        Returns:
            재매칭 통계
        """
        from app.models.transaction import Transaction, MatchStatus

        query = self.db.query(Transaction).filter(
            (Transaction.usage_description.is_(None)) |
            (Transaction.usage_description == "")
        )

        if card_id:
            query = query.filter(Transaction.card_id == card_id)

        pending = query.all()
        stats = {"total": len(pending), "matched": 0, "failed": 0}

        for tx in pending:
            usage, pattern_id = self.find_match(tx.merchant_name, tx.card_id)
            if usage:
                tx.usage_description = usage
                tx.matched_pattern_id = pattern_id
                tx.match_status = MatchStatus.AUTO.value
                stats["matched"] += 1
            else:
                stats["failed"] += 1

        self.db.commit()
        return stats

    def get_card_patterns(self, card_id: int) -> list:
        """카드별 패턴 목록 (공통 포함)"""
        from app.models.pattern import Pattern

        patterns = self.db.query(Pattern).filter(
            (Pattern.card_id == card_id) | (Pattern.card_id.is_(None))
        ).order_by(
            Pattern.card_id.desc(),  # 카드 전용 먼저
            Pattern.use_count.desc()
        ).all()

        return patterns

    def suggest_patterns(self, merchant_name: str, card_id: Optional[int] = None) -> list:
        """
        가맹점명으로 유사 패턴 제안

        Args:
            merchant_name: 가맹점명
            card_id: 카드 ID

        Returns:
            유사 패턴 목록
        """
        from app.models.pattern import Pattern

        # 가맹점명 일부가 포함된 패턴 검색
        query = self.db.query(Pattern)
        if card_id:
            query = query.filter(
                (Pattern.card_id == card_id) | (Pattern.card_id.is_(None))
            )

        all_patterns = query.all()
        suggestions = []

        for p in all_patterns:
            # 부분 매칭 점수 계산
            score = 0
            if p.merchant_name == merchant_name:
                score = 100
            elif p.merchant_name in merchant_name:
                score = 80
            elif merchant_name in p.merchant_name:
                score = 60
            elif any(word in merchant_name for word in p.merchant_name.split()):
                score = 40

            if score > 0:
                suggestions.append({
                    "pattern_id": p.id,
                    "merchant_name": p.merchant_name,
                    "usage_description": p.usage_description,
                    "score": score,
                    "is_card_specific": p.card_id == card_id,
                })

        # 점수순 정렬
        suggestions.sort(key=lambda x: (-x["score"], -x.get("is_card_specific", False)))
        return suggestions[:5]  # 상위 5개
