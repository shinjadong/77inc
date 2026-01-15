import pandas as pd
import glob
import os

files = glob.glob("/home/tlswkehd/77inc/data/*.xls")
print("files:", files)

for f in files:
    try:
        try:
            df = pd.read_excel(f)
        except:
             df = pd.read_html(f)[0]
        
        # Columns often have whitespace
        df.columns = [str(c).strip() for c in df.columns]
        
        if '카드번호' in df.columns:
            # Show unique card numbers found in this file
            unique_cards = df['카드번호'].unique()
            print(f"\nFile: {os.path.basename(f)}")
            print(f"Unique Card Numbers: {unique_cards}")
            
            # Show last 4 digits for each
            for c in unique_cards:
                s = str(c).strip()
                print(f"  -> Last 4: {s.split('-')[-1] if '-' in s else s[-4:]}")
        else:
             print(f"\nFile: {os.path.basename(f)} has no '카드번호' column. Columns: {df.columns}")
             
    except Exception as e:
        print(f"Error reading {f}: {e}")

print("\n--- Main File Sheets ---")
xl = pd.ExcelFile("/home/tlswkehd/77inc/칠칠기업_법인카드.xlsx")
print(xl.sheet_names)
