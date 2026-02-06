#!/usr/bin/env python3
"""
Course Registry Reconciliation Script

Compares course IDs across three data sources and keeps them in sync:
  1. Course Catalog  (scripts/cleaned_courses.json) — currently offered courses
  2. Course Registry (data/course_registry.json)    — all requirement-referenced courses
  3. Requirements    (Student Requirements/*.json)   — core + major requirement rules

Run this script after:
  - Regenerating the catalog from new semester CSVs
  - Updating any requirements JSON file

What it does:
  - Updates `currently_offered` flags in the registry based on the new catalog
  - Detects NEW course IDs in requirements that aren't in the registry
  - Detects courses in the registry that are no longer referenced by any requirement
  - Flags credit unit mismatches between catalog and registry
  - Prints a clear report of what changed and what needs manual attention

Usage:
  python scripts/reconcile.py           # Report only (no changes)
  python scripts/reconcile.py --apply   # Apply changes to registry
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

BASE_DIR = Path(__file__).parent.parent
CATALOG_PATH = BASE_DIR / "scripts" / "cleaned_courses.json"
REGISTRY_PATH = BASE_DIR / "data" / "course_registry.json"
CORE_REQ_PATH = BASE_DIR / "Student Requirements" / "wharton_mba_core_requirements.json"
MAJOR_REQ_PATH = BASE_DIR / "Student Requirements" / "wharton_mba_major_requirements.json"

WHARTON_DEPTS = {"ACCT", "BEPP", "FNCE", "HCMG", "LGST", "MGMT", "MKTG", "OIDD", "REAL", "STAT", "WHCP"}


# ============================================================================
# Data Loading
# ============================================================================

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def extract_requirement_ids(core, majors):
    """Extract all unique course IDs referenced in requirements files."""
    ids = set()

    for req in core["core_requirements"]:
        for cid in req["courses"]:
            ids.add(cid)

    for code, major in majors["majors"].items():
        reqs = major["requirements"]
        if "required_courses" in reqs:
            for cid in reqs["required_courses"].get("courses", []):
                ids.add(cid)
        if "elective_courses" in reqs:
            for cid in reqs["elective_courses"].get("courses", []):
                ids.add(cid)
            for cid in reqs["elective_courses"].get("non_wharton_courses", []):
                ids.add(cid)
        if "pillars" in reqs:
            for pillar in reqs["pillars"]:
                for cid in pillar.get("courses", []):
                    ids.add(cid)

    return ids


def build_course_to_majors(majors):
    """Map each course ID to the majors that reference it."""
    mapping = {}
    for code, major in majors["majors"].items():
        reqs = major["requirements"]
        all_ids = []
        if "required_courses" in reqs:
            all_ids.extend(reqs["required_courses"].get("courses", []))
        if "elective_courses" in reqs:
            all_ids.extend(reqs["elective_courses"].get("courses", []))
            all_ids.extend(reqs["elective_courses"].get("non_wharton_courses", []))
        if "pillars" in reqs:
            for pillar in reqs["pillars"]:
                all_ids.extend(pillar.get("courses", []))
        for cid in all_ids:
            mapping.setdefault(cid, []).append(code)
    return mapping


# ============================================================================
# Reconciliation Checks
# ============================================================================

def reconcile(catalog, registry, req_ids, course_to_majors):
    """Run all reconciliation checks. Returns changes dict and report lines."""

    catalog_lookup = {c["Course_ID"]: c for c in catalog}
    catalog_ids = set(catalog_lookup.keys())
    registry_lookup = {r["course_id"]: r for r in registry}
    registry_ids = set(registry_lookup.keys())

    changes = {
        "offered_updates": [],      # registry entries where currently_offered changed
        "credit_updates": [],       # registry entries where credit_units changed vs catalog
        "catalog_title_updates": [], # registry entries where title changed vs catalog
    }
    report = []

    # ------------------------------------------------------------------
    # 1. Update currently_offered flags
    # ------------------------------------------------------------------
    report.append("=" * 70)
    report.append("1. CURRENTLY_OFFERED FLAG UPDATES")
    report.append("=" * 70)

    newly_offered = []
    no_longer_offered = []

    for r in registry:
        cid = r["course_id"]
        in_catalog = cid in catalog_ids
        was_offered = r.get("currently_offered", False)

        if in_catalog and not was_offered:
            newly_offered.append(cid)
            changes["offered_updates"].append((cid, True))
        elif not in_catalog and was_offered and r.get("catalog_source") != "non_wharton":
            no_longer_offered.append(cid)
            changes["offered_updates"].append((cid, False))

    if newly_offered:
        report.append(f"\n  Newly offered ({len(newly_offered)}):")
        for cid in sorted(newly_offered):
            report.append(f"    + {cid} (was not offered, now in catalog)")
    if no_longer_offered:
        report.append(f"\n  No longer offered ({len(no_longer_offered)}):")
        for cid in sorted(no_longer_offered):
            report.append(f"    - {cid} (was offered, no longer in catalog)")
    if not newly_offered and not no_longer_offered:
        report.append("  No changes needed.")

    # ------------------------------------------------------------------
    # 2. New requirement IDs not in registry
    # ------------------------------------------------------------------
    report.append("")
    report.append("=" * 70)
    report.append("2. NEW REQUIREMENT COURSE IDs NOT IN REGISTRY")
    report.append("=" * 70)

    new_req_ids = req_ids - registry_ids
    if new_req_ids:
        report.append(f"\n  {len(new_req_ids)} course(s) in requirements but NOT in registry:")
        report.append("  These need to be added manually to data/course_registry.json")
        report.append("")
        for cid in sorted(new_req_ids):
            dept = cid[:4]
            is_wharton = dept in WHARTON_DEPTS
            in_catalog = cid in catalog_ids
            used_by = ", ".join(sorted(set(course_to_majors.get(cid, []))))
            label = "Wharton" if is_wharton else "non-Wharton"
            offered = " (currently offered)" if in_catalog else ""
            report.append(f"    {cid} [{label}]{offered} — used by: {used_by}")
    else:
        report.append("  All requirement course IDs are in the registry. No action needed.")

    # ------------------------------------------------------------------
    # 3. Orphaned registry entries (no longer in any requirement)
    # ------------------------------------------------------------------
    report.append("")
    report.append("=" * 70)
    report.append("3. ORPHANED REGISTRY ENTRIES")
    report.append("=" * 70)

    orphaned = registry_ids - req_ids
    if orphaned:
        report.append(f"\n  {len(orphaned)} course(s) in registry but NOT referenced by any requirement:")
        report.append("  These may be safe to remove, or may be needed for other purposes.")
        report.append("")
        for cid in sorted(orphaned):
            r = registry_lookup[cid]
            offered = "offered" if r.get("currently_offered") else "not offered"
            report.append(f"    {cid} ({r.get('course_title', '?')}) [{offered}]")
    else:
        report.append("  No orphaned entries. All registry courses are referenced by requirements.")

    # ------------------------------------------------------------------
    # 4. Credit unit mismatches (catalog vs registry)
    # ------------------------------------------------------------------
    report.append("")
    report.append("=" * 70)
    report.append("4. CREDIT UNIT MISMATCHES (catalog vs registry)")
    report.append("=" * 70)

    mismatches = []
    for cid in sorted(catalog_ids & registry_ids):
        cat_cu = catalog_lookup[cid].get("Credit_Units")
        reg_cu = registry_lookup[cid].get("credit_units")
        if cat_cu is not None and reg_cu is not None and abs(cat_cu - reg_cu) > 0.001:
            mismatches.append((cid, reg_cu, cat_cu))
            changes["credit_updates"].append((cid, cat_cu))

    if mismatches:
        report.append(f"\n  {len(mismatches)} mismatch(es) found:")
        for cid, reg_cu, cat_cu in mismatches:
            report.append(f"    {cid}: registry={reg_cu} CU, catalog={cat_cu} CU")
    else:
        report.append("  No mismatches. Registry credit units match catalog.")

    # ------------------------------------------------------------------
    # 5. Title drift (catalog title differs from registry)
    # ------------------------------------------------------------------
    report.append("")
    report.append("=" * 70)
    report.append("5. TITLE DIFFERENCES (catalog vs registry)")
    report.append("=" * 70)

    title_diffs = []
    for cid in sorted(catalog_ids & registry_ids):
        cat_title = catalog_lookup[cid].get("Course_Title", "")
        reg_title = registry_lookup[cid].get("course_title", "")
        if cat_title and reg_title and cat_title != reg_title:
            title_diffs.append((cid, reg_title, cat_title))
            changes["catalog_title_updates"].append((cid, cat_title))

    if title_diffs:
        report.append(f"\n  {len(title_diffs)} title difference(s) found:")
        report.append("  Registry will be updated to match catalog (catalog is authoritative).")
        report.append("")
        for cid, reg_title, cat_title in title_diffs:
            report.append(f"    {cid}:")
            report.append(f"      registry: \"{reg_title}\"")
            report.append(f"      catalog:  \"{cat_title}\"")
    else:
        report.append("  No title differences between catalog and registry.")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    report.append("")
    report.append("=" * 70)
    report.append("SUMMARY")
    report.append("=" * 70)

    total_changes = (
        len(changes["offered_updates"])
        + len(changes["credit_updates"])
        + len(changes["catalog_title_updates"])
    )
    report.append(f"  Registry entries:      {len(registry)}")
    report.append(f"  Catalog entries:       {len(catalog)}")
    report.append(f"  Requirement course IDs: {len(req_ids)}")
    report.append(f"  Offered flag updates:  {len(changes['offered_updates'])}")
    report.append(f"  Credit unit updates:   {len(changes['credit_updates'])}")
    report.append(f"  Title updates:         {len(changes['catalog_title_updates'])}")
    report.append(f"  New IDs needing add:   {len(new_req_ids)}")
    report.append(f"  Orphaned entries:      {len(orphaned)}")
    report.append(f"  Total auto-fixable:    {total_changes}")

    return changes, new_req_ids, report


# ============================================================================
# Apply Changes
# ============================================================================

def apply_changes(registry, changes):
    """Apply reconciliation changes to the registry in memory."""
    registry_lookup = {r["course_id"]: r for r in registry}
    applied = 0

    for cid, new_val in changes["offered_updates"]:
        if cid in registry_lookup:
            registry_lookup[cid]["currently_offered"] = new_val
            # Update catalog_source if newly in catalog
            if new_val and registry_lookup[cid].get("catalog_source") == "manual":
                registry_lookup[cid]["catalog_source"] = "catalog"
            elif not new_val and registry_lookup[cid].get("catalog_source") == "catalog":
                registry_lookup[cid]["catalog_source"] = "manual"
            applied += 1

    for cid, new_cu in changes["credit_updates"]:
        if cid in registry_lookup:
            registry_lookup[cid]["credit_units"] = new_cu
            applied += 1

    for cid, new_title in changes["catalog_title_updates"]:
        if cid in registry_lookup:
            registry_lookup[cid]["course_title"] = new_title
            applied += 1

    return applied


# ============================================================================
# Main
# ============================================================================

def main():
    apply_mode = "--apply" in sys.argv

    print(f"CourseHub Reconciliation — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mode: {'APPLY' if apply_mode else 'REPORT ONLY (use --apply to write changes)'}")
    print()

    # Load data
    catalog = load_json(CATALOG_PATH)
    registry = load_json(REGISTRY_PATH)
    core = load_json(CORE_REQ_PATH)
    majors = load_json(MAJOR_REQ_PATH)

    # Extract requirement IDs
    req_ids = extract_requirement_ids(core, majors)
    course_to_majors = build_course_to_majors(majors)

    # Run reconciliation
    changes, new_req_ids, report = reconcile(catalog, registry, req_ids, course_to_majors)

    # Print report
    for line in report:
        print(line)

    # Apply if requested
    if apply_mode:
        total_changes = (
            len(changes["offered_updates"])
            + len(changes["credit_updates"])
            + len(changes["catalog_title_updates"])
        )
        if total_changes > 0:
            applied = apply_changes(registry, changes)
            registry.sort(key=lambda x: x["course_id"])
            save_json(REGISTRY_PATH, registry)
            print(f"\n  Applied {applied} changes to {REGISTRY_PATH}")
        else:
            print("\n  No auto-fixable changes to apply.")

        if new_req_ids:
            print(f"\n  WARNING: {len(new_req_ids)} new course ID(s) need manual addition to the registry.")
            print("  See section 2 above for details.")
    else:
        total_changes = (
            len(changes["offered_updates"])
            + len(changes["credit_updates"])
            + len(changes["catalog_title_updates"])
        )
        if total_changes > 0:
            print(f"\n  Run with --apply to write {total_changes} changes to the registry.")

    print()
    return 0 if not new_req_ids else 1


if __name__ == "__main__":
    sys.exit(main())
