"""
카드 관리 API
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.card_repo import CardRepository

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
    user_id: Optional[int] = None
    card_type: Optional[str] = None
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
                "user_id": c.user_id,
                "card_type": c.card_type or "personal",
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
        "user_id": card.user_id,
        "card_type": card.card_type or "personal",
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
            "user_id": card.user_id,
            "card_type": card.card_type or "personal",
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


@router.get("/{card_id}/transactions")
async def get_card_transactions(
    card_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,  # pending, matched, all
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """카드별 거래내역 조회"""
    from app.models.transaction import Transaction
    from sqlalchemy import extract, func

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    query = db.query(Transaction).filter(Transaction.card_id == card_id)

    # 월 필터
    if year and month:
        query = query.filter(
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month
        )

    # 상태 필터
    if status == "pending":
        query = query.filter(
            (Transaction.usage_description.is_(None)) |
            (Transaction.usage_description == "")
        )
    elif status == "matched":
        query = query.filter(
            Transaction.usage_description.isnot(None),
            Transaction.usage_description != ""
        )

    # 전체 개수
    total = query.count()

    # 페이지네이션
    transactions = query.order_by(
        Transaction.transaction_date.desc()
    ).offset(offset).limit(limit).all()

    return {
        "card_id": card_id,
        "card_number": card.card_number,
        "card_name": card.card_name,
        "total": total,
        "transactions": [
            {
                "id": t.id,
                "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
                "merchant_name": t.merchant_name,
                "amount": t.amount,
                "industry": t.industry,
                "usage_description": t.usage_description,
                "match_status": t.match_status,
            }
            for t in transactions
        ]
    }


@router.get("/{card_id}/patterns")
async def get_card_patterns(
    card_id: int,
    db: Session = Depends(get_db),
):
    """카드별 사용용도 패턴 조회"""
    from app.models.pattern import Pattern

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    # 해당 카드 전용 패턴 + 공통 패턴
    patterns = db.query(Pattern).filter(
        (Pattern.card_id == card_id) | (Pattern.card_id.is_(None))
    ).order_by(
        Pattern.card_id.desc(),  # 카드 전용 패턴 먼저
        Pattern.use_count.desc()
    ).all()

    return {
        "card_id": card_id,
        "card_number": card.card_number,
        "patterns": [
            {
                "id": p.id,
                "merchant_name": p.merchant_name,
                "usage_description": p.usage_description,
                "match_type": p.match_type,
                "is_card_specific": p.card_id == card_id,
                "use_count": p.use_count,
            }
            for p in patterns
        ]
    }


@router.post("/{card_id}/patterns")
async def create_card_pattern(
    card_id: int,
    merchant_name: str,
    usage_description: str,
    db: Session = Depends(get_db),
):
    """카드별 사용용도 패턴 추가"""
    from app.repositories.pattern_repo import PatternRepository

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    pattern_repo = PatternRepository(db)
    pattern = pattern_repo.create(
        merchant_name=merchant_name,
        usage_description=usage_description,
        card_id=card_id,
        match_type="exact",
    )

    return {
        "success": True,
        "pattern": {
            "id": pattern.id,
            "merchant_name": pattern.merchant_name,
            "usage_description": pattern.usage_description,
            "card_id": pattern.card_id,
        }
    }


@router.put("/{card_id}/transactions/{transaction_id}/match")
async def match_card_transaction(
    card_id: int,
    transaction_id: int,
    usage_description: str,
    save_pattern: bool = True,
    db: Session = Depends(get_db),
):
    """카드 거래내역 수동 매칭 (해당 카드의 패턴 DB에 저장)"""
    from app.models.transaction import Transaction
    from app.repositories.pattern_repo import PatternRepository

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    # 거래 조회
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.card_id == card_id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="거래내역을 찾을 수 없습니다")

    # 사용용도 업데이트
    transaction.usage_description = usage_description
    transaction.match_status = "manual"

    # 패턴으로 저장 (옵션)
    pattern = None
    if save_pattern:
        pattern_repo = PatternRepository(db)
        pattern = pattern_repo.get_or_create(
            merchant_name=transaction.merchant_name,
            usage_description=usage_description,
            card_id=card_id,
        )
        transaction.matched_pattern_id = pattern.id

    db.commit()

    return {
        "success": True,
        "transaction": {
            "id": transaction.id,
            "merchant_name": transaction.merchant_name,
            "usage_description": transaction.usage_description,
            "match_status": transaction.match_status,
        },
        "pattern_saved": pattern is not None,
    }


@router.post("/{card_id}/rematch")
async def rematch_card_transactions(
    card_id: int,
    db: Session = Depends(get_db),
):
    """카드 미매칭 거래 일괄 재매칭"""
    from app.services.matching import MatchingService

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    matching_service = MatchingService(db)
    stats = matching_service.batch_rematch(card_id)

    return {
        "success": True,
        "card_id": card_id,
        "card_number": card.card_number,
        "stats": stats,
    }


@router.get("/{card_id}/suggest/{merchant_name}")
async def suggest_pattern(
    card_id: int,
    merchant_name: str,
    db: Session = Depends(get_db),
):
    """가맹점명에 대한 패턴 제안"""
    from app.services.matching import MatchingService

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    matching_service = MatchingService(db)
    suggestions = matching_service.suggest_patterns(merchant_name, card_id)

    return {
        "merchant_name": merchant_name,
        "card_id": card_id,
        "suggestions": suggestions,
    }


@router.delete("/{card_id}/patterns/{pattern_id}")
async def delete_card_pattern(
    card_id: int,
    pattern_id: int,
    db: Session = Depends(get_db),
):
    """카드 패턴 삭제"""
    from app.models.pattern import Pattern

    card_repo = CardRepository(db)
    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    # 패턴 조회
    pattern = db.query(Pattern).filter(
        Pattern.id == pattern_id,
        Pattern.card_id == card_id  # 해당 카드의 패턴만 삭제 가능
    ).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="패턴을 찾을 수 없습니다")

    db.delete(pattern)
    db.commit()

    return {"success": True, "message": "패턴이 삭제되었습니다"}
