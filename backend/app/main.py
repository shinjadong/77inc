"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import upload, sessions, transactions, cards, patterns
from backend.app.database import engine, Base

# 테이블 생성
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
