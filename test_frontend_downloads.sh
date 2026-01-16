#!/bin/bash
# 프론트엔드 다운로드 기능 테스트

BASE_URL="http://localhost:3000/api/export"
OUTPUT_DIR="/home/tlswkehd/77inc/output/frontend_tests"
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "🧪 프론트엔드 다운로드 기능 테스트"
echo "=========================================="

# 1. 전체 다운로드 (cardIds=all)
echo ""
echo "1️⃣ 전체 다운로드 테스트 (cardIds=all)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=all" -o "$OUTPUT_DIR/test1_all_cards.xlsx"
if [ -f "$OUTPUT_DIR/test1_all_cards.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test1_all_cards.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test1_all_cards.xlsx')
total = sum(len(pd.read_excel(excel, sheet)) for sheet in excel.sheet_names)
print(f'   총 거래 수: {total}건')
print(f'   시트 수: {len(excel.sheet_names)}개')
"
else
    echo "❌ 파일 생성 실패"
fi

# 2. 특정 카드 다운로드 (3987, 4985)
echo ""
echo "2️⃣ 특정 카드 다운로드 (3987, 4985)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=3987,4985" -o "$OUTPUT_DIR/test2_two_cards.xlsx"
if [ -f "$OUTPUT_DIR/test2_two_cards.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test2_two_cards.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test2_two_cards.xlsx')
for sheet in excel.sheet_names:
    df = pd.read_excel(excel, sheet)
    count = len(df[df['결제일자'].notna()])
    if count > 0:
        print(f'   {sheet}: {count}건')
"
else
    echo "❌ 파일 생성 실패"
fi

# 3. 날짜 필터링 (2025년 8월)
echo ""
echo "3️⃣ 날짜 필터링 (2025년 8월)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=all&dateFrom=2025-08-01&dateTo=2025-08-31" -o "$OUTPUT_DIR/test3_august.xlsx"
if [ -f "$OUTPUT_DIR/test3_august.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test3_august.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test3_august.xlsx')
total = 0
for sheet in excel.sheet_names:
    df = pd.read_excel(excel, sheet)
    count = len(df[df['결제일자'].notna()])
    total += count
print(f'   8월 거래 수: {total}건')
"
else
    echo "❌ 파일 생성 실패"
fi

# 4. 매칭 상태 필터링 (수동매칭만)
echo ""
echo "4️⃣ 매칭 상태 필터링 (수동매칭)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=all&matchStatus=manual" -o "$OUTPUT_DIR/test4_manual.xlsx"
if [ -f "$OUTPUT_DIR/test4_manual.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test4_manual.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test4_manual.xlsx')
total = 0
for sheet in excel.sheet_names:
    df = pd.read_excel(excel, sheet)
    count = len(df[df['결제일자'].notna()])
    total += count
print(f'   수동매칭 거래 수: {total}건')
print(f'   예상: 454건')
"
else
    echo "❌ 파일 생성 실패"
fi

# 5. 복합 필터링 (특정 카드 + 날짜 + 상태)
echo ""
echo "5️⃣ 복합 필터링 (카드3987 + 7월 + 자동매칭)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=3987&dateFrom=2025-07-01&dateTo=2025-07-31&matchStatus=auto" \
     -o "$OUTPUT_DIR/test5_complex.xlsx"
if [ -f "$OUTPUT_DIR/test5_complex.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test5_complex.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test5_complex.xlsx')
for sheet in excel.sheet_names:
    df = pd.read_excel(excel, sheet)
    count = len(df[df['결제일자'].notna()])
    if count > 0:
        print(f'   {sheet}: {count}건')
"
else
    echo "❌ 파일 생성 실패"
fi

# 6. 하이패스 카드만
echo ""
echo "6️⃣ 하이패스 카드 전용 (6902, 6911)"
echo "------------------------------------------"
curl -s "$BASE_URL?cardIds=6902,6911" -o "$OUTPUT_DIR/test6_hipass.xlsx"
if [ -f "$OUTPUT_DIR/test6_hipass.xlsx" ]; then
    SIZE=$(ls -lh "$OUTPUT_DIR/test6_hipass.xlsx" | awk '{print $5}')
    echo "✅ 파일 생성됨: $SIZE"
    python3 -c "
import pandas as pd
excel = pd.ExcelFile('$OUTPUT_DIR/test6_hipass.xlsx')
total = 0
for sheet in excel.sheet_names:
    df = pd.read_excel(excel, sheet)
    count = len(df[df['결제일자'].notna()])
    if count > 0:
        print(f'   {sheet}: {count}건')
        total += count
print(f'   합계: {total}건 (예상: 65건)')
"
else
    echo "❌ 파일 생성 실패"
fi

echo ""
echo "=========================================="
echo "✅ 모든 테스트 완료"
echo "=========================================="
echo "생성된 파일: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
