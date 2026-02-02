#!/usr/bin/env python3
"""
Fix Department column by extracting from Course_ID prefix
"""

import pandas as pd
import json

# Load the cleaned CSV
df = pd.read_csv('scripts/cleaned_courses.csv')

print(f"Total courses: {len(df)}")
print(f"Courses with missing Department: {df['Department'].isna().sum()}")

# Fill Department from Course_ID prefix (first 4 characters)
df['Department'] = df['Course_ID'].str[:4]

print(f"After fix - Courses with missing Department: {df['Department'].isna().sum()}")

# Save updated CSV
df.to_csv('scripts/cleaned_courses.csv', index=False)
print("✓ Updated cleaned_courses.csv")

# Update JSON as well
records = df.to_dict('records')

# Clean up NaN values for JSON
for record in records:
    for key, value in record.items():
        if pd.isna(value):
            record[key] = None
        elif isinstance(value, (pd.Int64Dtype, pd.Float64Dtype)):
            record[key] = float(value) if pd.isna(value) else (float(value) if isinstance(value, float) else int(value))

with open('scripts/cleaned_courses.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print("✓ Updated cleaned_courses.json")
print("\nSample departments:")
print(df['Department'].value_counts().head(10))
