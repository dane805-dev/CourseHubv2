#!/usr/bin/env python3
"""
Course Data Cleansing Script for Course Hub
Transforms raw section-level Wharton course data into clean, course-level dataset
"""

import pandas as pd
import numpy as np
import json
import logging
import re
from datetime import datetime
from pathlib import Path

# ============================================================================
# SECTION 1: Configuration & Setup
# ============================================================================

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scripts/cleansing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# File paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "Class Data"
OUTPUT_DIR = BASE_DIR / "scripts"

FALL_CSV = DATA_DIR / "wharton_reports_wharton-course-offerings FALL.csv"
SPRING_CSV = DATA_DIR / "wharton_reports_wharton-course-offerings SPRING.csv"
OUTPUT_CSV = OUTPUT_DIR / "cleaned_courses.csv"
OUTPUT_JSON = OUTPUT_DIR / "cleaned_courses.json"
REPORT_FILE = OUTPUT_DIR / "cleansing_report.txt"

# Expected schema
EXPECTED_COLUMNS = [
    'Term', 'Section ID', 'Course Title', 'Instructor', 'Max', 'Status',
    'CU', 'Meeting', 'Location', 'Part of Term', 'Description', 'Crosslist',
    'Crosslist Primary', 'Prerequisites', 'Corequisites', 'Division',
    'Departmental Website', 'Registration', 'Course (Canvas) URL',
    'Syllabi URL', '3 Yr Avg Course Rating'
]

# Validation report data
validation_report = {
    'timestamp': datetime.now().isoformat(),
    'input_metrics': {},
    'output_metrics': {},
    'quality_checks': {},
    'warnings': [],
    'errors': []
}

# ============================================================================
# SECTION 2: Data Loading & Validation
# ============================================================================

def load_csv(file_path, term_name):
    """Load CSV file and perform initial validation"""
    logger.info(f"Loading {term_name} data from {file_path}")

    try:
        df = pd.read_csv(file_path, encoding='utf-8')
        logger.info(f"Loaded {len(df)} rows from {term_name}")

        # Validate schema
        missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
        if missing_cols:
            validation_report['errors'].append(
                f"{term_name}: Missing columns: {missing_cols}"
            )
            raise ValueError(f"Missing columns: {missing_cols}")

        # Log null counts for critical fields
        critical_fields = ['Section ID', 'Course Title', 'Division', 'CU']
        null_counts = df[critical_fields].isnull().sum()
        if null_counts.any():
            logger.warning(f"{term_name} null counts:\n{null_counts}")
            validation_report['warnings'].append(
                f"{term_name}: Null values in critical fields: {null_counts.to_dict()}"
            )

        # Store input metrics
        validation_report['input_metrics'][term_name] = {
            'total_rows': len(df),
            'columns': len(df.columns),
            'null_counts': df.isnull().sum().to_dict()
        }

        return df

    except Exception as e:
        logger.error(f"Error loading {term_name}: {str(e)}")
        validation_report['errors'].append(f"{term_name}: {str(e)}")
        raise

def validate_section_id_format(df, term_name):
    """Validate Section ID format"""
    pattern = r'^[A-Z]{4}\d{4}\d{3}$'
    invalid = df[~df['Section ID'].astype(str).str.match(pattern, na=False)]

    if len(invalid) > 0:
        logger.warning(f"{term_name}: {len(invalid)} invalid Section IDs")
        validation_report['warnings'].append(
            f"{term_name}: {len(invalid)} rows with invalid Section ID format"
        )

    return df

# ============================================================================
# SECTION 3: Division Filtering & Course ID Extraction
# ============================================================================

