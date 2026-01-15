import pandas as pd
import os

files = [
    "/home/tlswkehd/77inc/칠칠기업_법인카드.xlsx",
    "/home/tlswkehd/77inc/data/5587286_20260112110122.xls"
]

for f in files:
    print(f"\n--- Inspecting {os.path.basename(f)} ---")
    try:
        if f.endswith('.xls'):
             # Try engine='xlrd' or 'xml' if needed, or read_html
             # Often these banking files are HTML
            try:
                df = pd.read_excel(f)
            except:
                try:
                     df = pd.read_html(f)[0]
                except:
                     # sometimes they are just tab delimited
                     df = pd.read_csv(f, sep='\t')
        else:
            df = pd.read_excel(f)
            
        print("Columns (List):", list(df.columns))
        # Print first valid row to see data examples
        print("First row data:\n", df.iloc[0].to_dict())
    except Exception as e:
        print(f"Error reading {f}: {e}")
