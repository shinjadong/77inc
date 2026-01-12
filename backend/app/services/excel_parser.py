"""
Excel 파싱 서비스
카드사 청구명세서 .xls/.xlsx 파일 파싱
"""
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path
from datetime import date
import pandas as pd


@dataclass
class ParsedTransaction:
    """파싱된 거래 데이터"""
    transaction_date: date
    merchant_name: str
    amount: int
    card_number: str  # 끝 4자리
    industry: str


class ExcelParserService:
    """카드사 청구명세서 파싱 서비스"""

    # 카드사 파일의 컬럼명
    COLUMN_MAP = {
        "card_number": "카드번호",
        "date": "승인일자",
        "merchant": "가맹점명",
        "amount": "거래금액(원화)",
        "industry": "가맹점업종",
    }

    def parse_file(self, file_path: str) -> List[ParsedTransaction]:
        """
        카드사 Excel 파일 파싱

        Args:
            file_path: 파일 경로

        Returns:
            ParsedTransaction 리스트
        """
        transactions = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

        # 파일 형식에 따라 엔진 선택
        df = self._read_excel(file_path)

        for idx, row in df.iterrows():
            try:
                tx = self._parse_row(row)
                if tx:
                    transactions.append(tx)
            except Exception as e:
                print(f"행 {idx} 파싱 오류: {e}")

        return transactions

    def parse_bytes(self, file_bytes: bytes, filename: str) -> List[ParsedTransaction]:
        """
        업로드된 파일 바이트 파싱

        Args:
            file_bytes: 파일 바이트
            filename: 파일명 (확장자 판별용)

        Returns:
            ParsedTransaction 리스트
        """
        import io

        transactions = []
        ext = Path(filename).suffix.lower()

        # 바이트를 파일 객체로 변환
        file_obj = io.BytesIO(file_bytes)

        try:
            if ext == ".xls":
                df = pd.read_excel(file_obj, engine="xlrd")
            else:
                df = pd.read_excel(file_obj, engine="openpyxl")
        except Exception as e:
            raise ValueError(f"Excel 파일 읽기 오류: {e}")

        for idx, row in df.iterrows():
            try:
                tx = self._parse_row(row)
                if tx:
                    transactions.append(tx)
            except Exception as e:
                print(f"행 {idx} 파싱 오류: {e}")

        return transactions

    def _read_excel(self, file_path: str) -> pd.DataFrame:
        """Excel 파일 읽기"""
        try:
            # xlrd로 .xls 파일 시도
            return pd.read_excel(file_path, engine="xlrd")
        except Exception:
            # openpyxl로 .xlsx 파일 시도
            return pd.read_excel(file_path, engine="openpyxl")

    def _parse_row(self, row: pd.Series) -> Optional[ParsedTransaction]:
        """단일 행 파싱"""
        # 카드번호 추출
        card_number = str(row.get(self.COLUMN_MAP["card_number"], ""))
        if not card_number or card_number == "nan":
            return None

        card_last4 = card_number.replace("-", "")[-4:]
        if len(card_last4) != 4 or not card_last4.isdigit():
            return None

        # 승인일자 파싱
        date_raw = row.get(self.COLUMN_MAP["date"], "")
        parsed_date = self._parse_date(date_raw)
        if not parsed_date:
            return None

        # 가맹점명
        merchant = str(row.get(self.COLUMN_MAP["merchant"], "")).strip()
        if not merchant or merchant == "nan":
            return None

        # 거래금액
        amount = self._parse_amount(row.get(self.COLUMN_MAP["amount"], 0))
        if amount == 0:
            return None

        # 가맹점업종 (선택)
        industry = str(row.get(self.COLUMN_MAP["industry"], "")).strip()
        if industry == "nan":
            industry = ""

        return ParsedTransaction(
            transaction_date=parsed_date,
            merchant_name=merchant,
            amount=amount,
            card_number=card_last4,
            industry=industry,
        )

    def _parse_date(self, value) -> Optional[date]:
        """날짜 파싱"""
        if pd.isna(value):
            return None

        date_str = str(value).strip()

        # YYYY-MM-DD 형식
        if len(date_str) >= 10 and "-" in date_str:
            try:
                return date.fromisoformat(date_str[:10])
            except ValueError:
                pass

        # YYYYMMDD 형식
        if len(date_str) == 8 and date_str.isdigit():
            try:
                return date(
                    int(date_str[:4]),
                    int(date_str[4:6]),
                    int(date_str[6:8])
                )
            except ValueError:
                pass

        # pandas Timestamp
        try:
            ts = pd.to_datetime(value)
            return ts.date()
        except:
            return None

    def _parse_amount(self, value) -> int:
        """금액 파싱"""
        if pd.isna(value):
            return 0

        try:
            clean = str(value).replace(",", "").replace(" ", "").strip()
            return int(float(clean))
        except:
            return 0