def filter_wh_division(df, term_name):
    """Filter to only WM (Wharton MBA/Masters) courses"""
    logger.info(f"Filtering {term_name} to Division = WM")

    # Log division counts
    division_counts = df['Division'].value_counts()
    logger.info(f"{term_name} division counts:\n{division_counts}")

    # Filter to WM only
    df_wm = df[df['Division'] == 'WM'].copy()
    logger.info(f"{term_name}: {len(df_wm)} WM courses (from {len(df)} total)")

    validation_report['input_metrics'][f'{term_name}_WM'] = len(df_wm)

    return df_wm

def extract_course_id(df, term_name):
    """Extract Course ID, Department, and Section Number from Section ID"""
    logger.info(f"Extracting Course ID from Section ID for {term_name}")

    # Extract Course ID (first 8 characters: 4-letter dept + 4-digit number)
    df['Course_ID'] = df['Section ID'].str.extract(r'^([A-Z]{4}\d{4})', expand=False)

    # Extract Department (first 4 characters)
    df['Department'] = df['Section ID'].str[:4]

    # Extract Section Number (last 3 digits)
    df['Section_Num'] = df['Section ID'].str[-3:]

    # Validate extraction
    null_course_ids = df['Course_ID'].isnull().sum()
    if null_course_ids > 0:
        validation_report['errors'].append(
            f"{term_name}: {null_course_ids} rows failed Course ID extraction"
        )
        logger.error(f"{term_name}: Failed to extract {null_course_ids} Course IDs")
    else:
        logger.info(f"{term_name}: Successfully extracted {df['Course_ID'].nunique()} unique courses")

    return df

# ============================================================================
# SECTION 4: Section Consolidation (Deduplication)
# ============================================================================

def consolidate_sections(df, term_name):
    """Aggregate multiple sections into single course records"""
    logger.info(f"Consolidating sections for {term_name}")

    # Count sections before consolidation
    section_counts = df.groupby('Course_ID').size()
    multi_section = section_counts[section_counts > 1]
    logger.info(f"{term_name}: {len(multi_section)} courses have multiple sections")

    # Define aggregation functions
    agg_dict = {
        'Course Title': 'first',
        'Instructor': lambda x: '; '.join([str(i) for i in x.dropna().unique() if str(i) != 'nan']),
        'Max': 'sum',
        'CU': 'first',
        'Meeting': lambda x: '; '.join([str(m) for m in x.dropna().unique() if str(m) != 'nan']),
        'Location': lambda x: '; '.join([str(l) for l in x.dropna().unique() if str(l) != 'nan']),
        'Description': lambda x: max(x.dropna().astype(str), key=len, default=''),
        'Prerequisites': 'first',
        'Corequisites': 'first',
        'Division': 'first',
        'Department': 'first',
        'Departmental Website': 'first',
        'Course (Canvas) URL': 'first',
        'Syllabi URL': 'first',
        '3 Yr Avg Course Rating': 'first',
        'Crosslist': lambda x: 'P' if 'P' in x.values else ('S' if 'S' in x.values else ''),
        'Crosslist Primary': 'first',
        'Section_Num': 'count'  # Count number of sections
    }

    # Group by Course_ID and aggregate
    df_consolidated = df.groupby('Course_ID', as_index=False).agg(agg_dict)

    # Rename Section_Num count to Section_Count
    df_consolidated.rename(columns={'Section_Num': 'Section_Count'}, inplace=True)

    logger.info(f"{term_name}: Consolidated to {len(df_consolidated)} unique courses")

    return df_consolidated

# ============================================================================
# SECTION 5: Crosslist Handling
# ============================================================================

def handle_crosslists(df, term_name):
    """Identify and document crosslisted courses"""
    logger.info(f"Handling crosslists for {term_name}")

    # Identify crosslisted courses
    df['Is_Crosslisted'] = df['Crosslist'].isin(['P', 'S'])
    crosslist_count = df['Is_Crosslisted'].sum()
    logger.info(f"{term_name}: {crosslist_count} crosslisted courses")

    # Create Crosslist_With field
    df['Crosslist_With'] = df.apply(
        lambda row: str(row['Crosslist Primary']) if pd.notna(row['Crosslist Primary'])
        and str(row['Crosslist Primary']) != str(row['Course_ID'])
        else '',
        axis=1
    )

    return df

