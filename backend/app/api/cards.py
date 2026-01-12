"""
카드 관리 API
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.repositories.card_repo import CardRepository

router = APIRouter()


class CardCreate(BaseModel):
    """카드 생성 요청"""
    card_number: str
    card_name: str
    sheet_name: Optional[str] = None


class CardUpdate(BaseModel):
    """카드 수정 요청"""
    card_name: Optional[str] = None
    sheet_name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_cards(
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """카드 목록 조회"""
    card_repo = CardRepository(db)
    cards = card_repo.get_all(active_only=active_only)

    return {
        "cards": [
            {
                "id": c.id,
                "card_number": c.card_number,
                "card_name": c.card_name,
                "sheet_name": c.sheet_name,
                "is_active": c.is_active,
            }
            for c in cards
        ]
    }


@router.get("/{card_id}")
async def get_card(
    card_id: int,
    db: Session = Depends(get_db),
):
    """카드 상세 조회"""
    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)

    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    return {
        "id": card.id,
        "card_number": card.card_number,
        "card_name": card.card_name,
        "sheet_name": card.sheet_name,
        "is_active": card.is_active,
        "transaction_count": len(card.transactions),
        "pattern_count": len(card.patterns),
    }


@router.post("")
async def create_card(
    request: CardCreate,
    db: Session = Depends(get_db),
):
    """새 카드 등록"""
    card_repo = CardRepository(db)

    # 중복 확인
    existing = card_repo.get_by_number(request.card_number)
    if existing:
        raise HTTPException(status_code=400, detail="이미 등록된 카드번호입니다")

    card = card_repo.create(
        card_number=request.card_number,
        card_name=request.card_name,
        sheet_name=request.sheet_name,
    )

    return {
        "success": True,
        "card": {
            "id": card.id,
            "card_number": card.card_number,
            "card_name": card.card_name,
        },
    }


@router.put("/{card_id}")
async def update_card(
    card_id: int,
    request: CardUpdate,
    db: Session = Depends(get_db),
):
    """카드 정보 수정"""
    card_repo = CardRepository(db)

    update_data = request.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다")

    card = card_repo.update(card_id, **update_data)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    return {
        "success": True,
        "card": {
            "id": card.id,
            "card_number": card.card_number,
            "card_name": card.card_name,
            "sheet_name": card.sheet_name,
            "is_active": card.is_active,
        },
    }


@router.delete("/{card_id}")
async def deactivate_card(
    card_id: int,
    db: Session = Depends(get_db),
):
    """카드 비활성화"""
    card_repo = CardRepository(db)
    success = card_repo.deactivate(card_id)

    if not success:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    return {"success": True, "message": "카드가 비활성화되었습니다"}
