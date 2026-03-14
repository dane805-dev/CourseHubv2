"""
enrich_syllabi.py
=================
Fetches each course's Wharton syllabus PDF and uses Claude to extract
Attendance_Policy and Exam_Policy, then writes the results back into
cleaned_courses.json in-place.

Requirements:
    pip install pdfplumber anthropic python-dotenv requests

Usage:
    1. Add WHARTON_SESSION_COOKIE and ANTHROPIC_API_KEY to .env.local
       (or export them as environment variables)
    2. python scripts/enrich_syllabi.py

Supports incremental runs — courses that already have both fields
populated are skipped unless --force is passed.
"""

import argparse
import io
import json
import logging
import os
import re
import time
from pathlib import Path

import anthropic
import pdfplumber
import requests
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
COURSES_FILE = ROOT / "scripts" / "cleaned_courses.json"
API_SLEEP = 0.5          # seconds between Claude API calls
PDF_CHAR_LIMIT = 8_000   # first N chars of PDF text sent to Claude

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_env() -> tuple[str, str]:
    """Load WHARTON_SESSION_COOKIE and ANTHROPIC_API_KEY from .env.local."""
    load_dotenv(ROOT / ".env.local")
    cookie = os.environ.get("WHARTON_SESSION_COOKIE", "").strip()
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not cookie:
        raise SystemExit("❌  WHARTON_SESSION_COOKIE is not set in .env.local")
    if not api_key:
        raise SystemExit("❌  ANTHROPIC_API_KEY is not set in .env.local")
    return cookie, api_key


def fetch_syllabi_page(url: str, cookie: str) -> str | None:
    """Fetch the Wharton syllabi landing page HTML."""
    try:
        resp = requests.get(url, headers={"Cookie": cookie}, timeout=15)
        if resp.status_code == 401:
            log.warning("401 on %s — session cookie may have expired", url)
            return None
        resp.raise_for_status()
        return resp.text
    except Exception as exc:
        log.warning("Failed to fetch syllabi page %s: %s", url, exc)
        return None


def find_pdf_url(html: str, base_url: str) -> str | None:
    """
    Extract the first PDF download URL from the syllabi landing page HTML.
    Handles both absolute and relative /syllabi/... paths.
    """
    # Look for <a href="...pdf..."> or href ending in .pdf
    patterns = [
        r'href=["\']([^"\']*\.pdf[^"\']*)["\']',
        r'href=["\']([^"\']+/download[^"\']*)["\']',
        r'src=["\']([^"\']*\.pdf[^"\']*)["\']',
    ]
    for pattern in patterns:
        matches = re.findall(pattern, html, re.IGNORECASE)
        if matches:
            href = matches[0]
            if href.startswith("http"):
                return href
            # Relative URL — build absolute from base
            from urllib.parse import urljoin
            return urljoin(base_url, href)

    # Also check for iframe src pointing to a PDF viewer
    iframe = re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if iframe:
        src = iframe.group(1)
        if src.startswith("http"):
            return src
        from urllib.parse import urljoin
        return urljoin(base_url, src)

    return None


def download_pdf(pdf_url: str, cookie: str) -> bytes | None:
    """Download a PDF and return its bytes."""
    try:
        resp = requests.get(pdf_url, headers={"Cookie": cookie}, timeout=30)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        log.warning("Failed to download PDF %s: %s", pdf_url, exc)
        return None


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pdfplumber."""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
                # Stop early once we have enough text
                if sum(len(t) for t in pages_text) >= PDF_CHAR_LIMIT:
                    break
            return "\n".join(pages_text)[:PDF_CHAR_LIMIT]
    except Exception as exc:
        log.warning("PDF text extraction failed: %s", exc)
        return ""


def extract_policies(text: str, client: anthropic.Anthropic) -> dict:
    """Call Claude to extract attendance and exam policy from syllabus text."""
    prompt = f"""You are extracting structured information from a university course syllabus.

Syllabus text:
{text}

Extract the following and return ONLY valid JSON with no other text:
{{
  "attendance_policy": "A single concise sentence describing attendance requirements (e.g. 'Attendance is mandatory; more than 3 absences affects your grade.'), or null if not mentioned.",
  "exam_policy": "A single concise sentence describing exam requirements (e.g. 'One closed-book final exam worth 40% of the grade.'), or null if no exams are mentioned."
}}"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as exc:
        log.warning("Claude extraction failed: %s", exc)
        return {"attendance_policy": None, "exam_policy": None}


# ── Main ──────────────────────────────────────────────────────────────────────

def main(force: bool = False) -> None:
    cookie, api_key = load_env()
    client = anthropic.Anthropic(api_key=api_key)

    log.info("Loading %s", COURSES_FILE)
    with open(COURSES_FILE, encoding="utf-8") as f:
        courses = json.load(f)

    total = sum(1 for c in courses if c.get("Syllabi_URL"))
    processed = skipped = failed = 0

    for course in courses:
        syllabi_url = course.get("Syllabi_URL", "")
        if not syllabi_url:
            continue

        course_id = course.get("Course_ID", "?")

        # Skip already-enriched courses unless --force
        already_done = (
            course.get("Attendance_Policy") is not None
            or course.get("Exam_Policy") is not None
        )
        if already_done and not force:
            skipped += 1
            continue

        log.info("[%d/%d] %s — fetching syllabus…", processed + skipped + 1, total, course_id)

        # Fetch landing page
        html = fetch_syllabi_page(syllabi_url, cookie)
        if not html:
            course["Attendance_Policy"] = None
            course["Exam_Policy"] = None
            failed += 1
            continue

        # Find PDF URL
        pdf_url = find_pdf_url(html, syllabi_url)
        if not pdf_url:
            log.warning("%s — no PDF link found on syllabi page", course_id)
            course["Attendance_Policy"] = None
            course["Exam_Policy"] = None
            failed += 1
            continue

        # Download PDF
        pdf_bytes = download_pdf(pdf_url, cookie)
        if not pdf_bytes:
            course["Attendance_Policy"] = None
            course["Exam_Policy"] = None
            failed += 1
            continue

        # Extract text
        text = extract_pdf_text(pdf_bytes)
        if not text.strip():
            log.warning("%s — PDF yielded no text", course_id)
            course["Attendance_Policy"] = None
            course["Exam_Policy"] = None
            failed += 1
            continue

        # Extract policies via Claude
        policies = extract_policies(text, client)
        course["Attendance_Policy"] = policies.get("attendance_policy")
        course["Exam_Policy"] = policies.get("exam_policy")

        log.info(
            "  attendance=%s | exam=%s",
            course["Attendance_Policy"] or "(none)",
            course["Exam_Policy"] or "(none)",
        )

        processed += 1
        time.sleep(API_SLEEP)

    # Write back in-place
    log.info("Writing enriched data to %s", COURSES_FILE)
    with open(COURSES_FILE, "w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

    log.info(
        "Done. processed=%d  skipped=%d  failed=%d",
        processed, skipped, failed,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich cleaned_courses.json with syllabus policies.")
    parser.add_argument("--force", action="store_true", help="Re-enrich courses that already have policy data.")
    args = parser.parse_args()
    main(force=args.force)
