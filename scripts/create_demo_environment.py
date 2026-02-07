"""
Demo Environment Setup Script
Creates realistic demo data with active users, incidents, and verifications
To be run before showcase on Feb 10, 2026
"""

import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import random
import json

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'public_pulse',
    'user': 'postgres',
    'password': 'postgres123'
}

# Demo user profiles (you + friends/family who can help during demo)
DEMO_USERS = [
    {'name': 'Rahul Shah', 'phone': '+919876543210', 'zone': 'Gotri'},
    {'name': 'Priya Patel', 'phone': '+919876543211', 'zone': 'Alkapuri'},
    {'name': 'Amit Desai', 'phone': '+919876543212', 'zone': 'Fatehgunj'},
    {'name': 'Sneha Gandhi', 'phone': '+919876543213', 'zone': 'Manjalpur'},
    {'name': 'Karan Mehta', 'phone': '+919876543214', 'zone': 'Akota'},
    {'name': 'Riya Sharma', 'phone': '+919876543215', 'zone': 'Sayajigunj'},
    {'name': 'Vivek Kumar', 'phone': '+919876543216', 'zone': 'Vasna'},
    {'name': 'Pooja Singh', 'phone': '+919876543217', 'zone': 'Waghodia'},
]

# Vadodara zone coordinates
ZONE_COORDS = {
    'Gotri': {'lat': 22.2644, 'lng': 73.2057},
    'Alkapuri': {'lat': 22.3072, 'lng': 73.1812},
    'Fatehgunj': {'lat': 22.3176, 'lng': 73.1800},
    'Manjalpur': {'lat': 22.2858, 'lng': 73.2142},
    'Akota': {'lat': 22.2900, 'lng': 73.1700},
    'Sayajigunj': {'lat': 22.3039, 'lng': 73.1919},
    'Vasna': {'lat': 22.3300, 'lng': 73.1900},
    'Waghodia': {'lat': 22.2800, 'lng': 73.2400},
}

INCIDENT_TYPES = ['traffic', 'garbage', 'water', 'light', 'road', 'drainage']

def create_demo_users(conn):
    """Create demo user accounts"""
    cursor = conn.cursor()
    user_ids = []
    
    print("Creating demo users...")
    for user in DEMO_USERS:
        user_id = f"citizen_{user['phone'][-4:]}"
        try:
            cursor.execute("""
                INSERT INTO users (id, name, phone, zone, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (id) DO NOTHING
                RETURNING id
            """, (user_id, user['name'], user['phone'], user['zone']))
            
            result = cursor.fetchone()
            if result:
                user_ids.append(result[0])
                print(f"  ✓ Created user: {user['name']} ({user_id})")
        except Exception as e:
            print(f"  ⚠ User {user['name']} may already exist")
            user_ids.append(user_id)
    
    conn.commit()
    return user_ids

def load_real_incidents_from_csv(conn):
    """Load real complaint data from your datasets"""
    cursor = conn.cursor()
    incident_ids = []
    
    print("\nLoading real incidents from datasets...")
    
    try:
        # Load complaints CSV
        df = pd.read_csv('../datasets/vadodara_complaints.csv')
        
        for idx, row in df.head(30).iterrows():  # Load 30 recent complaints
            incident_id = f"incident_{datetime.now().timestamp()}_{idx}"
            
            # Map complaint to location
            zone = random.choice(list(ZONE_COORDS.keys()))
            coords = ZONE_COORDS[zone]
            lat = coords['lat'] + random.uniform(-0.02, 0.02)
            lng = coords['lng'] + random.uniform(-0.02, 0.02)
            
            # Determine incident type
            description = str(row.get('complaint_text', row.get('text', ''))).lower()
            incident_type = 'traffic'
            if 'garbage' in description or 'waste' in description:
                incident_type = 'garbage'
            elif 'water' in description or 'leak' in description:
                incident_type = 'water'
            elif 'light' in description or 'street' in description:
                incident_type = 'light'
            elif 'road' in description or 'pothole' in description:
                incident_type = 'road'
            
            cursor.execute("""
                INSERT INTO incidents (id, type, lat, lng, description, severity, 
                                     verified, resolved, source, zone, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
            """, (
                incident_id, incident_type, lat, lng, 
                description[:200], random.uniform(0.5, 0.9),
                random.randint(0, 1), False, 'citizen_report', zone,
                datetime.now() - timedelta(days=random.randint(0, 7))
            ))
            
            result = cursor.fetchone()
            if result:
                incident_ids.append(result[0])
                print(f"  ✓ Loaded: {incident_type} in {zone}")
        
        conn.commit()
        print(f"✓ Loaded {len(incident_ids)} real incidents")
        
    except Exception as e:
        print(f"⚠ Error loading CSV: {e}")
        print("  Creating synthetic incidents instead...")
        incident_ids = create_synthetic_incidents(conn)
    
    return incident_ids

