import psycopg2
import os

DB_HOST = "localhost"
DB_NAME = "pulse_db"
DB_USER = "pulse"
DB_PASS = "pulsedev123"

def run_migration():
    try:
        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)
        conn.autocommit = True
        cur = conn.cursor()
        
        with open('scripts/db/migrate_verification.sql', 'r') as f:
            sql = f.read()
            print("Executing migration...")
            cur.execute(sql)
            print("Migration successful.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_migration()
