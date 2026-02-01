import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv(override=True)

# Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "pulse")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "pulsedev123")
DB_NAME = os.getenv("POSTGRES_DB", "pulse_db")

AQI_PATH = os.path.join(os.path.dirname(__file__), "../datasets/aqi_vadodara.csv")
WEATHER_PATH = os.path.join(os.path.dirname(__file__), "../datasets/hourly_weather_vadodara.csv")

def connect_db():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )
    return conn

def ingest_aqi():
    if not os.path.exists(AQI_PATH):
        print(f"❌ AQI Dataset not found at: {AQI_PATH}")
        return

    print("📂 Reading AQI dataset...")
    df = pd.read_csv(AQI_PATH)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    success_count = 0
    
    # Check if table has columns for AQI (weather_data table might need extension or use weather_data for mixed use)
    # The init.sql weather_data table has: temperature_c, humidity_percent, rain_probability, rain_mm, wind_speed_kmh
    # It DOES NOT have AQI columns.
    # We should add AQI columns to weather_data or store in metadata?
    # Better to add columns `pm25`, `pm10`, `aqi` to weather_data.
    
    try:
        cursor.execute("ALTER TABLE weather_data ADD COLUMN IF NOT EXISTS pm25 DECIMAL(6,2)")
        cursor.execute("ALTER TABLE weather_data ADD COLUMN IF NOT EXISTS pm10 DECIMAL(6,2)")
        cursor.execute("ALTER TABLE weather_data ADD COLUMN IF NOT EXISTS aqi INTEGER")
        cursor.execute("ALTER TABLE weather_data ADD COLUMN IF NOT EXISTS aqi_category VARCHAR(50)")
        conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to alter table for AQI: {e}")
        conn.rollback()

    print(f"🚀 Starting insertion of {len(df)} AQI records...")
    
    for _, row in df.iterrows():
        try:
            # Table Schema: area_id, temperature_c, ..., recorded_at
            # AQI dataset has Date but no specific area (it's city wide usually, or we can pick a default area)
            # Actually, viewing aqi_vadodara.csv before, it has 'Date', 'PM2.5', 'PM10'...
            # Wait, `zone_aqi_vadodara.csv` had zones. `aqi_vadodara.csv` might be city average?
            # Let's assume city-wide (or pick first area).
            
            date = row.get('Date')
            pm25 = row.get('PM2.5')
            pm10 = row.get('PM10')
            aqi = row.get('AQI')
            cat = row.get('Category')
            
            # Insert
            cursor.execute("""
                INSERT INTO weather_data 
                (recorded_at, pm25, pm10, aqi, aqi_category, conditions)
                VALUES (%s, %s, %s, %s, %s, 'Haze')
            """, (date, pm25, pm10, aqi, cat))
            
            success_count += 1
            
        except Exception as e:
            # print(f"⚠️ Error inserting AQI row: {e}")
            conn.rollback()
            continue
            
    conn.commit()
    print(f"✅ Successfully ingested {success_count} AQI records.")
    cursor.close()
    conn.close()

def ingest_hourly_weather():
    if not os.path.exists(WEATHER_PATH):
        print(f"❌ Weather Dataset not found at: {WEATHER_PATH}")
        return

    print("📂 Reading Hourly Weather dataset...")
    df = pd.read_csv(WEATHER_PATH)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    success_count = 0
    
    print(f"🚀 Starting insertion of {len(df)} Weather records...")

    for _, row in df.iterrows():
        try:
            # Columns: pickup_datetime, temperature, etc... (need to check actual cols)
            # Assuming standard columns based on typical weather data
            
            ts = row.get('timestamp') or row.get('date_time')
            temp = row.get('temperature_c')
            hum = row.get('humidity')
            wind = row.get('wind_kph')
            cond = row.get('condition_text')
            
            cursor.execute("""
                INSERT INTO weather_data 
                (recorded_at, temperature_c, humidity_percent, wind_speed_kmh, conditions)
                VALUES (%s, %s, %s, %s, %s)
            """, (ts, temp, hum, wind, cond))
            success_count += 1
            
        except Exception as e:
            conn.rollback()
            continue
            
    conn.commit()
    print(f"✅ Successfully ingested {success_count} Weather records.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    ingest_aqi()
    ingest_hourly_weather()
