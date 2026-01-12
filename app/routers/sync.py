"""
구글 시트 동기화 API
"""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.schemas.models import SyncResponse
from app.config import CARD_SHEETS

# scripts 모듈 경로 추가
sys.path.insert(0, str(Path("/home/tlswk/77corp/scripts")))

router = APIRouter()


@router.post("/sync/sheets", response_model=SyncResponse)
async def sync_google_sheets():
    """
    구글 시트 동기화

    메인 Excel 파일의 모든 카드 시트를 구글 시트와 동기화합니다.
    """
    try:
        from sheets_sync import GoogleSheetsSync

        sync = GoogleSheetsSync()
        sync.sync_all()

        return SyncResponse(
            success=True,
            synced_sheets=CARD_SHEETS,
            message="구글 시트 동기화 완료"
        )

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"sheets_sync 모듈을 찾을 수 없습니다: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"동기화 실패: {e}"
        )


@router.get("/sync/info")
async def get_sync_info():
    """구글 시트 정보 조회"""
    try:
        from sheets_sync import GoogleSheetsSync

        sync = GoogleSheetsSync()
        # get_sheet_info는 print로 출력하므로 간단히 정보만 반환
        return {
            "success": True,
            "spreadsheet_id": sync.spreadsheet_id,
            "sheets": CARD_SHEETS
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
