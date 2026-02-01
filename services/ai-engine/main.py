import os
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import json

from src.preprocessor import clean_text, extract_entities
from src.classifier import classify_issue
from src.predictor import predict_risk

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-engine")

app = FastAPI(title="Public Pulse AI Engine", version="1.0.0")

# Database connections
try:
    pg_conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        user=os.getenv("POSTGRES_USER", "pulse"),
        password=os.getenv("POSTGRES_PASSWORD", "pulsedev123"),
        database=os.getenv("POSTGRES_DB", "pulse_db")
    )
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=6379,
        decode_responses=True
    )
    logger.info("✅ Connected to Databases")
except Exception as e:
    logger.error(f"❌ Database Connection Error: {e}")

# ==========================================
# MODELS
# ==========================================

class TextPayload(BaseModel):
    text: str
    source: str
    metadata: Optional[dict] = {}

class PredictionRequest(BaseModel):
    area_id: int
    issue_type: str

# ==========================================
# ROUTES
# ==========================================

@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-engine"}

@app.post("/process/text")
async def process_text(payload: TextPayload, background_tasks: BackgroundTasks):
    """
    Process incoming text (WhatsApp/Social/News)
    1. Clean
    2. Classify
    3. Extract Entities
    4. Save to DB
    """
    try:
        # 1. Clean
        cleaned_text = clean_text(payload.text)
        
        # 2. Classify
        issue_type, confidence = classify_issue(cleaned_text)
        
        # 3. Extract Entities (Location, etc)
        entities = extract_entities(cleaned_text)
        
        result = {
            "cleaned_text": cleaned_text,
            "type": issue_type,
            "confidence": confidence,
            "entities": entities
        }
        
        # Background: Save to DB and trigger prediction update
        background_tasks.add_task(save_and_predict, result, payload)
        
        return result
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict/risk")
def get_risk_prediction(area_id: int):
    """
    Get aggregated risk score for an area
    """
    try:
        risk_data = predict_risk(area_id, pg_conn)
        return risk_data
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# HELPERS
# ==========================================

def save_and_predict(result: dict, payload: TextPayload):
    """
    Save processed issue and trigger risk recalculation
    """
    try:
        cursor = pg_conn.cursor()
        
        # Map extracted location to lat/lng (Mock for now or use Geocoder)
        # Using a default center for Vadodara if not found
        lat, lng = 22.3072, 73.1812 
        
        cursor.execute("""
            INSERT INTO civic_issues 
            (type, location, severity, sources, raw_text, confidence, metadata)
            VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            result['type'],
            lng, lat,
            0.5, # Default severity
            [payload.source],
            payload.text,
            result['confidence'],
            json.dumps(payload.metadata)
        ))
        
        issue_id = cursor.fetchone()[0]
        pg_conn.commit()
        cursor.close()
        
        logger.info(f"💾 Saved issue {issue_id}. Triggering risk update...")
        
        # Trigger risk calculation
        # Find Gotri ID for demo accuracy, or use prediction target
        cursor = pg_conn.cursor()
        cursor.execute("SELECT id FROM areas WHERE name ILIKE '%Gotri%' LIMIT 1")
        row = cursor.fetchone()
        target_area_id = row[0] if row else 1
        cursor.close()
        
        risk_data = predict_risk(target_area_id, pg_conn)
        
        # In a real system, we'd find the area_id from lat/lng
        # For now, if metadata has demo=True, we force Gotri ID via lookup or hardcode default
        
        cursor = pg_conn.cursor()
        
        # Insert Prediction
        cursor.execute("""
            INSERT INTO predictions 
            (event_type, area_id, area_name, probability, eta_hours, confidence, reasons, risk_breakdown)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            result['type'],
            risk_data['area_id'],
            risk_data['area_name'],
            risk_data['risk_score'],
            1.0 if risk_data.get('eta') == '1 hour' else 2.0, # Parse ETA
            0.95, # High confidence for demo
            risk_data['reasons'],
            json.dumps(risk_data['breakdown'])
        ))
        
        pg_conn.commit()
        cursor.close()
        logger.info(f"🔮 Prediction generated: {risk_data['risk_score']} risk for {risk_data['area_name']}")
        
    except Exception as e:
        logger.error(f"DB Save Error: {e}")
        pg_conn.rollback()
