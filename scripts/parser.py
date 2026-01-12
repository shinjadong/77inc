#!/usr/bin/env python3
"""
카드사 청구명세서 파싱 모듈
.xls 파일에서 필요한 정보만 추출
"""
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path
import pandas as pd


@dataclass
class Transaction:
    """거래 내역 데이터 클래스"""
    date: str           # 승인일자 (YYYY-MM-DD)
    merchant: str       # 가맹점명
    amount: int         # 거래금액 (원)
    card_number: str    # 전체 카드번호
    sheet_name: str     # 대상 시트명 (카드 끝 4자리)
    industry: str       # 가맹점업종 (규칙 매칭용)


class CardStatementParser:
    """카드사 청구명세서 파서"""

    # 카드번호 끝 4자리 → 시트명 매핑
    CARD_TO_SHEET = {
        "3987": "3987",  # 김준교
        "4985": "4985",  # 김용석 대표님
        "6902": "6902",  # 하이패스1
        "6911": "6911",  # 하이패스2
        "6974": "6974",  # 노혜경 이사님
        "9980": "9980",  # 공용카드
    }

    # 카드사 파일의 컬럼명 (실제 파일에서 확인된 값)
    COLUMN_MAP = {
        "card_number": "카드번호",
        "date": "승인일자",
        "merchant": "가맹점명",
        "amount": "거래금액(원화)",
        "industry": "가맹점업종",
    }

    def parse(self, file_path: str) -> List[Transaction]:
        """
        카드사 xls 파일 파싱

        Args:
            file_path: 카드사 청구명세서 파일 경로

        Returns:
            Transaction 객체 리스트
        """
        transactions = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

        # xlrd로 .xls 파일 읽기
        try:
            df = pd.read_excel(file_path, engine="xlrd")
        except Exception as e:
            print(f"파일 읽기 오류: {e}")
            # openpyxl로 재시도 (.xlsx 형식일 수 있음)
            df = pd.read_excel(file_path, engine="openpyxl")

        print(f"파일 로드: {path.name} ({len(df)}건)")

        for idx, row in df.iterrows():
            try:
                tx = self._parse_row(row)
                if tx:
                    transactions.append(tx)
            except Exception as e:
                print(f"행 {idx} 파싱 오류: {e}")

        return transactions

    def _parse_row(self, row: pd.Series) -> Optional[Transaction]:
        """단일 행 파싱"""

        # 카드번호 추출 및 시트 결정
        card_number = str(row.get(self.COLUMN_MAP["card_number"], ""))
        if not card_number or card_number == "nan":
            return None

        card_last4 = card_number.replace("-", "")[-4:]
        if card_last4 not in self.CARD_TO_SHEET:
            # 알 수 없는 카드는 건너뜀
            return None

        sheet_name = self.CARD_TO_SHEET[card_last4]

        # 승인일자 파싱
        date_raw = row.get(self.COLUMN_MAP["date"], "")
        date = self._parse_date(date_raw)
        if not date:
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

        return Transaction(
            date=date,
            merchant=merchant,
            amount=amount,
            card_number=card_number,
            sheet_name=sheet_name,
            industry=industry,
        )

    def _parse_date(self, value) -> Optional[str]:
        """날짜 문자열 정규화 (YYYY-MM-DD)"""
        if pd.isna(value):
            return None

        date_str = str(value).strip()

        # 이미 YYYY-MM-DD 형식
        if len(date_str) >= 10 and "-" in date_str:
            return date_str[:10]

        # YYYYMMDD 형식
        if len(date_str) == 8 and date_str.isdigit():
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

        # pandas Timestamp
        try:
            ts = pd.to_datetime(value)
            return ts.strftime("%Y-%m-%d")
        except:
            return None

    def _parse_amount(self, value) -> int:
        """금액 파싱 (정수로 변환)"""
        if pd.isna(value):
            return 0

        try:
            # 쉼표, 공백 제거 후 정수 변환
            clean = str(value).replace(",", "").replace(" ", "").strip()
            return int(float(clean))
        except:
            return 0

    def parse_directory(self, dir_path: str) -> List[Transaction]:
        """
        디렉토리 내 모든 xls 파일 파싱

        Args:
            dir_path: 카드사 파일이 있는 디렉토리

        Returns:
            모든 파일의 Transaction 통합 리스트
        """
        all_transactions = []
        path = Path(dir_path)

        # 하위 디렉토리 포함 모든 xls 파일
        for xls_file in path.rglob("*.xls"):
            try:
                txs = self.parse(str(xls_file))
                all_transactions.extend(txs)
            except Exception as e:
                print(f"파일 처리 오류 [{xls_file.name}]: {e}")

        print(f"\n총 {len(all_transactions)}건 파싱 완료")
        return all_transactions


if __name__ == "__main__":
    # 테스트 실행
    import sys

    if len(sys.argv) < 2:
        print("사용법: python parser.py <카드사_파일.xls>")
        sys.exit(1)

    parser = CardStatementParser()
    transactions = parser.parse(sys.argv[1])

    print(f"\n파싱 결과: {len(transactions)}건")
    for tx in transactions[:5]:
        print(f"  {tx.date} | {tx.sheet_name} | {tx.merchant} | {tx.amount:,}원")
