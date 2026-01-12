#!/usr/bin/env python3
"""
칠칠기업 법인카드 자동 분류 시스템
메인 실행 스크립트

사용법:
    python main.py /path/to/카드사_파일
    python main.py /path/to/카드_디렉토리 --sync-sheets
    python main.py /path/to/카드_파일 --dry-run
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from parser import CardStatementParser
from matcher import UsageMatcher
from excel_handler import ExcelHandler, PendingReportHandler


def main():
    parser = argparse.ArgumentParser(
        description="칠칠기업 법인카드 자동 분류 시스템",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
    # 단일 파일 처리
    python main.py /home/tlswk/77corp/카드/청구명세서조회_20260112110122/5587286_20260112110122.xls

    # 디렉토리 내 모든 파일 처리
    python main.py /home/tlswk/77corp/카드/

    # 테스트 모드 (저장 안함)
    python main.py /home/tlswk/77corp/카드/ --dry-run

    # 구글 시트 동기화 포함
    python main.py /home/tlswk/77corp/카드/ --sync-sheets
        """
    )

    parser.add_argument(
        "input_path",
        help="카드사 파일 또는 디렉토리 경로"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="테스트 모드 (실제 저장 안함)"
    )
    parser.add_argument(
        "--sync-sheets",
        action="store_true",
        help="구글 시트 동기화 실행"
    )
    parser.add_argument(
        "--json-output",
        action="store_true",
        help="JSON 형식으로 결과 출력 (n8n 연동용)"
    )
    parser.add_argument(
        "--main-file",
        default="/home/tlswk/77corp/칠칠기업_법인카드.xlsx",
        help="메인 Excel 파일 경로"
    )
    parser.add_argument(
        "--data-dir",
        default="/home/tlswk/77corp/data",
        help="패턴 DB 디렉토리"
    )

    args = parser.parse_args()

    # 입력 경로 확인
    input_path = Path(args.input_path)
    if not input_path.exists():
        print(f"오류: 입력 경로를 찾을 수 없습니다: {input_path}")
        sys.exit(1)

    # 처리 시작
    print("=" * 60)
    print("칠칠기업 법인카드 자동 분류 시스템")
    print("=" * 60)
    print(f"입력: {input_path}")
    print(f"모드: {'테스트 (저장 안함)' if args.dry_run else '실제 처리'}")
    print()

    # 모듈 초기화
    statement_parser = CardStatementParser()
    matcher = UsageMatcher(args.data_dir)
    pending_report = PendingReportHandler()

    # 통계
    stats = {
        "total": 0,
        "processed": 0,
        "duplicates": 0,
        "manual": 0,
        "by_type": {
            "EXACT": 0,
            "CARD_SPECIFIC": 0,
            "RULE": 0,
            "MANUAL": 0
        },
        "by_card": {}
    }

    # 거래 파싱
    if input_path.is_file():
        transactions = statement_parser.parse(str(input_path))
    else:
        transactions = statement_parser.parse_directory(str(input_path))

    stats["total"] = len(transactions)
    print(f"\n총 {len(transactions)}건 거래 발견")

    # Excel 핸들러 열기
    with ExcelHandler(args.main_file) as excel:
        for tx in transactions:
            # 카드별 통계 초기화
            if tx.sheet_name not in stats["by_card"]:
                stats["by_card"][tx.sheet_name] = {"processed": 0, "duplicates": 0, "manual": 0}

            # 중복 검사
            if excel.is_duplicate(tx.sheet_name, tx.date, tx.merchant, tx.amount):
                stats["duplicates"] += 1
                stats["by_card"][tx.sheet_name]["duplicates"] += 1
                continue

            # 사용용도 매칭
            result = matcher.match(tx.merchant, tx.sheet_name, tx.industry)
            stats["by_type"][result.match_type] += 1

            if result.match_type == "MANUAL":
                # 미분류
                stats["manual"] += 1
                stats["by_card"][tx.sheet_name]["manual"] += 1
                pending_report.add(tx.date, tx.merchant, tx.amount, tx.sheet_name, tx.industry)
                print(f"  ✗ [{tx.sheet_name}] {tx.merchant} → 미분류")
            else:
                # 분류 성공
                stats["processed"] += 1
                stats["by_card"][tx.sheet_name]["processed"] += 1

                if not args.dry_run:
                    excel.append_row(tx.sheet_name, tx.date, tx.merchant, tx.amount, result.usage or "")

                print(f"  ✓ [{tx.sheet_name}] {tx.merchant} → {result.usage} ({result.match_type})")

        # 저장
        if not args.dry_run and stats["processed"] > 0:
            excel.save(backup=True)

    # 미분류 리포트 저장
    pending_file = None
    if pending_report.count > 0:
        pending_file = pending_report.save()

    # 결과 출력
    print("\n" + "=" * 60)
    print("처리 결과")
    print("=" * 60)
    print(f"총 거래:     {stats['total']}건")
    print(f"처리 완료:   {stats['processed']}건")
    print(f"중복 건너뜀: {stats['duplicates']}건")
    print(f"미분류:      {stats['manual']}건")
    print()

    print("매칭 타입별:")
    for match_type, count in stats["by_type"].items():
        if count > 0:
            print(f"  {match_type}: {count}건")
    print()

    print("카드별:")
    for card, card_stats in sorted(stats["by_card"].items()):
        print(f"  [{card}] 처리: {card_stats['processed']}, "
              f"중복: {card_stats['duplicates']}, "
              f"미분류: {card_stats['manual']}")

    if pending_file:
        print(f"\n미분류 리포트: {pending_file}")
        print("→ '최종_사용용도' 컬럼에 입력 후 learn_patterns.py 실행")

    # 구글 시트 동기화
    if args.sync_sheets and not args.dry_run:
        print("\n구글 시트 동기화 중...")
        try:
            from sheets_sync import GoogleSheetsSync
            sync = GoogleSheetsSync()
            sync.sync_all()
            print("구글 시트 동기화 완료!")
        except ImportError:
            print("경고: sheets_sync 모듈을 찾을 수 없습니다.")
        except Exception as e:
            print(f"구글 시트 동기화 오류: {e}")

    # JSON 출력 (n8n 연동용)
    if args.json_output:
        output = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "stats": stats,
            "pending_file": pending_file,
            "manual_count": stats["manual"]
        }
        print("\n--- JSON OUTPUT ---")
        print(json.dumps(output, ensure_ascii=False, indent=2))

    print("\n처리 완료!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
