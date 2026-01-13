"""
패턴 Repository
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.pattern import Pattern, MatchType


class PatternRepository:
    """매칭 패턴 CRUD 연산"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, card_id: Optional[int] = None) -> List[Pattern]:
        """모든 패턴 조회 (카드별 필터 가능)"""
        query = self.db.query(Pattern)
        if card_id is not None:
            # 카드 전용 패턴 + 공통 패턴
            query = query.filter(
                or_(Pattern.card_id == card_id, Pattern.card_id == None)
            )
        return query.order_by(Pattern.priority.desc(), Pattern.use_count.desc()).all()

    def get_by_id(self, pattern_id: int) -> Optional[Pattern]:
        """ID로 패턴 조회"""
        return self.db.query(Pattern).filter(Pattern.id == pattern_id).first()

    def find_by_merchant(
        self, merchant_name: str, card_id: Optional[int] = None
    ) -> Optional[Pattern]:
        """가맹점명으로 패턴 찾기 (카드 전용 우선)"""
        query = self.db.query(Pattern).filter(Pattern.merchant_name == merchant_name)

        if card_id is not None:
            # 카드 전용 패턴 우선 검색
            card_pattern = query.filter(Pattern.card_id == card_id).first()
            if card_pattern:
                return card_pattern

        # 공통 패턴 검색
        return query.filter(Pattern.card_id == None).first()

    def find_matching_pattern(
        self, merchant_name: str, card_id: Optional[int] = None
    ) -> Optional[Pattern]:
        """매칭 로직 적용하여 패턴 찾기"""
        # 1. 카드 전용 정확 매칭
        if card_id:
            pattern = (
                self.db.query(Pattern)
                .filter(
                    Pattern.card_id == card_id,
                    Pattern.merchant_name == merchant_name,
                    Pattern.match_type == MatchType.EXACT.value,
                )
                .first()
            )
            if pattern:
                return pattern

        # 2. 공통 정확 매칭
        pattern = (
            self.db.query(Pattern)
            .filter(
                Pattern.card_id == None,
                Pattern.merchant_name == merchant_name,
                Pattern.match_type == MatchType.EXACT.value,
            )
            .first()
        )
        if pattern:
            return pattern

        # 3. 포함 매칭 (CONTAINS)
        contains_patterns = (
            self.db.query(Pattern)
            .filter(Pattern.match_type == MatchType.CONTAINS.value)
            .order_by(Pattern.priority.desc())
            .all()
        )
        for p in contains_patterns:
            if p.merchant_name in merchant_name:
                if p.card_id is None or p.card_id == card_id:
                    return p

        return None

    def create(
        self,
        merchant_name: str,
        usage_description: str,
        card_id: Optional[int] = None,
        match_type: str = MatchType.EXACT.value,
        priority: int = 0,
        created_by: Optional[str] = None,
    ) -> Pattern:
        """새 패턴 생성"""
        pattern = Pattern(
            merchant_name=merchant_name,
            usage_description=usage_description,
            card_id=card_id,
            match_type=match_type,
            priority=priority,
            created_by=created_by,
        )
        self.db.add(pattern)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def update(self, pattern_id: int, **kwargs) -> Optional[Pattern]:
        """패턴 수정"""
        pattern = self.get_by_id(pattern_id)
        if not pattern:
            return None
        for key, value in kwargs.items():
            if hasattr(pattern, key):
                setattr(pattern, key, value)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def increment_use_count(self, pattern_id: int) -> None:
        """사용 횟수 증가"""
        pattern = self.get_by_id(pattern_id)
        if pattern:
            pattern.use_count += 1
            self.db.commit()

    def delete(self, pattern_id: int) -> bool:
        """패턴 삭제"""
        pattern = self.get_by_id(pattern_id)
        if not pattern:
            return False
        self.db.delete(pattern)
        self.db.commit()
        return True

    def get_or_create(
        self,
        merchant_name: str,
        usage_description: str,
        card_id: Optional[int] = None,
    ) -> Pattern:
        """패턴 조회 또는 생성"""
        pattern = self.find_by_merchant(merchant_name, card_id)
        if not pattern:
            pattern = self.create(merchant_name, usage_description, card_id)
        return pattern

    def bulk_create(self, patterns_data: List[dict]) -> List[Pattern]:
        """대량 패턴 생성"""
        patterns = []
        for data in patterns_data:
            pattern = Pattern(**data)
            self.db.add(pattern)
            patterns.append(pattern)
        self.db.commit()
        for p in patterns:
            self.db.refresh(p)
        return patterns
