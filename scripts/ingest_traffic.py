import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "pulse")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "pulsedev123")
DB_NAME = os.getenv("POSTGRES_DB", "pulse_db")

SPEED_PATH = os.path.join(os.path.dirname(__file__), "../datasets/vadodara_traffic_speed.csv")
# INCIDENTS_PATH = os.path.join(os.path.dirname(__file__), "../datasets/vadodara_traffic_incidents.csv") # If available

def connect_db():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )
    return conn

def ingest_traffic():
    if not os.path.exists(SPEED_PATH):
        print(f"❌ Traffic Speed Dataset not found at: {SPEED_PATH}")
        return

    print("📂 Reading Traffic Speed dataset...")
    df = pd.read_csv(SPEED_PATH)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    success_count = 0
    print(f"🚀 Starting insertion of {len(df)} Traffic records...")
    
    for _, row in df.iterrows():
        try:
            # Columns (need to verify): timestamp, latitude, longitude, speed, congestion_level
            ts = row.get('timestamp')
            lat = row.get('latitude')
            lng = row.get('longitude')
            speed = row.get('speed')
            cong = row.get('congestion_level') or 0.0
            
            cursor.execute("""
                INSERT INTO traffic_data 
                (recorded_at, location, speed_kmh, congestion_level)
                VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)
            """, (ts, lng, lat, speed, cong))
            
            success_count += 1
            
        except Exception as e:
            conn.rollback()
            continue
            
    conn.commit()
    print(f"✅ Successfully ingested {success_count} Traffic records.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    ingest_traffic()
