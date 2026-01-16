#!/usr/bin/env python3
"""
데이터 무결성 검증 스크립트
- 전체 거래 수 확인 (712건 예상)
- 하이패스 카드 분포 검증
- 카드별 거래 통계
"""
from supabase import create_client, Client

# Supabase 설정
SUPABASE_URL = "https://kxcvsgecefbzoiczyxsp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ZzZ2VjZWZiem9pY3p5eHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzcwNDgsImV4cCI6MjA4MzgxMzA0OH0.LpzRg_uzhauq-eyp1iNEVyM37wZxU2LmOUt6OAgwUBI"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("="*80)
    print("🔍 데이터 무결성 검증")
    print("="*80)

    # 1. 전체 거래 수 확인
    print("\n1️⃣ 전체 거래 수 확인")
    print("-"*80)

    response = supabase.table('transactions').select('id', count='exact').execute()
    total_count = response.count
    print(f"전체 거래 수: {total_count}건")

    if total_count == 712:
        print("✅ 예상 거래 수(712건)와 일치합니다.")
    else:
        print(f"⚠️  예상 거래 수(712건)와 다릅니다. 차이: {total_count - 712}건")

    # 2. 카드별 하이패스 분포 검증
    print("\n2️⃣ 카드별 하이패스 거래 분포")
    print("-"*80)

    # 모든 거래 가져오기
    response = supabase.table('transactions').select(
        'merchant_name, cards(card_number, card_name)'
    ).execute()

    transactions = response.data

    # 카드별로 집계
    card_stats = {}
    for tx in transactions:
        card_info = tx.get('cards', {})
        if not card_info:
            continue

        card_number = card_info.get('card_number', '')
        card_name = card_info.get('card_name', '')
        merchant_name = tx.get('merchant_name', '')

        if card_number not in card_stats:
            card_stats[card_number] = {
                'card_name': card_name,
                'total': 0,
                'hipass': 0
            }

        card_stats[card_number]['total'] += 1

        # 하이패스 거래 확인
        if '하이패스' in merchant_name or 'HIPASS' in merchant_name.upper():
            card_stats[card_number]['hipass'] += 1

    # 결과 출력
    print(f"{'카드번호':<8} {'카드명':<15} {'전체':<8} {'하이패스':<8} {'비율':<10} {'상태':<10}")
    print("-"*80)

    critical_cards = {
        '6902': {'expected_pct': 100, 'name': '하이패스1'},
        '6911': {'expected_pct': 100, 'name': '하이패스2'},
        '6974': {'expected_pct': 0, 'name': '노혜경'},
        '9980': {'expected_pct': 0, 'name': '공용카드'}
    }

    all_passed = True

    for card_number in sorted(card_stats.keys()):
        stats = card_stats[card_number]
        total = stats['total']
        hipass = stats['hipass']
        pct = (hipass / total * 100) if total > 0 else 0

        # 검증 상태
        status = ""
        if card_number in critical_cards:
            expected = critical_cards[card_number]['expected_pct']
            if pct == expected:
                status = "✅ PASS"
            else:
                status = f"❌ FAIL (예상: {expected}%)"
                all_passed = False

        print(f"{card_number:<8} {stats['card_name']:<15} {total:<8} {hipass:<8} {pct:>6.1f}% {status:<10}")

    # 3. 최종 결과
    print("\n" + "="*80)
    print("📊 검증 결과 요약")
    print("="*80)

    print(f"\n전체 거래 수: {total_count}건 {'✅' if total_count == 712 else '⚠️ '}")

    print("\n필수 검증 항목:")
    for card_num, info in critical_cards.items():
        if card_num in card_stats:
            stats = card_stats[card_num]
            pct = (stats['hipass'] / stats['total'] * 100) if stats['total'] > 0 else 0
            expected = info['expected_pct']
            passed = pct == expected

            print(f"  - 카드 {card_num} ({info['name']}): {pct:.1f}% 하이패스 "
                  f"{'✅ PASS' if passed else f'❌ FAIL (예상: {expected}%)'}")
        else:
            print(f"  - 카드 {card_num} ({info['name']}): ❌ 데이터 없음")
            all_passed = False

    print("\n" + "="*80)
    if all_passed:
        print("🎉 모든 검증 통과! 데이터 무결성이 확인되었습니다.")
    else:
        print("⚠️  일부 검증 실패. 데이터를 확인해주세요.")
    print("="*80)

if __name__ == "__main__":
    main()