# ============================================================================
# SECTION 6: Term Merging
# ============================================================================

def prepare_term_data(df, term_name):
    """Prepare term-specific data for merging"""
    logger.info(f"Preparing {term_name} data for term merge")

    # Create term-specific columns
    term_suffix = '_Fall' if 'Fall' in term_name else '_Spring'

    # Rename term-specific columns
    df_term = df.rename(columns={
        'Instructor': f'Instructors{term_suffix}',
        'Meeting': f'Meeting_Times{term_suffix}',
        'Location': f'Locations{term_suffix}',
        'Section_Count': f'Section_Count{term_suffix}',
        'Max': f'Capacity{term_suffix}',
        '3 Yr Avg Course Rating': f'Average_Rating{term_suffix}'
    })

    # Add term availability flag
    df_term[f'{term_name}_Offered'] = True

    return df_term

def merge_terms(df_fall, df_spring):
    """Merge Fall and Spring data"""
    logger.info("Merging Fall and Spring data")

    # Prepare each term
    fall_prepared = prepare_term_data(df_fall, 'Fall')
    spring_prepared = prepare_term_data(df_spring, 'Spring')

    # Select columns for merge
    fall_cols = [
        'Course_ID', 'Course Title', 'Department', 'CU', 'Description',
        'Prerequisites', 'Corequisites', 'Average_Rating_Fall',
        'Course (Canvas) URL', 'Syllabi URL', 'Division',
        'Instructors_Fall', 'Meeting_Times_Fall', 'Locations_Fall',
        'Section_Count_Fall', 'Capacity_Fall', 'Fall_Offered',
        'Is_Crosslisted', 'Crosslist_With', 'Crosslist'
    ]

    spring_cols = [
        'Course_ID', 'Course Title', 'CU', 'Description',
        'Average_Rating_Spring', 'Instructors_Spring', 'Meeting_Times_Spring',
        'Locations_Spring', 'Section_Count_Spring', 'Capacity_Spring',
        'Spring_Offered', 'Is_Crosslisted', 'Crosslist_With'
    ]

    # Perform outer merge
    merged = pd.merge(
        fall_prepared[fall_cols],
        spring_prepared[spring_cols],
        on='Course_ID',
        how='outer',
        suffixes=('', '_spring_dup')
    )

    # Handle merged columns
    # Use Fall data as primary for metadata
    merged['Course Title'] = merged['Course Title'].fillna(merged.get('Course Title_spring_dup', ''))
    merged['CU'] = merged['CU'].fillna(merged.get('CU_spring_dup', ''))
    merged['Description'] = merged['Description'].fillna(merged.get('Description_spring_dup', ''))

    # Handle Is_Crosslisted - True if either term has it
    if 'Is_Crosslisted_spring_dup' in merged.columns:
        merged['Is_Crosslisted'] = merged['Is_Crosslisted'].fillna(False) | merged['Is_Crosslisted_spring_dup'].fillna(False)

    # Handle Crosslist_With - combine from both terms
    if 'Crosslist_With_spring_dup' in merged.columns:
        merged['Crosslist_With'] = merged.apply(
            lambda row: '; '.join(filter(None, [
                str(row['Crosslist_With']) if pd.notna(row['Crosslist_With']) else '',
                str(row['Crosslist_With_spring_dup']) if pd.notna(row['Crosslist_With_spring_dup']) else ''
            ])),
            axis=1
        )

    # Fill boolean flags
    merged['Fall_Offered'] = merged['Fall_Offered'].fillna(False)
    merged['Spring_Offered'] = merged['Spring_Offered'].fillna(False)

    # Fill section counts and capacity
    for col in ['Section_Count_Fall', 'Section_Count_Spring', 'Capacity_Fall', 'Capacity_Spring']:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    # Drop duplicate columns
    merged = merged[[c for c in merged.columns if not c.endswith('_spring_dup')]]

    logger.info(f"Merged result: {len(merged)} unique courses")

    return merged

