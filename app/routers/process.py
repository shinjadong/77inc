"""
처리 API (미리보기/실행)
"""
from fastapi import APIRouter, HTTPException

from app.schemas.models import (
    ProcessRequest, ProcessResponse, PreviewResponse,
    TransactionItem, ProcessStats, CardStats
)
from app.services.card_processor import CardProcessorService
from app.routers.upload import get_upload_session

router = APIRouter()


@router.post("/process/preview", response_model=PreviewResponse)
async def preview_process(request: ProcessRequest):
    """
    처리 미리보기 (Dry-run)

    업로드된 파일의 분류 결과를 미리 확인합니다.
    실제 Excel 파일은 수정되지 않습니다.
    """
    # 세션에서 거래 가져오기
    session = get_upload_session(request.upload_id)
    transactions = session.get("transactions", [])

    if not transactions:
        raise HTTPException(status_code=400, detail="처리할 거래가 없습니다")

    # 미리보기 실행
    processor = CardProcessorService()
    result = processor.preview(transactions)

    # 응답 변환
    tx_items = [
        TransactionItem(
            date=tx["date"],
            merchant=tx["merchant"],
            amount=tx["amount"],
            card=tx["card"],
            industry=tx["industry"],
            matched_usage=tx["matched_usage"],
            match_type=tx["match_type"],
            confidence=tx["confidence"]
        )
        for tx in result["transactions"]
    ]

    stats = ProcessStats(
        total=result["stats"]["total"],
        processed=result["stats"]["processed"],
        duplicates=result["stats"]["duplicates"],
        manual=result["stats"]["manual"],
        by_type=result["stats"]["by_type"],
        by_card={
            k: CardStats(**v) for k, v in result["stats"]["by_card"].items()
        }
    )

    return PreviewResponse(
        success=True,
        transactions=tx_items,
        stats=stats
    )


@router.post("/process/execute", response_model=ProcessResponse)
async def execute_process(request: ProcessRequest):
    """
    실제 처리 실행

    분류된 거래를 Excel 파일에 저장합니다.
    sync_sheets=true 시 구글 시트도 동기화됩니다.
    """
    # 세션에서 거래 가져오기
    session = get_upload_session(request.upload_id)
    transactions = session.get("transactions", [])

    if not transactions:
        raise HTTPException(status_code=400, detail="처리할 거래가 없습니다")

    # 실행
    processor = CardProcessorService()
    result = await processor.execute(transactions, request.sync_sheets)

    return ProcessResponse(**result)
