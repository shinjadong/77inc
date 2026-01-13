"""
패턴 관리 API
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.pattern_repo import PatternRepository
from app.services.matching import MatchingService
from app.models.pattern import MatchType

router = APIRouter()


class PatternCreate(BaseModel):
    """패턴 생성 요청"""
    merchant_name: str
    usage_description: str
    card_id: Optional[int] = None
    match_type: str = "exact"
    priority: int = 0


class PatternUpdate(BaseModel):
    """패턴 수정 요청"""
    usage_description: Optional[str] = None
    match_type: Optional[str] = None
    priority: Optional[int] = None


@router.get("")
async def list_patterns(
    card_id: Optional[int] = None,
    match_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    패턴 목록 조회

    - card_id: 특정 카드의 패턴만 조회 (공통 패턴 포함)
    - match_type: exact, contains, regex 필터
    """
    pattern_repo = PatternRepository(db)
    patterns = pattern_repo.get_all(card_id=card_id)

    if match_type:
        patterns = [p for p in patterns if p.match_type == match_type]

    return {
        "patterns": [
            {
                "id": p.id,
                "merchant_name": p.merchant_name,
                "usage_description": p.usage_description,
                "card_id": p.card_id,
                "match_type": p.match_type,
                "priority": p.priority,
                "use_count": p.use_count,
            }
            for p in patterns
        ],
        "total": len(patterns),
    }


@router.get("/stats")
async def get_pattern_stats(
    db: Session = Depends(get_db),
):
    """패턴 통계 조회"""
    matching_service = MatchingService(db)
    return matching_service.get_match_stats()


@router.get("/{pattern_id}")
async def get_pattern(
    pattern_id: int,
    db: Session = Depends(get_db),
):
    """패턴 상세 조회"""
    pattern_repo = PatternRepository(db)
    pattern = pattern_repo.get_by_id(pattern_id)

    if not pattern:
        raise HTTPException(status_code=404, detail="패턴을 찾을 수 없습니다")

    return {
        "id": pattern.id,
        "merchant_name": pattern.merchant_name,
        "usage_description": pattern.usage_description,
        "card_id": pattern.card_id,
        "match_type": pattern.match_type,
        "priority": pattern.priority,
        "use_count": pattern.use_count,
        "created_by": pattern.created_by,
        "created_at": pattern.created_at.isoformat() if pattern.created_at else None,
    }


@router.post("")
async def create_pattern(
    request: PatternCreate,
    db: Session = Depends(get_db),
):
    """새 패턴 등록"""
    pattern_repo = PatternRepository(db)

    # match_type 유효성 검사
    valid_types = [MatchType.EXACT.value, MatchType.CONTAINS.value, MatchType.REGEX.value]
    if request.match_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 match_type입니다. 가능한 값: {valid_types}"
        )

    # 중복 확인
    existing = pattern_repo.find_by_merchant(request.merchant_name, request.card_id)
    if existing:
        raise HTTPException(status_code=400, detail="이미 등록된 패턴입니다")

    pattern = pattern_repo.create(
        merchant_name=request.merchant_name,
        usage_description=request.usage_description,
        card_id=request.card_id,
        match_type=request.match_type,
        priority=request.priority,
    )

    return {
        "success": True,
        "pattern": {
            "id": pattern.id,
            "merchant_name": pattern.merchant_name,
            "usage_description": pattern.usage_description,
        },
    }


@router.put("/{pattern_id}")
async def update_pattern(
    pattern_id: int,
    request: PatternUpdate,
    db: Session = Depends(get_db),
):
    """패턴 수정"""
    pattern_repo = PatternRepository(db)

    update_data = request.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다")

    # match_type 유효성 검사
    if "match_type" in update_data:
        valid_types = [MatchType.EXACT.value, MatchType.CONTAINS.value, MatchType.REGEX.value]
        if update_data["match_type"] not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 match_type입니다. 가능한 값: {valid_types}"
            )

    pattern = pattern_repo.update(pattern_id, **update_data)
    if not pattern:
        raise HTTPException(status_code=404, detail="패턴을 찾을 수 없습니다")

    return {
        "success": True,
        "pattern": {
            "id": pattern.id,
            "merchant_name": pattern.merchant_name,
            "usage_description": pattern.usage_description,
            "match_type": pattern.match_type,
            "priority": pattern.priority,
        },
    }


@router.delete("/{pattern_id}")
async def delete_pattern(
    pattern_id: int,
    db: Session = Depends(get_db),
):
    """패턴 삭제"""
    pattern_repo = PatternRepository(db)
    success = pattern_repo.delete(pattern_id)

    if not success:
        raise HTTPException(status_code=404, detail="패턴을 찾을 수 없습니다")

    return {"success": True, "message": "패턴이 삭제되었습니다"}


@router.post("/test-match")
async def test_match(
    merchant_name: str,
    card_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """패턴 매칭 테스트"""
    matching_service = MatchingService(db)
    usage, pattern_id = matching_service.find_match(merchant_name, card_id)

    if usage:
        pattern_repo = PatternRepository(db)
        pattern = pattern_repo.get_by_id(pattern_id)
        return {
            "matched": True,
            "usage_description": usage,
            "pattern": {
                "id": pattern.id,
                "merchant_name": pattern.merchant_name,
                "match_type": pattern.match_type,
            },
        }
    else:
        return {
            "matched": False,
            "usage_description": None,
            "pattern": None,
        }
