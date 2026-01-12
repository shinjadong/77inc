"""
칠칠기업 법인카드 FastAPI 웹 애플리케이션
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pathlib import Path

from app.config import BASE_DIR, UPLOADS_DIR
from app.routers import upload, process, patterns, sync

# FastAPI 앱 생성
app = FastAPI(
    title="칠칠기업 법인카드 자동분류 시스템",
    description="카드사 청구명세서를 자동으로 분류하는 웹 애플리케이션",
    version="1.0.0"
)

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# 라우터 등록
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(process.router, prefix="/api", tags=["process"])
app.include_router(patterns.router, prefix="/api", tags=["patterns"])
app.include_router(sync.router, prefix="/api", tags=["sync"])


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """메인 페이지"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/pending", response_class=HTMLResponse)
async def pending_page(request: Request):
    """미분류 관리 페이지"""
    return templates.TemplateResponse("pending.html", {"request": request})


@app.get("/patterns", response_class=HTMLResponse)
async def patterns_page(request: Request):
    """패턴 DB 조회 페이지"""
    return templates.TemplateResponse("patterns.html", {"request": request})


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 초기화"""
    # uploads 디렉토리 확인
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✓ 업로드 디렉토리: {UPLOADS_DIR}")
    print(f"✓ 기본 경로: {BASE_DIR}")
    print("✓ 칠칠기업 법인카드 시스템 시작됨")
