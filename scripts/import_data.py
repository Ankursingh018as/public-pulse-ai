import pandas as pd
import psycopg2
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "pulse")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "pulsedev123")
DB_NAME = os.getenv("POSTGRES_DB", "pulse_db")

def connect_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def import_csv(file_path):
    print(f"📂 Reading {file_path}...")
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return

    # Normalize columns (basic mapping)
    # Expected: type, description, lat, lng, date, severity
    print(f"📊 Found columns: {list(df.columns)}")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    success_count = 0
    
    for _, row in df.iterrows():
        try:
            # Map fields (adjust these keys based on user's actual CSV)
            issue_type = row.get('type', 'other').lower()
            description = row.get('description', '') or row.get('text', '')
            lat = row.get('lat') or row.get('latitude')
            lng = row.get('lng') or row.get('longitude')
            
            # Default location (Surat) if missing
            if pd.isna(lat) or pd.isna(lng):
                lat, lng = 21.1702, 72.8311
            
            # Date parsing
            date_str = row.get('date') or row.get('timestamp') or datetime.now().isoformat()
            
            cursor.execute("""
                INSERT INTO civic_issues 
                (type, location, severity, sources, raw_text, created_at)
                VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s)
            """, (
                issue_type,
                float(lng), float(lat),
                0.5, # Default severity
                ['history'],
                description,
                date_str
            ))
            success_count += 1
            
        except Exception as e:
            print(f"⚠️ Skipping row: {e}")
            
    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Successfully imported {success_count} records from {file_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python import_data.py <path_to_csv>")
    else:
        import_csv(sys.argv[1])
