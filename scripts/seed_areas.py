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

# File path
DATASET_PATH = os.path.join(os.path.dirname(__file__), "../datasets/zone_aqi_vadodara.csv")

def connect_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def seed_areas():
    if not os.path.exists(DATASET_PATH):
        print(f"❌ Dataset not found at: {DATASET_PATH}")
        return

    print("📂 Reading AQI dataset to extract areas...")
    try:
        df = pd.read_csv(DATASET_PATH)
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return

    # Extract unique zones (Area Names)
    # The columns are: date,zone,zone_name,zone_type,...
    # We want 'zone_name' as the Area Name (e.g., Alkapuri/Old Padra)
    # We can also store the cardinal 'zone' (North/South) in metadata if we want, or just ignore for now.
    
    unique_areas = df[['zone_name', 'zone', 'zone_type']].drop_duplicates()
    
    print(f"📊 Found {len(unique_areas)} unique areas.")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    success_count = 0
    
    for _, row in unique_areas.iterrows():
        area_name = row['zone_name']
        # Metadata allows us to store extra info not in the main schema
        metadata = {
            "cardinal_zone": row['zone'],
            "zone_type": row['zone_type']
        }
        
        try:
            cursor.execute("""
                INSERT INTO areas (name, city, state, center)
                VALUES (%s, 'Vadodara', 'Gujarat', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id;
            """, (area_name,))
            
            # If inserted or already exists (though ON CONFLICT DO NOTHING doesn't return ID if conflict)
            # For simplicity, we just count attempts here or check rowcount
            if cursor.rowcount > 0:
                success_count += 1
                
        except Exception as e:
            print(f"⚠️ Error inserting {area_name}: {e}")
            conn.rollback() 
            continue
            
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Successfully seeded {success_count} new areas for Vadodara.")
    print("ℹ️  Note: Geometries (center/bounds) are currently NULL and should be updated if validation logic requires them.")

if __name__ == "__main__":
    seed_areas()
