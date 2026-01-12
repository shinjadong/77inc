"""
파일 업로드 API
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.upload import UploadService

router = APIRouter()


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    카드사 청구명세서 업로드

    - .xls 또는 .xlsx 파일 업로드
    - 자동으로 거래 파싱 및 패턴 매칭 수행
    """
    # 파일 확장자 검사
    if not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. .xls 또는 .xlsx 파일만 가능합니다.",
        )

    try:
        # 파일 읽기
        file_bytes = await file.read()

        # 업로드 처리
        upload_service = UploadService(db)
        session, stats = upload_service.process_upload(
            file_bytes=file_bytes,
            filename=file.filename,
        )

        return {
            "success": True,
            "session_id": session.id,
            "filename": session.filename,
            "stats": stats,
            "message": f"{stats['created']}건 처리, {stats['matched']}건 자동 매칭",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 처리 오류: {str(e)}")