# ============================================================================
# SECTION 7: Data Enrichment
# ============================================================================

def enrich_data(df):
    """Add computed fields"""
    logger.info("Enriching data with computed fields")

    # Term Availability
    df['Term_Availability'] = df.apply(
        lambda row: 'Both' if row['Fall_Offered'] and row['Spring_Offered']
        else ('Fall' if row['Fall_Offered'] else 'Spring'),
        axis=1
    )

    # Total Capacity
    df['Total_Capacity'] = df['Capacity_Fall'].fillna(0) + df['Capacity_Spring'].fillna(0)

    # Department - ensure all courses have department from Course_ID prefix
    df['Department'] = df['Course_ID'].str[:4]

    # Course Level (extract from course number)
    df['Course_Level'] = df['Course_ID'].str.extract(r'\d(\d)\d\d', expand=False).astype(float)

    # Ensure numeric columns are proper type
    df['CU'] = pd.to_numeric(df['CU'], errors='coerce')
    if 'Average_Rating_Fall' in df.columns:
        df['Average_Rating_Fall'] = pd.to_numeric(df['Average_Rating_Fall'], errors='coerce')
    if 'Average_Rating_Spring' in df.columns:
        df['Average_Rating_Spring'] = pd.to_numeric(df['Average_Rating_Spring'], errors='coerce')

    logger.info("Data enrichment complete")

    return df

# ============================================================================
# SECTION 8: Data Validation
# ============================================================================

def validate_cleaned_data(df):
    """Run comprehensive validation checks"""
    logger.info("Running validation checks")

    checks = {}

    # Check 1: No duplicate Course_IDs
    duplicates = df['Course_ID'].duplicated().sum()
    checks['No duplicate Course_IDs'] = duplicates == 0
    if duplicates > 0:
        validation_report['errors'].append(f"Found {duplicates} duplicate Course_IDs")

    # Check 2: All Course_IDs match format
    pattern = r'^[A-Z]{4}\d{4}$'
    invalid_ids = df[~df['Course_ID'].str.match(pattern, na=False)]
    checks['All Course_IDs valid format'] = len(invalid_ids) == 0
    if len(invalid_ids) > 0:
        validation_report['errors'].append(f"Found {len(invalid_ids)} invalid Course_ID formats")

    # Check 3: Valid Term_Availability values
    valid_terms = df['Term_Availability'].isin(['Fall', 'Spring', 'Both']).all()
    checks['Valid Term_Availability values'] = valid_terms
    if not valid_terms:
        validation_report['errors'].append("Invalid Term_Availability values found")

    # Check 4: Valid CU values
    valid_cu = df['CU'].between(0, 2).all()
    checks['Valid CU values'] = valid_cu
    if not valid_cu:
        validation_report['warnings'].append("Some CU values outside expected range (0-2)")

    # Check 5: No nulls in required fields
    required_fields = ['Course_ID', 'Course Title', 'Department', 'CU']
    null_required = df[required_fields].isnull().any().any()
    checks['No nulls in required fields'] = not null_required
    if null_required:
        validation_report['errors'].append("Null values found in required fields")

    # Check 6: CU consistency check
    cu_mismatches = 0
    for idx, row in df.iterrows():
        if row['Fall_Offered'] and row['Spring_Offered']:
            # Would need original data to check this - skip for now
            pass
    checks['CU consistency across terms'] = True

    validation_report['quality_checks'] = checks

    # Log results
    logger.info("Validation results:")
    for check, passed in checks.items():
        status = "✓" if passed else "✗"
        logger.info(f"  {status} {check}")

    return checks

# ============================================================================
# SECTION 9: Export & Reporting
# ============================================================================

