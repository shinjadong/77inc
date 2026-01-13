"""
FastAPI 메인 애플리케이션
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import upload, sessions, transactions, cards, patterns, users, export
from app.database import engine, Base

# 테이블 생성 (SQLite 사용 시)
import os
if not os.getenv("DATABASE_URL"):
    Base.metadata.create_all(bind=engine)

# FastAPI 앱 생성
app = FastAPI(
    title="칠칠기업 법인카드 관리 시스템",
    description="법인카드 청구명세서 자동 매칭 및 관리 API",
    version="2.0.0",
)

# CORS 설정 (Next.js 프론트엔드 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 개발 서버
        "http://127.0.0.1:3000",
        "https://*.vercel.app",   # Vercel 배포
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(cards.router, prefix="/api/cards", tags=["Cards"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["Patterns"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "ok",
        "service": "칠칠기업 법인카드 관리 시스템",
        "version": "2.0.0",
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}
