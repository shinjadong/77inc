#!/usr/bin/env python3
"""
구글 시트 동기화 모듈
Excel 데이터를 구글 시트와 동기화
"""
import sys
from pathlib import Path
from typing import List, Optional
import pandas as pd

# Google API
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# 설정
BASE_DIR = Path("/home/tlswk/77corp")
CONFIG_DIR = BASE_DIR / "config"
MAIN_FILE = BASE_DIR / "칠칠기업_법인카드.xlsx"

# 구글 시트 설정
SPREADSHEET_ID = "1XVlfD1StI2mfq5h-459XH3bwVYYd_Lt8fwqjZxZpNJY"
SERVICE_ACCOUNT_FILE = CONFIG_DIR / "reflected-gamma-408204-e2128609cb83.json"

# API 스코프
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# 카드 시트 목록
CARD_SHEETS = ["3987", "4985", "6902", "6911", "6974", "9980"]


class GoogleSheetsSync:
    """구글 시트 동기화 클래스"""

    def __init__(self, spreadsheet_id: str = SPREADSHEET_ID):
        self.spreadsheet_id = spreadsheet_id
        self.service = None
        self._authenticate()

    def _authenticate(self):
        """서비스 계정으로 인증"""
        if not SERVICE_ACCOUNT_FILE.exists():
            raise FileNotFoundError(
                f"서비스 계정 파일을 찾을 수 없습니다: {SERVICE_ACCOUNT_FILE}\n"
                "구글 클라우드 콘솔에서 서비스 계정을 생성하세요."
            )

        try:
            creds = Credentials.from_service_account_file(
                str(SERVICE_ACCOUNT_FILE),
                scopes=SCOPES
            )
            self.service = build("sheets", "v4", credentials=creds)
            print("구글 시트 인증 성공")
        except Exception as e:
            raise Exception(f"인증 실패: {e}")

    def get_sheet_id(self, sheet_name: str) -> Optional[int]:
        """시트 이름으로 시트 ID 조회"""
        try:
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()

            for sheet in spreadsheet.get("sheets", []):
                if sheet["properties"]["title"] == sheet_name:
                    return sheet["properties"]["sheetId"]
            return None
        except HttpError as e:
            print(f"시트 조회 오류: {e}")
            return None

    def create_sheet(self, sheet_name: str) -> bool:
        """새 시트 생성"""
        try:
            request = {
                "requests": [{
                    "addSheet": {
                        "properties": {"title": sheet_name}
                    }
                }]
            }
            self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body=request
            ).execute()
            print(f"시트 생성: {sheet_name}")
            return True
        except HttpError as e:
            print(f"시트 생성 오류: {e}")
            return False

    def clear_sheet(self, sheet_name: str):
        """시트 데이터 삭제"""
        try:
            self.service.spreadsheets().values().clear(
                spreadsheetId=self.spreadsheet_id,
                range=f"{sheet_name}!A:Z"
            ).execute()
        except HttpError as e:
            print(f"시트 클리어 오류: {e}")

    def sync_sheet(self, sheet_name: str, df: pd.DataFrame) -> bool:
        """
        DataFrame을 구글 시트에 동기화

        Args:
            sheet_name: 시트 이름
            df: 동기화할 데이터

        Returns:
            성공 여부
        """
        # 시트 존재 확인
        sheet_id = self.get_sheet_id(sheet_name)
        if sheet_id is None:
            self.create_sheet(sheet_name)

        # 데이터 준비 (헤더 + 데이터)
        values = [df.columns.tolist()]  # 헤더
        for _, row in df.iterrows():
            values.append([self._format_value(v) for v in row.tolist()])

        try:
            # 기존 데이터 삭제
            self.clear_sheet(sheet_name)

            # 새 데이터 입력
            result = self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption="USER_ENTERED",
                body={"values": values}
            ).execute()

            updated = result.get("updatedRows", 0)
            print(f"동기화 완료: [{sheet_name}] {updated}행")
            return True

        except HttpError as e:
            print(f"동기화 오류 [{sheet_name}]: {e}")
            return False

    def _format_value(self, value) -> str:
        """값 포맷팅"""
        if pd.isna(value):
            return ""
        if isinstance(value, (int, float)):
            return str(int(value)) if float(value).is_integer() else str(value)
        return str(value)

    def sync_all(self, excel_path: str = str(MAIN_FILE)):
        """
        모든 카드 시트 동기화

        Args:
            excel_path: Excel 파일 경로
        """
        print(f"\n구글 시트 동기화 시작")
        print(f"  Excel: {excel_path}")
        print(f"  시트 ID: {self.spreadsheet_id}")

        success_count = 0
        for sheet_name in CARD_SHEETS:
            try:
                df = pd.read_excel(excel_path, sheet_name=sheet_name)
                if self.sync_sheet(sheet_name, df):
                    success_count += 1
            except Exception as e:
                print(f"  [{sheet_name}] 동기화 실패: {e}")

        print(f"\n동기화 완료: {success_count}/{len(CARD_SHEETS)} 시트")

    def get_sheet_info(self):
        """스프레드시트 정보 조회"""
        try:
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()

            print(f"\n스프레드시트: {spreadsheet['properties']['title']}")
            print("시트 목록:")
            for sheet in spreadsheet.get("sheets", []):
                props = sheet["properties"]
                print(f"  - {props['title']} (ID: {props['sheetId']})")

        except HttpError as e:
            print(f"정보 조회 오류: {e}")


def main():
    """CLI 실행"""
    import argparse

    parser = argparse.ArgumentParser(description="구글 시트 동기화")
    parser.add_argument("--info", action="store_true", help="스프레드시트 정보 조회")
    parser.add_argument("--sync", action="store_true", help="전체 동기화 실행")
    parser.add_argument("--sheet", type=str, help="특정 시트만 동기화")

    args = parser.parse_args()

    try:
        sync = GoogleSheetsSync()

        if args.info:
            sync.get_sheet_info()
        elif args.sync:
            sync.sync_all()
        elif args.sheet:
            df = pd.read_excel(MAIN_FILE, sheet_name=args.sheet)
            sync.sync_sheet(args.sheet, df)
        else:
            parser.print_help()

    except Exception as e:
        print(f"오류: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