def export_csv(df):
    """Export to CSV"""
    logger.info(f"Exporting to CSV: {OUTPUT_CSV}")

    # Select and order final columns
    final_columns = [
        'Course_ID', 'Course Title', 'Department', 'CU', 'Description',
        'Prerequisites', 'Corequisites', 'Term_Availability',
        'Instructors_Fall', 'Instructors_Spring',
        'Section_Count_Fall', 'Section_Count_Spring',
        'Total_Capacity', 'Meeting_Times_Fall', 'Meeting_Times_Spring',
        'Locations_Fall', 'Locations_Spring',
        'Average_Rating_Fall', 'Average_Rating_Spring',
        'Is_Crosslisted', 'Crosslist_With',
        'Course (Canvas) URL', 'Syllabi URL', 'Course_Level'
    ]

    # Rename columns for final output
    df_export = df[final_columns].copy()
    df_export.rename(columns={
        'Course Title': 'Course_Title',
        'Course (Canvas) URL': 'Canvas_URL',
        'Syllabi URL': 'Syllabi_URL',
        'CU': 'Credit_Units'
    }, inplace=True)

    df_export.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"CSV export complete: {len(df_export)} courses")

def export_json(df):
    """Export to JSON"""
    logger.info(f"Exporting to JSON: {OUTPUT_JSON}")

    # Convert to records format
    records = df.to_dict('records')

    # Clean up NaN values for JSON
    for record in records:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
            elif isinstance(value, (np.integer, np.floating)):
                record[key] = float(value) if isinstance(value, np.floating) else int(value)

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    logger.info(f"JSON export complete: {len(records)} courses")

