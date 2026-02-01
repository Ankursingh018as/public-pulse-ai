import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Config - Connect as Superuser 'postgres'
HOST = os.getenv("POSTGRES_HOST", "localhost")
PORT = os.getenv("POSTGRES_PORT", "5432")
SUPER_USER = "postgres"
SUPER_PASS = os.getenv("POSTGRES_PASSWORD") # This is the superuser password user put in .env

APP_USER = "pulse"
APP_PASS = "pulsedev123"
DB_NAME = "pulse_db"

INIT_SQL_PATH = os.path.join(os.path.dirname(__file__), "db/init.sql")

def get_admin_conn():
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        user=SUPER_USER,
        password=SUPER_PASS,
        database="postgres"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn

def setup():
    print("🚀 Starting Database Setup...")
    
    try:
        conn = get_admin_conn()
        cur = conn.cursor()
        
        # 1. Create User 'pulse'
        cur.execute(f"SELECT 1 FROM pg_roles WHERE rolname='{APP_USER}'")
        if not cur.fetchone():
            print(f"👤 Creating user '{APP_USER}'...")
            cur.execute(f"CREATE USER {APP_USER} WITH PASSWORD '{APP_PASS}' SUPERUSER;") # Grant superuser for simplicity in dev (extensions)
            print(f"✅ User '{APP_USER}' created.")
        else:
            print(f"ℹ️  User '{APP_USER}' already exists.")
            # Ensure password is correct/reset
            cur.execute(f"ALTER USER {APP_USER} WITH PASSWORD '{APP_PASS}';")
            cur.execute(f"ALTER USER {APP_USER} WITH SUPERUSER;")

        # 2. Create Database 'pulse_db'
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{DB_NAME}'")
        if not cur.fetchone():
            print(f"🗄️  Creating database '{DB_NAME}'...")
            cur.execute(f"CREATE DATABASE {DB_NAME} OWNER {APP_USER};")
            print(f"✅ Database '{DB_NAME}' created.")
        else:
            print(f"ℹ️  Database '{DB_NAME}' already exists.")
        
        cur.close()
        conn.close()
        
        # 3. Run init.sql
        print("📜 Running init.sql schema...")
        
        # Connect to the target DB as superuser to verify extensions
        conn_db = psycopg2.connect(
            host=HOST,
            port=PORT,
            user=SUPER_USER,
            password=SUPER_PASS,
            database=DB_NAME
        )
        conn_db.autocommit = True
        cur_db = conn_db.cursor()
        
        with open(INIT_SQL_PATH, 'r') as f:
            sql_content = f.read()
            # Split commands slightly naive but okay for this file?
            # Actually psycopg2 can run the whole script usually
            try:
                cur_db.execute(sql_content)
                print("✅ Schema initialized successfully.")
            except Exception as e:
                print(f"⚠️ Partial error running init.sql (might be already exists): {e}")

        cur_db.close()
        conn_db.close()
        
        print("\n🎉 Setup Complete!")
        print(f"👉 Please update your .env file:\nPOSTGRES_USER={APP_USER}\nPOSTGRES_PASSWORD={APP_PASS}")

    except Exception as e:
        print(f"❌ Setup failed: {e}")

if __name__ == "__main__":
    setup()
