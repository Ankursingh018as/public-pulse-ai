import psycopg2
import requests
import time
import os

# Configuration
DB_HOST = "localhost"
DB_NAME = "pulse_db" # Updated from public_pulse based on docker-compose
DB_USER = "pulse"    # Updated from postgres based on docker-compose
DB_PASS = "pulsedev123" 

GOOGLE_MAPS_KEY = "AIzaSyDjSAaJ3aB1VBnlYC4ANMeGMO8lzlZBX0U"

def get_coordinates(area_name):
    """Fetch coordinates from Google Maps Geocoding API"""
    base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": f"{area_name}, Vadodara, Gujarat, India",
        "key": GOOGLE_MAPS_KEY
    }
    try:
        response = requests.get(base_url, params=params)
        data = response.json()
        
        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        else:
            print(f"Error fetching {area_name}: {data['status']}")
            return None, None
    except Exception as e:
        print(f"Exception for {area_name}: {e}")
        return None, None

def update_areas():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        
        # Get all areas
        cur.execute("SELECT id, name FROM areas")
        areas = cur.fetchall()
        
        print(f"Found {len(areas)} areas to geocode.")
        
        for area_id, area_name in areas:
            print(f"Geocoding {area_name}...")
            lat, lng = get_coordinates(area_name)
            
            if lat and lng:
                cur.execute(
                    "UPDATE areas SET latitude = %s, longitude = %s WHERE id = %s",
                    (str(lat), str(lng), area_id)
                )
                conn.commit()
                print(f"Updated {area_name}: {lat}, {lng}")
            else:
                print(f"Skipping {area_name} (no results)")
            
            time.sleep(0.5) # Rate limiting
            
        cur.close()
        conn.close()
        print("Geocoding completed.")
        
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    update_areas()