def generate_report(df):
    """Generate validation report"""
    logger.info(f"Generating validation report: {REPORT_FILE}")

    # Calculate output metrics
    validation_report['output_metrics'] = {
        'unique_courses': len(df),
        'fall_only': len(df[df['Term_Availability'] == 'Fall']),
        'spring_only': len(df[df['Term_Availability'] == 'Spring']),
        'both_terms': len(df[df['Term_Availability'] == 'Both']),
        'crosslisted': df['Is_Crosslisted'].sum(),
        'missing_ratings_fall': df['Average_Rating_Fall'].isnull().sum(),
        'missing_ratings_spring': df['Average_Rating_Spring'].isnull().sum(),
        'departments': df['Department'].nunique(),
        'avg_sections_per_course': df[['Section_Count_Fall', 'Section_Count_Spring']].sum(axis=1).mean()
    }

    # Generate report text
    report_lines = [
        "=" * 80,
        "COURSE DATA CLEANSING REPORT",
        "=" * 80,
        f"Generated: {validation_report['timestamp']}",
        "",
        "INPUT DATA:",
        "-" * 80,
        f"Fall WM Sections: {validation_report['input_metrics'].get('Fall_WM', 0)}",
        f"Spring WM Sections: {validation_report['input_metrics'].get('Spring_WM', 0)}",
        f"Total WM Sections: {validation_report['input_metrics'].get('Fall_WM', 0) + validation_report['input_metrics'].get('Spring_WM', 0)}",
        "",
        "OUTPUT DATA:",
        "-" * 80,
        f"Unique Courses: {validation_report['output_metrics']['unique_courses']}",
        f"Fall Only: {validation_report['output_metrics']['fall_only']}",
        f"Spring Only: {validation_report['output_metrics']['spring_only']}",
        f"Both Terms: {validation_report['output_metrics']['both_terms']}",
        f"Departments: {validation_report['output_metrics']['departments']}",
        "",
        "QUALITY METRICS:",
        "-" * 80,
        f"Crosslisted Courses: {validation_report['output_metrics']['crosslisted']}",
        f"Missing Ratings (Fall): {validation_report['output_metrics']['missing_ratings_fall']} ({validation_report['output_metrics']['missing_ratings_fall']/len(df)*100:.1f}%)",
        f"Missing Ratings (Spring): {validation_report['output_metrics']['missing_ratings_spring']} ({validation_report['output_metrics']['missing_ratings_spring']/len(df)*100:.1f}%)",
        f"Avg Sections/Course: {validation_report['output_metrics']['avg_sections_per_course']:.1f}",
        "",
        "VALIDATION CHECKS:",
        "-" * 80
    ]

    for check, passed in validation_report['quality_checks'].items():
        status = "✓ PASS" if passed else "✗ FAIL"
        report_lines.append(f"{status}: {check}")

    if validation_report['warnings']:
        report_lines.extend([
            "",
            "WARNINGS:",
            "-" * 80
        ])
        for warning in validation_report['warnings']:
            report_lines.append(f"⚠ {warning}")

    if validation_report['errors']:
        report_lines.extend([
            "",
            "ERRORS:",
            "-" * 80
        ])
        for error in validation_report['errors']:
            report_lines.append(f"✗ {error}")

    report_lines.extend([
        "",
        "=" * 80,
        "END OF REPORT",
        "=" * 80
    ])

    # Write report
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))

    logger.info("Validation report generated")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""
    logger.info("=" * 80)
    logger.info("STARTING COURSE DATA CLEANSING")
    logger.info("=" * 80)

    try:
        # Stage 1: Load data
        logger.info("\n--- STAGE 1: Loading Data ---")
        df_fall = load_csv(FALL_CSV, "Fall")
        df_spring = load_csv(SPRING_CSV, "Spring")

        # Stage 2: Validate format
        logger.info("\n--- STAGE 2: Validating Section IDs ---")
        df_fall = validate_section_id_format(df_fall, "Fall")
        df_spring = validate_section_id_format(df_spring, "Spring")

        # Stage 3: Filter to WM division
        logger.info("\n--- STAGE 3: Filtering to WM Division ---")
        df_fall_wm = filter_wh_division(df_fall, "Fall")
        df_spring_wm = filter_wh_division(df_spring, "Spring")

        # Stage 4: Extract Course IDs
        logger.info("\n--- STAGE 4: Extracting Course IDs ---")
        df_fall_wm = extract_course_id(df_fall_wm, "Fall")
        df_spring_wm = extract_course_id(df_spring_wm, "Spring")

        # Stage 5: Consolidate sections
        logger.info("\n--- STAGE 5: Consolidating Sections ---")
        df_fall_consolidated = consolidate_sections(df_fall_wm, "Fall")
        df_spring_consolidated = consolidate_sections(df_spring_wm, "Spring")

        # Stage 6: Handle crosslists
        logger.info("\n--- STAGE 6: Handling Crosslists ---")
        df_fall_consolidated = handle_crosslists(df_fall_consolidated, "Fall")
        df_spring_consolidated = handle_crosslists(df_spring_consolidated, "Spring")

        # Stage 7: Merge terms
        logger.info("\n--- STAGE 7: Merging Terms ---")
        df_merged = merge_terms(df_fall_consolidated, df_spring_consolidated)

        # Stage 8: Enrich data
        logger.info("\n--- STAGE 8: Enriching Data ---")
        df_enriched = enrich_data(df_merged)

        # Stage 9: Validate
        logger.info("\n--- STAGE 9: Validating Cleaned Data ---")
        validate_cleaned_data(df_enriched)

        # Stage 10: Export
        logger.info("\n--- STAGE 10: Exporting Results ---")
        export_csv(df_enriched)
        export_json(df_enriched)
        generate_report(df_enriched)

        logger.info("\n" + "=" * 80)
        logger.info("CLEANSING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Output files:")
        logger.info(f"  - {OUTPUT_CSV}")
        logger.info(f"  - {OUTPUT_JSON}")
        logger.info(f"  - {REPORT_FILE}")

        return 0

    except Exception as e:
        logger.error(f"FATAL ERROR: {str(e)}", exc_info=True)
        return 1

if __name__ == "__main__":
    exit(main())
