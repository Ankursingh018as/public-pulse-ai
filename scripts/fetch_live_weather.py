import requests
import psycopg2
import time
import os

# Configuration
DB_HOST = "localhost"
DB_NAME = "pulse_db"
DB_USER = "pulse"
DB_PASS = "pulsedev123"

WEATHER_API_KEY = "4b8add1648293f784bef5dcf5f7e8dd9"
CITY = "Vadodara"

def get_live_weather():
    url = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={WEATHER_API_KEY}&units=metric"
    try:
        r = requests.get(url)
        if r.status_code == 200:
            return r.json()
        print(f"Error fetching weather: {r.status_code} - {r.text}")
        return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

def insert_weather(data):
    if not data:
        return

    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        
        # Extract fields
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        wind = data['wind']['speed']
        
        # Rain (mm) - sometimes in 'rain' object
        rain_mm = 0
        if 'rain' in data and '1h' in data['rain']:
            rain_mm = data['rain']['1h']
            
        conditions = data['weather'][0]['description']
        
        # Insert into weather_data
        cur.execute("""
            INSERT INTO weather_data 
            (temperature_c, humidity_percent, rain_mm, wind_speed_kmh, conditions, recorded_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (temp, humidity, rain_mm, wind, conditions))
        
        row_id = cur.fetchone()[0]
        conn.commit()
        print(f"✅ Ingested live weather: {temp}°C, {conditions} (ID: {row_id})")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    print("Fetching live weather...")
    data = get_live_weather()
    insert_weather(data)
