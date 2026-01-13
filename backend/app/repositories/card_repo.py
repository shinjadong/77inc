"""
카드 Repository
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.card import Card


class CardRepository:
    """카드 CRUD 연산"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, active_only: bool = True) -> List[Card]:
        """모든 카드 조회"""
        query = self.db.query(Card)
        if active_only:
            query = query.filter(Card.is_active == True)
        return query.order_by(Card.card_name).all()

    def get_by_id(self, card_id: int) -> Optional[Card]:
        """ID로 카드 조회"""
        return self.db.query(Card).filter(Card.id == card_id).first()

    def get_by_number(self, card_number: str) -> Optional[Card]:
        """카드번호(끝 4자리)로 조회"""
        return self.db.query(Card).filter(Card.card_number == card_number).first()

    def create(self, card_number: str, card_name: str, sheet_name: Optional[str] = None) -> Card:
        """새 카드 생성"""
        card = Card(
            card_number=card_number,
            card_name=card_name,
            sheet_name=sheet_name,
        )
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def update(self, card_id: int, **kwargs) -> Optional[Card]:
        """카드 정보 수정"""
        card = self.get_by_id(card_id)
        if not card:
            return None
        for key, value in kwargs.items():
            if hasattr(card, key):
                setattr(card, key, value)
        self.db.commit()
        self.db.refresh(card)
        return card

    def deactivate(self, card_id: int) -> bool:
        """카드 비활성화"""
        card = self.get_by_id(card_id)
        if not card:
            return False
        card.is_active = False
        self.db.commit()
        return True

    def get_or_create(self, card_number: str, card_name: str) -> Card:
        """카드 조회 또는 생성"""
        card = self.get_by_number(card_number)
        if not card:
            card = self.create(card_number, card_name)
        return card
