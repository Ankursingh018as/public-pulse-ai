import psycopg2
import os
import json

# Configuration
DB_HOST = "localhost"
DB_NAME = "pulse_db"
DB_USER = "pulse"
DB_PASS = "pulsedev123"

def ensure_gotri():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        
        # 0. Ensure Schema
        try:
            cur.execute("ALTER TABLE areas ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50)")
            conn.commit()
        except Exception:
            conn.rollback()

        # 1. Check/Insert Area
        cur.execute("SELECT id FROM areas WHERE name ILIKE '%Gotri%'")
        row = cur.fetchone()
        
        if not row:
            print("Creating Gotri area...")
            cur.execute("""
                INSERT INTO areas (name, latitude, longitude, risk_level, updated_at)
                VALUES ('Gotri', 22.3218, 73.1678, 'low', NOW())
                RETURNING id
            """)
            area_id = cur.fetchone()[0]
        else:
            area_id = row[0]
            print(f"Gotri area exists (ID: {area_id})")
            
        # 2. Insert Demo Message
        print("Inserting demo message...")
        cur.execute("""
            INSERT INTO civic_issues 
            (type, location, severity, sources, raw_text, confidence, metadata)
            VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s::source_type[], %s, %s, %s)
        """, (
            'traffic',
            73.1678, 22.3218,
            0.8,
            ['wa'], # Changed to 'wa' to match enum
            "Gotri road jam ho raha hai",
            0.95,
            json.dumps({"demo": True, "sender": "+919876543210"})
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Demo scenario seeded successfully (Full).")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        if hasattr(e, 'pgerror'):
            print(f"PG Error: {e.pgerror}")

if __name__ == "__main__":
    ensure_gotri()
