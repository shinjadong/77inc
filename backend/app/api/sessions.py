"""
업로드 세션 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.upload import UploadService
from backend.app.repositories.session_repo import SessionRepository

router = APIRouter()


@router.get("")
async def list_sessions(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """최근 업로드 세션 목록 조회"""
    upload_service = UploadService(db)
    sessions = upload_service.get_recent_sessions(limit=limit)
    return {"sessions": sessions}


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """세션 상세 정보 조회"""
    try:
        upload_service = UploadService(db)
        detail = upload_service.get_session_detail(session_id)
        return detail
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """세션 삭제 (관련 거래도 함께 삭제)"""
    session_repo = SessionRepository(db)
    success = session_repo.delete(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    return {"success": True, "message": "세션이 삭제되었습니다"}
