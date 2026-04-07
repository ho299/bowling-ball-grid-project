"""
Seed script — reads bowling_ball_data.csv and populates the local bowling_db.

Usage (from repo root):
    pip install psycopg2-binary python-dotenv
    python data/seed.py
"""

import ast
import csv
import os
import sys
from pathlib import Path

# Load .env from repo root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import psycopg2
from psycopg2.extras import execute_values

# ── DB connection ──────────────────────────────────────────────────────────────
conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 5432)),
    dbname=os.getenv("DB_NAME", "bowling_db"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD") or None,
)
conn.autocommit = False
cur = conn.cursor()

# ── Helpers ────────────────────────────────────────────────────────────────────

def slugs_to_title(slug: str) -> str:
    """Convert 'deep-impact' → 'Deep Impact'"""
    return slug.replace("-", " ").title() if slug else ""

def parse_bool(value: str) -> bool:
    return value.strip().lower() == "true"

def parse_spec(value: str) -> dict:
    """Parse "{'RG': 2.48, 'Diff': 0.052, 'MB Diff': None}" safely."""
    try:
        return ast.literal_eval(value)
    except Exception:
        return {"RG": None, "Diff": None, "MB Diff": None}

def get_or_create_core(name: str, description: str, core_type: str) -> int:
    cur.execute("SELECT id FROM core WHERE name = %s", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO core (name, description, type) VALUES (%s, %s, %s) RETURNING id",
        (name, description, core_type),
    )
    return cur.fetchone()[0]

def get_or_create_coverstock(name: str, description: str, cs_type: str) -> int:
    cur.execute("SELECT id FROM coverstock WHERE name = %s", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO coverstock (name, description, type) VALUES (%s, %s, %s) RETURNING id",
        (name, description, cs_type),
    )
    return cur.fetchone()[0]

# ── Main ───────────────────────────────────────────────────────────────────────

csv_path = Path(__file__).resolve().parent / "bowling_ball_data.csv"
inserted = 0
skipped = 0

with open(csv_path, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        try:
            # Derive ball name + brand from URLs
            ball_slug = row["url"].rstrip("/").split("/")[-1]
            ball_name = slugs_to_title(ball_slug)

            brand_slug = (row.get("brand_url") or "").rstrip("/").split("/")[-1]
            brand = slugs_to_title(brand_slug) if brand_slug else None

            # Skip if ball already exists
            cur.execute("SELECT id FROM ball WHERE name = %s AND brand = %s", (ball_name, brand))
            if cur.fetchone():
                skipped += 1
                continue

            # Core
            core_id = get_or_create_core(
                name=row.get("core") or "Unknown",
                description=row.get("core_summary") or "",
                core_type=row.get("core_type") or "",
            )

            # CoverStock
            cs_id = get_or_create_coverstock(
                name=row.get("coverstock") or "Unknown",
                description=row.get("coverstock_description") or "",
                cs_type=row.get("coverstock_type") or "",
            )

            # Image — strip srcset suffix (e.g. " 1x")
            raw_image = (row.get("image_url") or "").split(" ")[0]

            # Ball
            cur.execute(
                """INSERT INTO ball
                   (name, description, brand, image, release_date, discontinued, overseas,
                    factory_finish, core_id, coverstock_id,
                    early_v_late, smooth_v_angular, hook_potential)
                   VALUES (%s, %s, %s, %s,
                           TO_DATE(%s, 'Mon YYYY'),
                           %s, %s, %s, %s, %s,
                           NULL, NULL, NULL)
                   RETURNING id""",
                (
                    ball_name,
                    row.get("summary") or None,
                    brand,
                    raw_image,
                    row.get("release_date") or None,
                    parse_bool(row.get("discontinued", "False")),
                    parse_bool(row.get("overseas", "False")),
                    row.get("factory_finish") or None,
                    core_id,
                    cs_id,
                ),
            )
            ball_id = cur.fetchone()[0]

            # Specs (weights 12–16)
            for weight in (12, 13, 14, 15, 16):
                spec = parse_spec(row.get(f"spec_{weight}", "{}"))
                rg      = spec.get("RG")
                diff    = spec.get("Diff")
                mb_diff = spec.get("MB Diff")
                if rg is None and diff is None:
                    continue
                cur.execute(
                    "INSERT INTO specs (ball_id, weight, rg, diff, mb_diff) VALUES (%s,%s,%s,%s,%s)",
                    (ball_id, weight, rg, diff, mb_diff),
                )

            inserted += 1

            # Commit in batches of 100
            if inserted % 100 == 0:
                conn.commit()
                print(f"  {inserted} balls inserted...")

        except Exception as e:
            conn.rollback()
            print(f"  Row {i+2} error ({row.get('url','')}): {e}")
            # reconnect cursor after rollback
            cur = conn.cursor()

conn.commit()
cur.close()
conn.close()

print(f"\nDone. Inserted: {inserted}  |  Skipped (already exists): {skipped}")
