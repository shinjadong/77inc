#!/usr/bin/env python3
"""
Python 스크립트와 API route 출력 비교
"""
import pandas as pd
import os

# 파일 경로
PYTHON_OUTPUT = '/home/tlswkehd/77inc/output/칠칠기업_법인카드_20260116_174134.xlsx'
API_OUTPUT = '/home/tlswkehd/77inc/output/api_test_output.xlsx'

CARD_ORDER = ['3987', '4985', '6902', '6974', '9980', '6911', '0981', '9904']

def compare_excel_files():
    print("="*80)
    print("📊 Excel 파일 비교: Python vs API Route")
    print("="*80)

    # 파일 존재 확인
    if not os.path.exists(PYTHON_OUTPUT):
        print(f"❌ Python 출력 파일이 없습니다: {PYTHON_OUTPUT}")
        return

    if not os.path.exists(API_OUTPUT):
        print(f"❌ API 출력 파일이 없습니다: {API_OUTPUT}")
        return

    print(f"\n✅ 두 파일 모두 존재합니다.")
    print(f"  - Python: {os.path.getsize(PYTHON_OUTPUT):,} bytes")
    print(f"  - API:    {os.path.getsize(API_OUTPUT):,} bytes")

    # 시트별 비교
    print(f"\n{'카드':<8} {'Python':<10} {'API':<10} {'차이':<10} {'상태':<10}")
    print("-"*80)

    all_match = True
    total_python = 0
    total_api = 0

    for card_number in CARD_ORDER:
        try:
            # Python 출력 읽기
            df_python = pd.read_excel(PYTHON_OUTPUT, sheet_name=card_number)
            python_count = len(df_python)
            total_python += python_count
        except Exception as e:
            python_count = 0
            print(f"{card_number:<8} {'N/A':<10} ", end="")

        try:
            # API 출력 읽기
            df_api = pd.read_excel(API_OUTPUT, sheet_name=card_number)
            api_count = len(df_api)
            total_api += api_count
        except Exception as e:
            api_count = 0
            if python_count > 0:
                print(f"{'N/A':<10} {'':<10} ❌ FAIL")
                all_match = False
            continue

        # 비교
        diff = api_count - python_count
        status = "✅ PASS" if diff == 0 else "⚠️  DIFF"

        if diff != 0:
            all_match = False

        diff_str = f"{diff:+d}" if diff != 0 else "0"
        print(f"{card_number:<8} {python_count:<10} {api_count:<10} {diff_str:<10} {status:<10}")

    # 전체 합계
    print("-"*80)
    total_diff = total_api - total_python
    total_status = "✅ PASS" if total_diff == 0 else "⚠️  DIFF"
    total_diff_str = f"{total_diff:+d}" if total_diff != 0 else "0"

    print(f"{'합계':<8} {total_python:<10} {total_api:<10} {total_diff_str:<10} {total_status:<10}")

    # 데이터 내용 비교 (첫 번째 카드로 샘플 확인)
    print("\n" + "="*80)
    print("🔍 데이터 내용 샘플 비교 (카드 3987)")
    print("="*80)

    try:
        df_python = pd.read_excel(PYTHON_OUTPUT, sheet_name='3987').head(3)
        df_api = pd.read_excel(API_OUTPUT, sheet_name='3987').head(3)

        print("\nPython 출력 (첫 3행):")
        print(df_python.to_string(index=False))

        print("\nAPI 출력 (첫 3행):")
        print(df_api.to_string(index=False))

        # 컬럼 비교
        python_cols = set(df_python.columns)
        api_cols = set(df_api.columns)

        if python_cols == api_cols:
            print(f"\n✅ 컬럼명 일치: {list(df_python.columns)}")
        else:
            print(f"\n⚠️  컬럼명 불일치:")
            print(f"  Python: {list(df_python.columns)}")
            print(f"  API:    {list(df_api.columns)}")

    except Exception as e:
        print(f"\n❌ 샘플 비교 실패: {e}")

    # 최종 결과
    print("\n" + "="*80)
    print("📊 최종 결과")
    print("="*80)

    print(f"\n전체 거래 수:")
    print(f"  - Python: {total_python}건")
    print(f"  - API:    {total_api}건")
    print(f"  - 차이:   {total_diff_str}건")

    if all_match and total_diff == 0:
        print("\n🎉 완벽히 일치합니다! API route가 정상적으로 작동합니다.")
    else:
        print("\n⚠️  일부 차이가 있습니다. 자세한 내용을 확인해주세요.")

    print("="*80)

if __name__ == "__main__":
    compare_excel_files()
