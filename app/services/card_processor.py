"""
카드 처리 서비스
기존 CLI 모듈을 래핑하여 웹 API에서 사용
"""
import sys
import json
import asyncio
from pathlib import Path
from typing import Optional
from dataclasses import asdict

# 기존 scripts 모듈 경로 추가
sys.path.insert(0, str(Path("/home/tlswk/77corp/scripts")))

from parser import CardStatementParser, Transaction
from matcher import UsageMatcher, MatchResult
from excel_handler import ExcelHandler, PendingReportHandler

from app.config import DATA_DIR, MAIN_EXCEL_FILE, PENDING_DIR

# 동시성 제어를 위한 락
_excel_lock = asyncio.Lock()


class CardProcessorService:
    """카드 처리 서비스 클래스"""

    def __init__(self):
        self.parser = CardStatementParser()
        self.matcher = UsageMatcher(str(DATA_DIR))

    def parse_files(self, file_paths: list[str]) -> list[Transaction]:
        """파일들을 파싱하여 거래 목록 반환"""
        transactions = []
        for path in file_paths:
            try:
                txs = self.parser.parse(path)
                transactions.extend(txs)
            except Exception as e:
                print(f"파싱 오류 ({path}): {e}")
        return transactions

    def preview(self, transactions: list[Transaction]) -> dict:
        """거래 목록 미리보기 (dry-run)"""
        results = []
        stats = {
            "total": len(transactions),
            "processed": 0,
            "duplicates": 0,
            "manual": 0,
            "by_type": {"EXACT": 0, "CARD_SPECIFIC": 0, "RULE": 0, "MANUAL": 0},
            "by_card": {}
        }

        # 중복 검사를 위해 Excel 읽기
        with ExcelHandler(str(MAIN_EXCEL_FILE)) as excel:
            for tx in transactions:
                # 카드별 통계 초기화
                if tx.sheet_name not in stats["by_card"]:
                    stats["by_card"][tx.sheet_name] = {
                        "processed": 0, "duplicates": 0, "manual": 0
                    }

                # 중복 검사
                is_dup = excel.is_duplicate(tx.sheet_name, tx.date, tx.merchant, tx.amount)
                if is_dup:
                    stats["duplicates"] += 1
                    stats["by_card"][tx.sheet_name]["duplicates"] += 1
                    continue

                # 매칭
                match = self.matcher.match(tx.merchant, tx.sheet_name, tx.industry)
                stats["by_type"][match.match_type] += 1

                if match.match_type == "MANUAL":
                    stats["manual"] += 1
                    stats["by_card"][tx.sheet_name]["manual"] += 1
                else:
                    stats["processed"] += 1
                    stats["by_card"][tx.sheet_name]["processed"] += 1

                results.append({
                    "date": tx.date,
                    "merchant": tx.merchant,
                    "amount": tx.amount,
                    "card": tx.sheet_name,
                    "industry": tx.industry,
                    "matched_usage": match.usage,
                    "match_type": match.match_type,
                    "confidence": match.confidence
                })

        return {"transactions": results, "stats": stats}

    async def execute(self, transactions: list[Transaction], sync_sheets: bool = False) -> dict:
        """실제 처리 실행 (Excel 저장)"""
        result = {
            "success": False,
            "processed": 0,
            "duplicates": 0,
            "manual": 0,
            "pending_file": None,
            "synced": False,
            "message": ""
        }

        pending_report = PendingReportHandler()

        async with _excel_lock:
            try:
                with ExcelHandler(str(MAIN_EXCEL_FILE)) as excel:
                    for tx in transactions:
                        # 중복 검사
                        if excel.is_duplicate(tx.sheet_name, tx.date, tx.merchant, tx.amount):
                            result["duplicates"] += 1
                            continue

                        # 매칭
                        match = self.matcher.match(tx.merchant, tx.sheet_name, tx.industry)

                        if match.match_type == "MANUAL":
                            result["manual"] += 1
                            pending_report.add(
                                tx.date, tx.merchant, tx.amount,
                                tx.sheet_name, tx.industry
                            )
                        else:
                            result["processed"] += 1
                            excel.append_row(
                                tx.sheet_name, tx.date, tx.merchant,
                                tx.amount, match.usage
                            )

                    # 저장
                    if result["processed"] > 0:
                        excel.save(backup=True)

                # 미분류 리포트 저장
                if pending_report.count > 0:
                    result["pending_file"] = pending_report.save()

                result["success"] = True
                result["message"] = f"처리 완료: {result['processed']}건"

                # 구글 시트 동기화
                if sync_sheets and result["processed"] > 0:
                    try:
                        from sheets_sync import GoogleSheetsSync
                        sync = GoogleSheetsSync()
                        sync.sync_all()
                        result["synced"] = True
                        result["message"] += ", 구글 시트 동기화 완료"
                    except Exception as e:
                        result["message"] += f", 구글 시트 동기화 실패: {e}"

            except Exception as e:
                result["message"] = f"처리 오류: {e}"

        return result