def create_synthetic_incidents(conn):
    """Create realistic synthetic incidents if CSV loading fails"""
    cursor = conn.cursor()
    incident_ids = []
    
    descriptions = {
        'traffic': ['Heavy traffic jam', 'Road accident', 'Vehicle breakdown blocking road'],
        'garbage': ['Overflowing dustbin', 'Garbage not collected', 'Illegal dumping'],
        'water': ['Water pipeline burst', 'No water supply', 'Drainage overflow'],
        'light': ['Street light not working', 'Multiple lights out', 'Damaged light pole'],
        'road': ['Large pothole', 'Road caved in', 'Broken footpath'],
    }
    
    for i in range(30):
        zone = random.choice(list(ZONE_COORDS.keys()))
        coords = ZONE_COORDS[zone]
        incident_type = random.choice(INCIDENT_TYPES)
        
        incident_id = f"incident_{datetime.now().timestamp()}_{i}"
        lat = coords['lat'] + random.uniform(-0.02, 0.02)
        lng = coords['lng'] + random.uniform(-0.02, 0.02)
        
        cursor.execute("""
            INSERT INTO incidents (id, type, lat, lng, description, severity,
                                 verified, resolved, source, zone, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            incident_id, incident_type, lat, lng,
            random.choice(descriptions.get(incident_type, ['Issue reported'])),
            random.uniform(0.5, 0.9), random.randint(0, 1), False,
            'citizen_report', zone,
            datetime.now() - timedelta(days=random.randint(0, 7))
        ))
        
        incident_ids.append(cursor.fetchone()[0])
    
    conn.commit()
    print(f"✓ Created {len(incident_ids)} synthetic incidents")
    return incident_ids

def add_citizen_verifications(conn, incident_ids, user_ids):
    """Add realistic citizen votes/verifications"""
    cursor = conn.cursor()
    
    print("\nAdding citizen verifications...")
    count = 0
    
    for incident_id in incident_ids:
        # Random number of citizens verify each incident (0-5)
        num_verifiers = random.randint(0, min(5, len(user_ids)))
        verifiers = random.sample(user_ids, num_verifiers)
        
        for user_id in verifiers:
            vote_type = random.choice(['yes', 'yes', 'yes', 'no'])  # 75% yes
            
            try:
                cursor.execute("""
                    INSERT INTO citizen_confirmations (incident_id, user_id, response, created_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (incident_id, user_id, vote_type, datetime.now() - timedelta(minutes=random.randint(1, 1000))))
                count += 1
            except:
                pass
    
    conn.commit()
    print(f"✓ Added {count} citizen verifications")

def create_demo_credentials_file(user_ids):
    """Create a file with demo user credentials for showcase"""
    
    credentials = {
        'showcase_date': '2026-02-10',
        'demo_users': [],
        'instructions': """
SHOWCASE DEMO - USER CREDENTIALS

Give these credentials to friends/family during your showcase:
1. Open the citizen app on their phones
2. Each person can login with their assigned phone number
3. During demo, ask them to:
   - Vote on incidents you point out
   - Report new issues when you ask
   - Show real-time updates happening

This creates a LIVE, INTERACTIVE demo!
        """
    }
    
    for i, user in enumerate(DEMO_USERS):
        credentials['demo_users'].append({
            'index': i + 1,
            'name': user['name'],
            'phone': user['phone'],
            'zone': user['zone'],
            'user_id': f"citizen_{user['phone'][-4:]}",
            'role': 'Voter' if i < 5 else 'Reporter'
        })
    
    with open('../DEMO_USERS_CREDENTIALS.json', 'w') as f:
        json.dump(credentials, f, indent=2)
    
    print("\n" + "="*60)
    print("DEMO USERS CREATED!")
    print("="*60)
    print("\nShare these credentials with friends/family for LIVE demo:\n")
    
    for user in credentials['demo_users']:
        print(f"{user['index']}. {user['name']}")
        print(f"   Phone: {user['phone']}")
        print(f"   Zone: {user['zone']}")
        print(f"   Role: {user['role']}")
        print()
    
    print(f"Full details saved to: DEMO_USERS_CREDENTIALS.json")
    print("="*60)

def main():
    print("="*60)
    print("PUBLIC PULSE AI - DEMO ENVIRONMENT SETUP")
    print("Showcase Date: February 10, 2026")
    print("="*60)
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Connected to database")
        
        # Step 1: Create demo users
        user_ids = create_demo_users(conn)
        
        # Step 2: Load real incidents from your datasets
        incident_ids = load_real_incidents_from_csv(conn)
        
        # Step 3: Add citizen verifications
        add_citizen_verifications(conn, incident_ids, user_ids)
        
        # Step 4: Create credentials file
        create_demo_credentials_file(user_ids)
        
        print("\n" + "="*60)
        print("✅ DEMO ENVIRONMENT READY!")
        print("="*60)
        print("\nNext steps:")
        print("1. Share DEMO_USERS_CREDENTIALS.json with 5-8 friends")
        print("2. During showcase, ask them to vote/report on their phones")
        print("3. Show real-time updates happening on the main screen")
        print("\nThis creates an ACTIVE, LIVE demo!")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. PostgreSQL is running")
        print("2. Database 'public_pulse' exists")
        print("3. Tables are created (run schema first)")

if __name__ == "__main__":
    main()
