import pandas as pd
import os

MAIN_FILE = "/home/tlswkehd/77inc/칠칠기업_법인카드.xlsx"

print(f"Checking {MAIN_FILE}...")
xls = pd.ExcelFile(MAIN_FILE)
print("Sheets:", xls.sheet_names)

# Check 4985
if '4985' in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name='4985')
    print(f"\n--- Sheet 4985 ({len(df)} rows) ---")
    print("Columns:", df.columns.tolist())
    print("Last 10 rows:")
    print(df.tail(10)[['결제일자', '가맹점명', '이용금액', '사용용도']].to_string())
    
    # Check for potential duplicates
    # Group by Date, Store, Amount and count
    dups = df.groupby(['결제일자', '가맹점명', '이용금액']).size()
    dups = dups[dups > 1]
    if not dups.empty:
        print("\nWARNING: Potential duplicates found:")
        print(dups.head())
    else:
        print("\nNo exact duplicates found based on Date+Store+Amount.")

# Check Usage Filling
filled = df[df['사용용도'].notna() & (df['사용용도'] != '')]
print(f"\nRows with usage filled: {len(filled)} / {len(df)}")
