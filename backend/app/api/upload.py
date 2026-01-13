"""
파일 업로드 API
Supabase Storage 연동
"""
import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.upload import UploadService
from app.services.supabase_storage import get_storage_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    카드사 청구명세서 업로드

    - .xls 또는 .xlsx 파일 업로드
    - 자동으로 거래 파싱 및 패턴 매칭 수행
    - Supabase Storage에 원본 파일 저장
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

        # Supabase Storage에 원본 파일 저장
        storage_info = None
        try:
            storage = get_storage_service()
            storage_info = storage.upload_billing_statement(file_bytes, file.filename)
            logger.info(f"Uploaded file saved to storage: {storage_info['path']}")
        except Exception as e:
            logger.warning(f"Failed to save to storage (continuing): {e}")

        # 업로드 처리
        upload_service = UploadService(db)
        session, stats = upload_service.process_upload(
            file_bytes=file_bytes,
            filename=file.filename,
        )

        response = {
            "success": True,
            "session_id": session.id,
            "filename": session.filename,
            "stats": stats,
            "message": f"{stats['created']}건 처리, {stats['matched']}건 자동 매칭",
        }

        # Storage 정보 추가
        if storage_info:
            response["storage"] = {
                "path": storage_info["path"],
                "url": storage_info["url"],
            }

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 처리 오류: {str(e)}")
