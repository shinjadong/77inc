"""
파일 업로드 API
"""
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import UPLOADS_DIR, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE
from app.schemas.models import UploadResponse, UploadedFile
from app.services.card_processor import CardProcessorService

router = APIRouter()

# 업로드 세션 저장 (메모리)
_upload_sessions: dict[str, dict] = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_files(files: list[UploadFile] = File(...)):
    """
    카드사 XLS 파일 업로드

    - 여러 파일 동시 업로드 지원
    - 지원 형식: .xls, .xlsx
    - 최대 크기: 10MB
    """
    upload_id = str(uuid.uuid4())
    uploaded_files = []
    file_paths = []

    # 업로드 디렉토리 생성
    session_dir = UPLOADS_DIR / upload_id
    session_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        # 확장자 확인
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다: {ext}. 허용: {ALLOWED_EXTENSIONS}"
            )

        # 파일 저장
        file_path = session_dir / file.filename
        try:
            content = await file.read()

            # 크기 확인
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"파일이 너무 큽니다: {file.filename} ({len(content)} bytes)"
                )

            with open(file_path, "wb") as f:
                f.write(content)

            uploaded_files.append(UploadedFile(
                filename=file.filename,
                size=len(content)
            ))
            file_paths.append(str(file_path))

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"파일 저장 실패: {e}")

    # 파싱하여 거래 수 확인
    processor = CardProcessorService()
    transactions = processor.parse_files(file_paths)

    # 세션 저장
    _upload_sessions[upload_id] = {
        "files": file_paths,
        "transactions": transactions
    }

    return UploadResponse(
        success=True,
        upload_id=upload_id,
        files=uploaded_files,
        total_transactions=len(transactions)
    )


@router.delete("/upload/{upload_id}")
async def delete_upload(upload_id: str):
    """업로드 세션 삭제"""
    session_dir = UPLOADS_DIR / upload_id
    if session_dir.exists():
        shutil.rmtree(session_dir)

    if upload_id in _upload_sessions:
        del _upload_sessions[upload_id]

    return {"success": True, "message": "삭제됨"}


def get_upload_session(upload_id: str) -> dict:
    """업로드 세션 조회 (내부 사용)"""
    if upload_id not in _upload_sessions:
        raise HTTPException(status_code=404, detail="업로드 세션을 찾을 수 없습니다")
    return _upload_sessions[upload_id]