class PatternService:
    """패턴 관리 서비스"""

    def __init__(self):
        self.exact_file = DATA_DIR / "patterns_exact.json"
        self.card_file = DATA_DIR / "patterns_card.json"
        self.rules_file = DATA_DIR / "patterns_rules.json"

    def get_patterns(self, pattern_type: Optional[str] = None, search: Optional[str] = None) -> dict:
        """패턴 조회"""
        result = {
            "exact": {},
            "card_specific": {},
            "rules": [],
            "total_count": 0
        }

        # 정확 매칭
        if pattern_type is None or pattern_type == "exact":
            if self.exact_file.exists():
                with open(self.exact_file, "r", encoding="utf-8") as f:
                    exact = json.load(f)
                    if search:
                        exact = {k: v for k, v in exact.items() if search.lower() in k.lower()}
                    result["exact"] = exact
                    result["total_count"] += len(exact)

        # 카드별 특수 매핑
        if pattern_type is None or pattern_type == "card":
            if self.card_file.exists():
                with open(self.card_file, "r", encoding="utf-8") as f:
                    card = json.load(f)
                    if search:
                        card = {k: v for k, v in card.items() if search.lower() in k.lower()}
                    result["card_specific"] = card
                    result["total_count"] += len(card)

        # 규칙
        if pattern_type is None or pattern_type == "rules":
            if self.rules_file.exists():
                with open(self.rules_file, "r", encoding="utf-8") as f:
                    rules = json.load(f)
                    result["rules"] = rules.get("rules", [])
                    result["total_count"] += len(result["rules"])

        return result

    def learn_from_file(self, pending_file: str) -> dict:
        """미분류 파일에서 패턴 학습"""
        from learn_patterns import learn_from_review

        result = {
            "success": False,
            "learned_count": 0,
            "patterns_added": []
        }

        try:
            added = learn_from_review(pending_file)
            result["success"] = True
            result["learned_count"] = len(added)
            result["patterns_added"] = [
                {"merchant": m, "usage": u, "count": 1}
                for m, u in added.items()
            ]
        except Exception as e:
            result["message"] = str(e)

        return result


class PendingService:
    """미분류 항목 관리 서비스"""

    def __init__(self):
        self.pending_dir = PENDING_DIR

    def get_pending_files(self) -> list[str]:
        """미분류 파일 목록"""
        if not self.pending_dir.exists():
            return []
        return sorted([str(f) for f in self.pending_dir.glob("pending_*.xlsx")])

    def get_pending_items(self, file_path: Optional[str] = None) -> list[dict]:
        """미분류 항목 목록"""
        import pandas as pd

        items = []
        files = [file_path] if file_path else self.get_pending_files()

        for f in files:
            if not Path(f).exists():
                continue
            try:
                df = pd.read_excel(f)
                for idx, row in df.iterrows():
                    items.append({
                        "id": len(items),
                        "file": f,
                        "date": str(row.get("거래일", "")),
                        "merchant": str(row.get("가맹점", "")),
                        "amount": int(row.get("금액", 0)),
                        "card": str(row.get("카드", "")),
                        "industry": str(row.get("업종", "")),
                        "suggested_usage": row.get("최종_사용용도")
                    })
            except Exception as e:
                print(f"읽기 오류 ({f}): {e}")

        return items
