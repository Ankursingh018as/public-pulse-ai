import pandas as pd
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/pulse_raw")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "../datasets/vadodara_civic_text_dataset.csv")

def ingest_text():
    if not os.path.exists(DATASET_PATH):
        print(f"❌ Dataset not found at: {DATASET_PATH}")
        return

    print("📂 Reading Text dataset...")
    df = pd.read_csv(DATASET_PATH)
    print(f"📊 Found {len(df)} text records.")
    
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_database() # Uses database from URI
        collection = db['raw_reports']
        
        # Determine unique key to avoid duplicates?
        # Dataset has 'text', 'category', 'location'... no ID?
        # We can use fields to check existence or just delete all and reload.
        # Let's drop and reload for simplicity in dev.
        # collection.drop()
        # Actually safer to insert.
        
        records = df.to_dict(orient='records')
        
        if records:
            result = collection.insert_many(records)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} documents into MongoDB.")
        else:
            print("⚠️ No records to insert.")
            
        client.close()
        
    except Exception as e:
        print(f"❌ MongoDB Ingestion failed: {e}")

if __name__ == "__main__":
    ingest_text()
