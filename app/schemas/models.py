"""
Pydantic 스키마 모델
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UploadedFile(BaseModel):
    """업로드된 파일 정보"""
    filename: str
    size: int


class UploadResponse(BaseModel):
    """파일 업로드 응답"""
    success: bool
    upload_id: str
    files: list[UploadedFile]
    total_transactions: int


class TransactionItem(BaseModel):
    """거래 항목"""
    date: str
    merchant: str
    amount: int
    card: str
    industry: str
    matched_usage: Optional[str] = None
    match_type: str = "MANUAL"
    confidence: float = 0.0


class CardStats(BaseModel):
    """카드별 통계"""
    processed: int = 0
    duplicates: int = 0
    manual: int = 0


class ProcessStats(BaseModel):
    """처리 통계"""
    total: int
    processed: int
    duplicates: int
    manual: int
    by_type: dict[str, int]
    by_card: dict[str, CardStats]


class PreviewResponse(BaseModel):
    """미리보기 응답"""
    success: bool
    transactions: list[TransactionItem]
    stats: ProcessStats


class ProcessRequest(BaseModel):
    """처리 요청"""
    upload_id: str
    sync_sheets: bool = False


class ProcessResponse(BaseModel):
    """처리 응답"""
    success: bool
    processed: int
    duplicates: int
    manual: int
    pending_file: Optional[str] = None
    synced: bool = False
    message: str = ""


class PatternItem(BaseModel):
    """패턴 항목"""
    merchant: str
    usage: str
    count: int = 1


class PatternResponse(BaseModel):
    """패턴 조회 응답"""
    exact: dict[str, dict]
    card_specific: dict[str, dict]
    rules: list[dict]
    total_count: int


class LearnRequest(BaseModel):
    """패턴 학습 요청"""
    pending_file: str


class LearnResponse(BaseModel):
    """패턴 학습 응답"""
    success: bool
    learned_count: int
    patterns_added: list[PatternItem]


class PendingItem(BaseModel):
    """미분류 항목"""
    id: int
    date: str
    merchant: str
    amount: int
    card: str
    industry: str
    suggested_usage: Optional[str] = None


class ClassifyRequest(BaseModel):
    """수동 분류 요청"""
    usage: str
    learn: bool = True


class SyncResponse(BaseModel):
    """동기화 응답"""
    success: bool
    synced_sheets: list[str]
    message: str = ""
