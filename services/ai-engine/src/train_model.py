"""
Advanced ML Model Trainer for Public Pulse
Trains a text classifier on Vadodara civic issues data
"""
import os
import sys
import pickle
import psycopg2
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report
from dotenv import load_dotenv

# Fix Windows encoding issue
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

load_dotenv()

# Config - Use hardcoded path for Windows compatibility  
MODEL_DIR = r"D:\pulse ai\services\ai-engine\models"
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)
CLASSIFIER_PATH = os.path.join(MODEL_DIR, "classifier.pkl")

def connect_db():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        user=os.getenv("POSTGRES_USER", "pulse"),
        password=os.getenv("POSTGRES_PASSWORD", "pulsedev123"),
        database=os.getenv("POSTGRES_DB", "pulse_db")
    )

def generate_synthetic_text(row):
    """Generate training text from issue metadata"""
    issue_type = row['type']
    metadata = row.get('metadata', {}) or {}
    
    parts = []
    
    if isinstance(metadata, dict):
        if 'category' in metadata:
            parts.append(metadata['category'])
        if 'sub_category' in metadata:
            parts.append(metadata['sub_category'])
        if 'description' in metadata:
            parts.append(metadata['description'])
        if 'ward' in metadata:
            parts.append(f"in {metadata['ward']}")
    
    if row.get('area_name'):
        parts.append(f"at {row['area_name']}")
    
    if not parts:
        type_descriptions = {
            'traffic': 'traffic congestion jam vehicles road',
            'water': 'water supply drainage waterlogging flooding',
            'garbage': 'garbage waste collection sanitation dirty',
            'streetlight': 'street light lamp electricity power',
            'road': 'road pothole damage repair construction',
            'encroachment': 'encroachment illegal occupation footpath',
            'animals': 'stray animals dogs cattle nuisance',
            'noise': 'noise pollution loud speaker disturbance',
            'other': 'civic issue complaint problem'
        }
        parts.append(type_descriptions.get(issue_type, 'civic issue'))
    
    return ' '.join(parts)

def train():
    print("=" * 50)
    print("PUBLIC PULSE - ML MODEL TRAINER")
    print("=" * 50)
    
    print("\n[1/6] Connecting to database...")
    try:
        conn = connect_db()
        print("  -> Connected!")
    except Exception as e:
        print(f"  -> ERROR: DB Connection Failed: {e}")
        return

    print("[2/6] Fetching civic issues data...")
    query = """
        SELECT ci.type, ci.metadata, a.name as area_name
        FROM civic_issues ci
        LEFT JOIN areas a ON ci.area_id = a.id
        WHERE ci.type IS NOT NULL
    """
    df = pd.read_sql(query, conn)
    conn.close()

    if len(df) < 10:
        print("  -> WARNING: Not enough data to train (need at least 10 records).")
        return

    print(f"  -> Found {len(df)} records")
    print("\n[3/6] Class Distribution:")
    for t, c in df['type'].value_counts().items():
        print(f"     {t}: {c}")
    
    print("\n[4/6] Generating training text from metadata...")
    df['text'] = df.apply(generate_synthetic_text, axis=1)
    
    min_samples = 5
    class_counts = df['type'].value_counts()
    valid_classes = class_counts[class_counts >= min_samples].index
    df = df[df['type'].isin(valid_classes)]
    
    print(f"  -> Training on {len(valid_classes)} classes with {len(df)} samples")

    X_train, X_test, y_train, y_test = train_test_split(
        df['text'], df['type'], 
        test_size=0.2, 
        random_state=42,
        stratify=df['type']
    )

    print("\n[5/6] Training classifier...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            stop_words='english', 
            ngram_range=(1, 2),
            max_features=5000,
            min_df=2
        )),
        ('clf', SGDClassifier(
            loss='modified_huber',
            max_iter=1000, 
            tol=1e-3,
            class_weight='balanced',
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = pipeline.score(X_test, y_test)
    
    print(f"\n  -> TRAINING COMPLETE!")
    print(f"  -> Test Accuracy: {accuracy:.2%}")
    
    cv_scores = cross_val_score(pipeline, df['text'], df['type'], cv=5)
    print(f"  -> Cross-Val Accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std()*2:.2%})")
    
    print("\n[6/6] Saving model...")
    with open(CLASSIFIER_PATH, 'wb') as f:
        pickle.dump(pipeline, f)
    
    print(f"  -> Model saved to: {CLASSIFIER_PATH}")
    
    print("\n--- Sample Predictions ---")
    test_texts = [
        "Heavy traffic near railway station",
        "Water pipe leaking since morning",
        "Garbage not collected for 3 days",
        "Street light not working in my area"
    ]
    for text in test_texts:
        pred = pipeline.predict([text])[0]
        prob = max(pipeline.predict_proba([text])[0])
        print(f"  '{text}' -> {pred} ({prob:.0%})")

    print("\n" + "=" * 50)
    print("SUCCESS: MODEL TRAINING COMPLETE!")
    print("=" * 50)

if __name__ == "__main__":
    train()
