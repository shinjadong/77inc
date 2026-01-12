"""
애플리케이션 설정
"""
from pathlib import Path

# 경로 설정
BASE_DIR = Path("/home/tlswk/77corp")
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
MAIN_EXCEL_FILE = BASE_DIR / "칠칠기업_법인카드.xlsx"
PENDING_DIR = BASE_DIR / "미분류"

# 업로드 설정
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".xls", ".xlsx"}

# 카드 시트 목록
CARD_SHEETS = ["3987", "4985", "6902", "6911", "6974", "9980"]

# 구글 시트 설정
SPREADSHEET_ID = "1XVlfD1StI2mfq5h-459XH3bwVYYd_Lt8fwqjZxZpNJY"
