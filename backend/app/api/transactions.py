"""
거래 내역 API
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.transaction import TransactionService
from backend.app.repositories.transaction_repo import TransactionRepository
from backend.app.models.transaction import MatchStatus

router = APIRouter()


class ManualMatchRequest(BaseModel):
    """수동 매칭 요청"""
    usage_description: str
    save_pattern: bool = True


class BulkMatchRequest(BaseModel):
    """대량 수동 매칭 요청"""
    matches: list  # [{transaction_id, usage_description}, ...]
    save_patterns: bool = True


@router.get("")
async def list_transactions(
    session_id: Optional[int] = None,
    card_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    거래 내역 조회

    - session_id: 특정 세션의 거래만 조회
    - card_id: 특정 카드의 거래만 조회
    - status: pending, auto, manual 필터
    """
    tx_repo = TransactionRepository(db)

    if session_id:
        transactions = tx_repo.get_by_session(session_id, status)
    elif card_id:
        transactions = tx_repo.get_by_card(card_id)
        if status:
            transactions = [t for t in transactions if t.match_status == status]
    else:
        if status == MatchStatus.PENDING.value:
            transactions = tx_repo.get_pending()
        else:
            # 최근 거래 100건
            transactions = tx_repo.get_pending()[:100] if not status else []

    return {
        "transactions": [
            {
                "id": t.id,
                "session_id": t.session_id,
                "card_id": t.card_id,
                "card_number": t.card.card_number,
                "card_name": t.card.card_name,
                "transaction_date": t.transaction_date.isoformat(),
                "merchant_name": t.merchant_name,
                "amount": t.amount,
                "industry": t.industry,
                "usage_description": t.usage_description,
                "match_status": t.match_status,
            }
            for t in transactions
        ],
        "total": len(transactions),
    }


@router.get("/pending")
async def get_pending_transactions(
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """미매칭 거래 조회 (카드별 그룹화)"""
    tx_service = TransactionService(db)

    if session_id:
        by_card = tx_service.get_pending_by_card(session_id)
    else:
        # 전체 미매칭
        tx_repo = TransactionRepository(db)
        pending = tx_repo.get_pending()
        by_card = {}
        for tx in pending:
            card_number = tx.card.card_number
            if card_number not in by_card:
                by_card[card_number] = []
            by_card[card_number].append(tx)

    result = {}
    for card_number, transactions in by_card.items():
        result[card_number] = [
            {
                "id": t.id,
                "transaction_date": t.transaction_date.isoformat(),
                "merchant_name": t.merchant_name,
                "amount": t.amount,
                "industry": t.industry,
            }
            for t in transactions
        ]

    return {"by_card": result}


@router.put("/{transaction_id}/match")
async def update_match(
    transaction_id: int,
    request: ManualMatchRequest,
    db: Session = Depends(get_db),
):
    """수동 매칭 업데이트"""
    try:
        tx_service = TransactionService(db)
        transaction = tx_service.update_manual_match(
            transaction_id=transaction_id,
            usage_description=request.usage_description,
            save_pattern=request.save_pattern,
        )

        return {
            "success": True,
            "transaction": {
                "id": transaction.id,
                "merchant_name": transaction.merchant_name,
                "usage_description": transaction.usage_description,
                "match_status": transaction.match_status,
            },
            "pattern_saved": request.save_pattern,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/bulk-match")
async def bulk_match(
    request: BulkMatchRequest,
    db: Session = Depends(get_db),
):
    """대량 수동 매칭"""
    tx_service = TransactionService(db)
    results = {"success": 0, "failed": 0, "errors": []}

    for match in request.matches:
        try:
            tx_service.update_manual_match(
                transaction_id=match["transaction_id"],
                usage_description=match["usage_description"],
                save_pattern=request.save_patterns,
            )
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "transaction_id": match["transaction_id"],
                "error": str(e),
            })

    return results
