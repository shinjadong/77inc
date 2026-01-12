#!/usr/bin/env python3
"""
패턴 추출기: 기존 칠칠기업_법인카드.xlsx에서 가맹점→사용용도 패턴 추출
"""
import json
from pathlib import Path
from collections import defaultdict
import pandas as pd

# 경로 설정
BASE_DIR = Path("/home/tlswk/77corp")
MAIN_FILE = BASE_DIR / "칠칠기업_법인카드.xlsx"
DATA_DIR = BASE_DIR / "data"

# 카드 시트 목록
CARD_SHEETS = ["3987", "4985", "6902", "6911", "6974", "9980"]


def extract_patterns():
    """기존 데이터에서 패턴 추출"""

    # 가맹점별 사용용도 집계
    exact_patterns = defaultdict(lambda: {"usages": defaultdict(int), "cards": set()})

    # 카드별 특수 매핑 (동일 가맹점, 다른 용도)
    card_specific = defaultdict(dict)

    total_records = 0

    for sheet in CARD_SHEETS:
        try:
            df = pd.read_excel(MAIN_FILE, sheet_name=sheet)
            print(f"\n[{sheet}] 시트 분석 중... ({len(df)}건)")

            for _, row in df.iterrows():
                merchant = str(row.get("가맹점명", "")).strip()
                usage = str(row.get("사용용도", "")).strip()

                if not merchant or not usage or merchant == "nan" or usage == "nan":
                    continue

                total_records += 1
                exact_patterns[merchant]["usages"][usage] += 1
                exact_patterns[merchant]["cards"].add(sheet)

        except Exception as e:
            print(f"[{sheet}] 시트 읽기 오류: {e}")

    print(f"\n총 {total_records}건 분석 완료")
    print(f"고유 가맹점 수: {len(exact_patterns)}개")

    # 패턴 분류
    single_usage = {}  # 1:1 매핑 (정확 매칭)
    multi_usage = {}   # 1:N 매핑 (카드별 특수)

    for merchant, data in exact_patterns.items():
        usages = data["usages"]
        cards = data["cards"]

        if len(usages) == 1:
            # 단일 용도: 정확 매칭
            usage = list(usages.keys())[0]
            count = list(usages.values())[0]
            single_usage[merchant] = {"usage": usage, "count": count}
        else:
            # 다중 용도: 카드별 분석 필요
            multi_usage[merchant] = {
                "usages": dict(usages),
                "cards": list(cards)
            }

    print(f"\n정확 매칭 가능: {len(single_usage)}개")
    print(f"카드별 특수 매핑 필요: {len(multi_usage)}개")

    # 다중 용도 가맹점 분석 (카드별 패턴)
    for merchant, data in multi_usage.items():
        print(f"\n  [{merchant}]")
        for usage, count in data["usages"].items():
            print(f"    - {usage}: {count}건")

    # JSON 저장
    DATA_DIR.mkdir(exist_ok=True)

    # 1. 정확 매칭 패턴
    exact_file = DATA_DIR / "patterns_exact.json"
    with open(exact_file, "w", encoding="utf-8") as f:
        json.dump(single_usage, f, ensure_ascii=False, indent=2)
    print(f"\n저장: {exact_file}")

    # 2. 카드별 특수 매핑 (수동 확인 필요한 목록)
    card_file = DATA_DIR / "patterns_card_review.json"
    with open(card_file, "w", encoding="utf-8") as f:
        json.dump(multi_usage, f, ensure_ascii=False, indent=2)
    print(f"저장: {card_file} (수동 검토 필요)")

    # 3. 규칙 기반 패턴 (기본 템플릿)
    rules = {
        "rules": [
            {
                "id": "R001",
                "condition": {"contains": "하이패스", "cards": ["6902", "6911"]},
                "usage": "차량유지비(기타)"
            },
            {
                "id": "R002",
                "condition": {"contains": "휴대폰메시지"},
                "usage": "사용료"
            },
            {
                "id": "R003",
                "condition": {"contains": "주유소"},
                "usage": "차량유지비(주유)"
            }
        ]
    }
    rules_file = DATA_DIR / "patterns_rules.json"
    with open(rules_file, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)
    print(f"저장: {rules_file}")

    # 4. 사용용도 카테고리 목록
    all_usages = set()
    for data in single_usage.values():
        all_usages.add(data["usage"])
    for data in multi_usage.values():
        all_usages.update(data["usages"].keys())

    categories_file = DATA_DIR / "usage_categories.json"
    with open(categories_file, "w", encoding="utf-8") as f:
        json.dump(sorted(list(all_usages)), f, ensure_ascii=False, indent=2)
    print(f"저장: {categories_file}")
    print(f"\n총 사용용도 카테고리: {len(all_usages)}개")

    return single_usage, multi_usage


def create_card_specific_patterns():
    """카드별 특수 매핑 생성 (다중 용도 가맹점 분석)"""

    card_patterns = {}

    for sheet in CARD_SHEETS:
        try:
            df = pd.read_excel(MAIN_FILE, sheet_name=sheet)

            for _, row in df.iterrows():
                merchant = str(row.get("가맹점명", "")).strip()
                usage = str(row.get("사용용도", "")).strip()

                if not merchant or not usage or merchant == "nan" or usage == "nan":
                    continue

                if merchant not in card_patterns:
                    card_patterns[merchant] = {}

                # 해당 카드에서 가장 많이 사용된 용도 저장
                if sheet not in card_patterns[merchant]:
                    card_patterns[merchant][sheet] = defaultdict(int)
                card_patterns[merchant][sheet][usage] += 1

        except Exception as e:
            print(f"[{sheet}] 오류: {e}")

    # 카드별 최다 용도 추출
    final_patterns = {}
    for merchant, cards in card_patterns.items():
        if len(cards) > 1:  # 여러 카드에서 사용된 경우만
            pattern = {}
            usages_set = set()

            for card, usages in cards.items():
                top_usage = max(usages.items(), key=lambda x: x[1])[0]
                pattern[card] = top_usage
                usages_set.add(top_usage)

            # 카드별로 다른 용도가 있는 경우만 저장
            if len(usages_set) > 1:
                final_patterns[merchant] = pattern

    # 저장
    card_file = DATA_DIR / "patterns_card.json"
    with open(card_file, "w", encoding="utf-8") as f:
        json.dump(final_patterns, f, ensure_ascii=False, indent=2)
    print(f"\n카드별 특수 매핑: {len(final_patterns)}개")
    print(f"저장: {card_file}")

    return final_patterns


if __name__ == "__main__":
    print("=" * 60)
    print("칠칠기업 법인카드 패턴 추출기")
    print("=" * 60)

    # 1. 기본 패턴 추출
    single, multi = extract_patterns()

    # 2. 카드별 특수 매핑 생성
    card_specific = create_card_specific_patterns()

    print("\n" + "=" * 60)
    print("패턴 추출 완료!")
    print("=" * 60)
