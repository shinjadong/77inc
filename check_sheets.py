import pandas as pd
import json

main_file = "/home/tlswkehd/77inc/칠칠기업_법인카드.xlsx"
json_file = "/home/tlswkehd/77inc/data/usage_categories.json"

try:
    xl = pd.ExcelFile(main_file)
    print("Sheet names:", xl.sheet_names)
except Exception as e:
    print("Error reading sheets:", e)

try:
    with open(json_file, 'r') as f:
        data = json.load(f)
        print("Usage Categories Keys:", list(data.keys()) if isinstance(data, dict) else "List")
        if isinstance(data, list):
             print("First 5:", data[:5])
except Exception as e:
    print("Error reading json:", e)
