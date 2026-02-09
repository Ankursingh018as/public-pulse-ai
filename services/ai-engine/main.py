import os
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import json
from pathlib import Path

from src.preprocessor import clean_text, extract_entities
from src.classifier import classify_issue
from src.predictor import predict_risk
from src.video_detector import (
    detect_image,
    detect_video,
    get_model_status,
    reload_model,
    UPLOAD_DIR,
)
from src.video_training import train_model, resume_training, prepare_dataset

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-engine")

app = FastAPI(title="Public Pulse AI Engine", version="2.0.0")

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Database connections
try:
    pg_conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        user=os.getenv("POSTGRES_USER", "pulse"),
        password=os.getenv("POSTGRES_PASSWORD", ""),
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


# ==========================================
# VIDEO / IMAGE DETECTION ROUTES
# ==========================================

class TrainRequest(BaseModel):
    data_yaml: Optional[str] = None
    epochs: int = 50
    image_size: int = 640
    batch_size: int = 16
    base_model: str = "yolov8n.pt"


@app.post("/detect/image")
async def detect_image_endpoint(
    file: UploadFile = File(...),
    confidence: float = Form(default=0.5),
):
    """
    Upload an image and run YOLO trash detection.
    Returns bounding boxes, class labels, and confidence scores.
    """
    suffix = Path(file.filename or "upload.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
        raise HTTPException(status_code=400, detail=f"Unsupported image format: {suffix}")

    tmp_path = UPLOAD_DIR / f"img_{os.urandom(8).hex()}{suffix}"
    try:
        with open(tmp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        result = detect_image(str(tmp_path), confidence=confidence)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Image detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


@app.post("/detect/video")
async def detect_video_endpoint(
    file: UploadFile = File(...),
    confidence: float = Form(default=0.5),
    max_frames: int = Form(default=0),
):
    """
    Upload a video and run YOLO trash detection frame-by-frame.
    Returns aggregated detection results and per-frame summaries.
    """
    suffix = Path(file.filename or "upload.mp4").suffix.lower()
    if suffix not in {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: {suffix}")

    tmp_path = UPLOAD_DIR / f"vid_{os.urandom(8).hex()}{suffix}"
    output_path = UPLOAD_DIR / f"out_{os.urandom(8).hex()}.mp4"
    try:
        with open(tmp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        result = detect_video(
            str(tmp_path),
            output_path=str(output_path),
            confidence=confidence,
            max_frames=max_frames if max_frames > 0 else 0,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Video detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in (tmp_path, output_path):
            if p.exists():
                p.unlink(missing_ok=True)


@app.get("/model/status")
def model_status():
    """Get the current video detection model status and configuration."""
    return get_model_status()


@app.post("/model/reload")
def model_reload(weights_path: Optional[str] = None):
    """Reload the YOLO model, optionally with new weights."""
    try:
        return reload_model(weights_path)
    except Exception as e:
        logger.error(f"Model reload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train/start")
async def start_training(req: TrainRequest, background_tasks: BackgroundTasks):
    """
    Start YOLO model training in the background.
    """
    def _run_training():
        try:
            result = train_model(
                data_yaml=req.data_yaml,
                epochs=req.epochs,
                image_size=req.image_size,
                batch_size=req.batch_size,
                base_model=req.base_model,
            )
            logger.info(f"Training complete: {result}")
        except Exception as e:
            logger.error(f"Training failed: {e}")

    background_tasks.add_task(_run_training)
    return {
        "status": "training_started",
        "config": {
            "epochs": req.epochs,
            "image_size": req.image_size,
            "batch_size": req.batch_size,
            "base_model": req.base_model,
        },
    }


@app.post("/train/resume")
async def resume_training_endpoint(
    checkpoint_path: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
):
    """Resume training from a checkpoint."""
    def _run_resume():
        try:
            result = resume_training(checkpoint_path)
            logger.info(f"Resume complete: {result}")
        except Exception as e:
            logger.error(f"Resume failed: {e}")

    if background_tasks is not None:
        background_tasks.add_task(_run_resume)
        return {"status": "resume_started", "checkpoint": checkpoint_path}

    # Synchronous fallback if no background tasks available
    try:
        return resume_training(checkpoint_path)
    except Exception as e:
        logger.error(f"Resume failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
