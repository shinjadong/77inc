import pandas as pd
import os
import glob
from datetime import datetime

MAIN_FILE = "/home/tlswkehd/77inc/칠칠기업_법인카드.xlsx"
DATA_DIR = "/home/tlswkehd/77inc/data"

def normalize_store_name(name):
    if not isinstance(name, str):
        return ""
    return name.strip()

def load_usage_map(excel_path):
    usage_map = {} # {StoreName: Usage}
    try:
        xls = pd.ExcelFile(excel_path)
        for sheet in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet)
            df.columns = [c.strip() for c in df.columns]
            
            if '가맹점명' in df.columns and '사용용도' in df.columns:
                for _, row in df.iterrows():
                    store = normalize_store_name(row['가맹점명'])
                    usage = row['사용용도']
                    if store and pd.notna(usage) and str(usage).strip():
                        usage_map[store] = str(usage).strip()
    except Exception as e:
        print(f"Warning: Could not read existing usage map completely: {e}")
    return usage_map

def process_file_content(file_path):
    """
    Reads file, returns DataFrame with Normalized Columns:
    ['CardNum', 'Date', 'Store', 'Amount']
    """
    try:
        df = pd.read_excel(file_path)
    except:
        try:
            df = pd.read_html(file_path)[0]
        except:
            df = pd.read_csv(file_path, sep='\t')

    # Normalize columns
    df.columns = [str(c).strip() for c in df.columns]
    
    if '카드번호' not in df.columns:
        print(f"Skipping {os.path.basename(file_path)}: '카드번호' column missing.")
        return pd.DataFrame()
    
    processed_rows = []
    
    for _, row in df.iterrows():
        # Validate essential fields
        if pd.isna(row['승인일자']) or pd.isna(row.get('카드번호')):
            continue

        # Extract Card Last 4
        full_card = str(row['카드번호']).strip()
        card_last_4 = full_card.split('-')[-1] if '-' in full_card else full_card[-4:]
        
        store_name = normalize_store_name(row['가맹점명'])
        
        # Clean amount
        amount_raw = row['거래금액(원화)']
        if isinstance(amount_raw, str):
            amount_raw = amount_raw.replace(',', '').strip()
        try:
            amount = float(amount_raw)
        except:
            amount = 0.0
            
        processed_rows.append({
            'CardNum': card_last_4,
            '결제일자': pd.to_datetime(row['승인일자'], errors='coerce'), 
            '가맹점명': store_name,
            '이용금액': amount,
            '사용용도': ''
        })
        
    return pd.DataFrame(processed_rows)

def main():
    print("Loading usage map...")
    usage_map = load_usage_map(MAIN_FILE)
    print(f"Loaded {len(usage_map)} existing usage patterns.")
    
    # Load Main Workbook
    all_sheets = {}
    try:
        xls = pd.ExcelFile(MAIN_FILE)
        for sheet in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet)
            df.columns = [c.strip() for c in df.columns]
            # Ensure date column type for existing data
            if '결제일자' in df.columns:
                 df['결제일자'] = pd.to_datetime(df['결제일자'], errors='coerce')
            all_sheets[sheet] = df
    except FileNotFoundError:
        print("Main file not found, will be created.")

    input_files = glob.glob(os.path.join(DATA_DIR, "*.xls"))
    print(f"Found {len(input_files)} input files.")
    
    # Collect all new transactions first
    all_new_transactions = []
    for f in input_files:
        print(f"Reading {os.path.basename(f)}...")
        df = process_file_content(f)
        if not df.empty:
            all_new_transactions.append(df)
            
    if not all_new_transactions:
        print("No new transactions found.")
        return

    combined_new = pd.concat(all_new_transactions, ignore_index=True)
    print(f"Total new transactions read: {len(combined_new)}")

    # Group by CardNum
    for card_num, group_df in combined_new.groupby('CardNum'):
        target_sheet = str(card_num)
        print(f"\nProcessing Card {target_sheet} ({len(group_df)} rows)...")
        
        # Prepare rows to merge (drop CardNum col as it's implicit in sheet)
        # Columns needed: ['결제일자', '가맹점명', '이용금액', '사용용도']
        new_data = group_df[['결제일자', '가맹점명', '이용금액']].copy()
        new_data['사용용도'] = '' # Initialize
        
        if target_sheet in all_sheets:
            current_df = all_sheets[target_sheet]
            print(f"  -> Merging with existing sheet '{target_sheet}' ({len(current_df)} rows)")
            
            # Signature set for dedup
            existing_sigs = set()
            for _, row in current_df.iterrows():
                d = row['결제일자'] # Timestamp
                s = normalize_store_name(row['가맹점명'])
                try:
                    a = float(row['이용금액'])
                except:
                    a = 0.0
                
                # Also handle Date being NaT for signature
                if pd.isna(d):
                    continue # Skip invalid row signatures
                
                existing_sigs.add((d, s, a))
                
            rows_to_add = []
            for _, row in new_data.iterrows():
                d = row['결제일자']
                s = normalize_store_name(row['가맹점명'])
                a = float(row['이용금액'])
                
                if (d, s, a) not in existing_sigs:
                    # Auto classification
                    if s in usage_map:
                        row['사용용도'] = usage_map[s]
                    rows_to_add.append(row)
            
            if rows_to_add:
                to_append = pd.DataFrame(rows_to_add)
                merged = pd.concat([current_df, to_append], ignore_index=True)
                merged = merged.sort_values(by='결제일자')
                all_sheets[target_sheet] = merged
                print(f"  -> Added {len(rows_to_add)} new rows.")
            else:
                print("  -> No new unique rows.")
        else:
            print(f"  -> Creating new sheet '{target_sheet}'")
            # Auto classification
            for idx, row in new_data.iterrows():
                s = normalize_store_name(row['가맹점명'])
                if s in usage_map:
                    new_data.at[idx, '사용용도'] = usage_map[s]
            
            new_data = new_data.sort_values(by='결제일자')
            all_sheets[target_sheet] = new_data

    # Save
    print("\nSaving updated file...")
    with pd.ExcelWriter(MAIN_FILE, engine='openpyxl') as writer:
        for sheet_name, df in all_sheets.items():
            # Format dates to exclude time component in Excel output if desired, 
            # but standard datetime write is fine.
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    print("Done!")

if __name__ == "__main__":
    main()
