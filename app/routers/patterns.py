"""
패턴 관리 API
"""
from typing import Optional
from fastapi import APIRouter, Query

from app.schemas.models import (
    PatternResponse, LearnRequest, LearnResponse, PatternItem,
    PendingItem
)
from app.services.card_processor import PatternService, PendingService

router = APIRouter()


@router.get("/patterns", response_model=PatternResponse)
async def get_patterns(
    type: Optional[str] = Query(None, description="패턴 유형 (exact, card, rules)"),
    search: Optional[str] = Query(None, description="검색어")
):
    """
    패턴 DB 조회

    - type: exact (정확 매칭), card (카드별), rules (규칙)
    - search: 가맹점명 검색
    """
    service = PatternService()
    result = service.get_patterns(type, search)
    return PatternResponse(**result)


@router.post("/patterns/learn", response_model=LearnResponse)
async def learn_patterns(request: LearnRequest):
    """
    미분류 파일에서 패턴 학습

    pending_file의 '최종_사용용도' 컬럼을 읽어
    새로운 패턴으로 등록합니다.
    """
    service = PatternService()
    result = service.learn_from_file(request.pending_file)

    return LearnResponse(
        success=result["success"],
        learned_count=result["learned_count"],
        patterns_added=[
            PatternItem(**p) for p in result.get("patterns_added", [])
        ]
    )


@router.get("/pending")
async def get_pending_items(file: Optional[str] = Query(None)):
    """
    미분류 항목 조회

    - file: 특정 파일 지정 (없으면 전체)
    """
    service = PendingService()
    items = service.get_pending_items(file)
    files = service.get_pending_files()

    return {
        "success": True,
        "files": files,
        "items": items,
        "total": len(items)
    }


@router.get("/pending/files")
async def get_pending_files():
    """미분류 파일 목록"""
    service = PendingService()
    files = service.get_pending_files()
    return {"files": files}
