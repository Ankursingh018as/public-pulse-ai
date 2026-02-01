import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv
import ast

# Load environment variables
load_dotenv(override=True)

# Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "pulse")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "pulsedev123")
DB_NAME = os.getenv("POSTGRES_DB", "pulse_db")

DATASET_PATH = os.path.join(os.path.dirname(__file__), "../datasets/vadodara_complaints.csv")

def connect_db():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )
    conn.autocommit = True
    return conn

def update_enums(cursor):
    """Ensure all required enum values exist."""
    print("🔧 Checking and updating enums...")
    
    # Required issue types from dataset
    required_types = ['traffic', 'garbage', 'water', 'light', 'drainage', 'encroachment', 'animals', 'fire', 'health', 'other']
    
    # Check existing enum values
    cursor.execute("SELECT enum_range(NULL::issue_type)")
    existing_types = cursor.fetchone()[0] if cursor.rowcount > 0 else []
    
    for t in required_types:
        # Note: This check is a bit naive but works for Postgres strings
        # Ideally we catch the error "duplicate value" or verify properly
        try:
            cursor.execute(f"ALTER TYPE issue_type ADD VALUE IF NOT EXISTS '{t}'")
        except psycopg2.errors.DuplicateObject:
            pass
        except Exception as e:
            print(f"⚠️ Could not add enum '{t}': {e}")
            
    print("✅ Enums updated.")

def ingest_complaints():
    if not os.path.exists(DATASET_PATH):
        print(f"❌ Dataset not found at: {DATASET_PATH}")
        return

    print("📂 Reading Complaints dataset...")
    df = pd.read_csv(DATASET_PATH)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Update Enums first
    try:
        update_enums(cursor)
    except Exception as e:
        print(f"⚠️ Enum update skipped/failed (might already exist): {e}")

    # Process rows
    success_count = 0
    skipped_count = 0
    
    # Mapping
    category_map = {
        'Stray Animals': 'animals',
        'Drainage': 'drainage',
        'Encroachment': 'encroachment',
        'Garbage': 'garbage',
        'Traffic': 'traffic',
        'Water': 'water',
        'Street Light': 'light',
        'Fire': 'fire',
        'Health': 'health'
    }
    
    severity_map = {
        'Low': 0.2,
        'Medium': 0.5,
        'High': 0.8,
        'Critical': 1.0
    }

    print(f"🚀 Starting insertion of {len(df)} records...")

    for _, row in df.iterrows():
        try:
            # Map Category
            cat_raw = row['category']
            issue_type = category_map.get(cat_raw, 'other')
            
            # Map Severity
            sev_raw = row['severity']
            severity = severity_map.get(sev_raw, 0.5)
            
            # Location
            lat = row['latitude']
            lng = row['longitude']
            
            # Description
            desc = row['description']
            
            # Area lookup (naive: try to find by similarity or spatial join if we had polygons, 
            # here we just rely on lat/long for now, leaving area_id null or doing a lookup later)
            # We can try to match "Zone" or "Ward" if we seeded them as areas.
            # For now, let's trust the PostGIS location to be enough for queries.
            
            cursor.execute("""
                INSERT INTO civic_issues 
                (id, type, location, severity, sources, raw_text, created_at, metadata)
                VALUES (%s, %s::issue_type, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s::source_type[], %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                row['id'],
                issue_type,
                float(lng), float(lat),
                severity,
                ['citizen'], # Source
                desc,
                row['timestamp'],
                json.dumps({
                    "original_category": cat_raw,
                    "sub_category": row['sub_category'],
                    "status": row['status'],
                    "zone": row['zone'],
                    "ward": row['ward']
                })
            ))
            success_count += 1

        except Exception as e:
            skipped_count += 1
            if skipped_count < 5:
               print(f"⚠️ Error inserting row: {e}")
    
    cursor.close()
    conn.close()
    print(f"✅ Successfully ingested {success_count} complaints. Skipped {skipped_count}.")

import json

if __name__ == "__main__":
    ingest_complaints()
