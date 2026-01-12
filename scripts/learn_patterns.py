#!/usr/bin/env python3
"""
패턴 학습 스크립트
수동 검토 완료된 미분류 리포트에서 새 패턴 학습
"""
import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from matcher import UsageMatcher


def learn_from_review(reviewed_file: str, data_dir: str = "/home/tlswk/77corp/data"):
    """
    수동 검토 완료된 파일에서 새 패턴 학습

    Args:
        reviewed_file: 검토 완료된 미분류 리포트 경로
        data_dir: 패턴 DB 디렉토리
    """
    path = Path(reviewed_file)
    if not path.exists():
        print(f"오류: 파일을 찾을 수 없습니다: {reviewed_file}")
        return

    print(f"파일 로드: {path.name}")
    df = pd.read_excel(reviewed_file)

    # 매처 로드
    matcher = UsageMatcher(data_dir)

    learned = 0
    skipped = 0

    for _, row in df.iterrows():
        merchant = str(row.get("가맹점명", "")).strip()
        usage = str(row.get("최종_사용용도", "")).strip()
        card = str(row.get("카드", "")).strip()

        if not merchant or not usage or usage == "nan":
            skipped += 1
            continue

        # 패턴 추가
        matcher.add_pattern(merchant, usage)
        learned += 1
        print(f"  학습: {merchant} → {usage}")

    # 저장
    if learned > 0:
        matcher.save_patterns()
        print(f"\n{learned}개 패턴 학습 완료!")
    else:
        print("\n학습할 패턴이 없습니다.")

    if skipped > 0:
        print(f"(건너뜀: {skipped}건 - 최종_사용용도 미입력)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python learn_patterns.py <검토완료_파일.xlsx>")
        print()
        print("예시:")
        print("  python learn_patterns.py /home/tlswk/77corp/미분류/pending_20260112.xlsx")
        sys.exit(1)

    learn_from_review(sys.argv[1])
