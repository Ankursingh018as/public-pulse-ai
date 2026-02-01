import psycopg2
import random
import json
import time

# Configuration
DB_HOST = "localhost"
DB_NAME = "pulse_db"
DB_USER = "pulse"
DB_PASS = "pulsedev123"

AREAS = [
    {"name": "Alkapuri", "lat": 22.31, "lng": 73.18},
    {"name": "Sayajigunj", "lat": 22.31, "lng": 73.19},
    {"name": "Fatehgunj", "lat": 22.32, "lng": 73.19},
    {"name": "Manjalpur", "lat": 22.27, "lng": 73.19},
    {"name": "Karelibaug", "lat": 22.31, "lng": 73.21},
    {"name": "Gorwa", "lat": 22.33, "lng": 73.16},
    {"name": "Makarpura", "lat": 22.25, "lng": 73.19},
    {"name": "Waghodia", "lat": 22.29, "lng": 73.23}
]

TYPES = ["traffic", "water", "garbage", "light"]

def connect_db():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)

def simulate():
    try:
        conn = connect_db()
        cur = conn.cursor()
        
        print("🚀 Simulating City Activity...")

        for area in AREAS:
            # Random chance of incident
            if random.random() > 0.4:
                etype = random.choice(TYPES)
                severity = random.choice([0.4, 0.6, 0.8, 0.9])
                prob = random.uniform(0.6, 0.99)
                
                # Check if area exists or insert
                cur.execute("SELECT id FROM areas WHERE name = %s", (area['name'],))
                row = cur.fetchone()
                if not row:
                    cur.execute("INSERT INTO areas (name, latitude, longitude) VALUES (%s, %s, %s) RETURNING id",
                               (area['name'], area['lat'], area['lng']))
                    aid = cur.fetchone()[0]
                else:
                    aid = row[0]

                # Insert Prediction
                print(f"Creating {etype} risk in {area['name']}...")
                cur.execute("""
                    INSERT INTO predictions
                    (event_type, area_id, area_name, probability, eta_hours, confidence, risk_breakdown)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    etype, aid, area['name'], prob, random.choice([1, 2, 3]), 0.85,
                    json.dumps({"simulated": True})
                ))
                
                # Insert Civic Issue (Raw Data)
                cur.execute("""
                    INSERT INTO civic_issues
                    (type, location, severity, sources, raw_text, confidence)
                    VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s::source_type[], %s, %s)
                """, (
                    etype, area['lng'], area['lat'], severity, ['sensor'],
                    f"Simulated {etype} alert for {area['name']}", 0.9
                ))

        conn.commit()
        cur.close()
        conn.close()
        print("✅ Simulation Complete. Dashboard should now be populated.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    simulate()
