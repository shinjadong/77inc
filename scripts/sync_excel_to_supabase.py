"""
칠칠기업_법인카드.xlsx → Supabase 동기화 스크립트
"""
import pandas as pd
from supabase import create_client
from datetime import datetime

# Supabase 설정
SUPABASE_URL = "https://kxcvsgecefbzoiczyxsp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ZzZ2VjZWZiem9pY3p5eHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzcwNDgsImV4cCI6MjA4MzgxMzA0OH0.LpzRg_uzhauq-eyp1iNEVyM37wZxU2LmOUt6OAgwUBI"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 카드번호 → card_id 매핑
CARD_ID_MAP = {
    '3987': 1,
    '4985': 2,
    '6902': 3,
    '6974': 4,
    '9980': 5,
    '6911': 6
}

def sync_data():
    """Excel 데이터를 Supabase에 동기화"""
    xlsx = pd.ExcelFile('칠칠기업_법인카드.xlsx')

    stats = {'total': 0, 'inserted': 0, 'skipped': 0, 'errors': 0}

    for sheet_name in ['3987', '4985', '6902', '6974', '9980', '6911']:
        if sheet_name not in xlsx.sheet_names:
            print(f"시트 {sheet_name} 없음, 스킵")
            continue

        df = pd.read_excel(xlsx, sheet_name=sheet_name)
        card_id = CARD_ID_MAP[sheet_name]

        print(f"\n=== {sheet_name} 시트 처리 중 ({len(df)}건) ===")

        for idx, row in df.iterrows():
            stats['total'] += 1

            try:
                # 날짜 파싱
                date_val = row['결제일자']
                if pd.isna(date_val):
                    stats['skipped'] += 1
                    continue

                if isinstance(date_val, datetime):
                    date_str = date_val.strftime('%Y-%m-%d')
                else:
                    date_str = pd.to_datetime(date_val).strftime('%Y-%m-%d')

                # 가맹점명
                merchant = str(row['가맹점명']).strip()
                if not merchant or merchant == 'nan':
                    stats['skipped'] += 1
                    continue

                # 금액
                amount = int(float(row['이용금액'])) if pd.notna(row['이용금액']) else 0

                # 사용용도
                usage = str(row['사용용도']).strip() if pd.notna(row['사용용도']) else None
                if usage == 'nan':
                    usage = None

                # 중복 확인
                existing = supabase.table('transactions').select('id').eq(
                    'card_id', card_id
                ).eq(
                    'transaction_date', date_str
                ).eq(
                    'merchant_name', merchant
                ).eq(
                    'amount', amount
                ).execute()

                if existing.data:
                    # 이미 존재하면 usage_description만 업데이트
                    if usage:
                        supabase.table('transactions').update({
                            'usage_description': usage,
                            'match_status': 'manual'
                        }).eq('id', existing.data[0]['id']).execute()
                    stats['skipped'] += 1
                    continue

                # 새 거래 삽입
                supabase.table('transactions').insert({
                    'card_id': card_id,
                    'transaction_date': date_str,
                    'merchant_name': merchant,
                    'amount': amount,
                    'usage_description': usage,
                    'match_status': 'manual' if usage else 'pending',
                    'session_id': None,
                }).execute()

                stats['inserted'] += 1

                if stats['inserted'] % 50 == 0:
                    print(f"  진행: {stats['inserted']}건 삽입됨")

            except Exception as e:
                stats['errors'] += 1
                print(f"  오류 (행 {idx}): {e}")

    return stats

if __name__ == '__main__':
    print("=== 칠칠기업 법인카드 데이터 동기화 시작 ===")
    print(f"Excel 파일: 칠칠기업_법인카드.xlsx")
    print(f"Supabase: {SUPABASE_URL}")
    print()

    stats = sync_data()

    print("\n=== 동기화 완료 ===")
    print(f"총 처리: {stats['total']}건")
    print(f"삽입: {stats['inserted']}건")
    print(f"스킵(중복): {stats['skipped']}건")
    print(f"오류: {stats['errors']}건")
