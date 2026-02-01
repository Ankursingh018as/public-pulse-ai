import os
import pickle
import logging

# Path to trained model - use absolute path for Windows compatibility
MODEL_PATH = r"D:\pulse ai\services\ai-engine\models\classifier.pkl"

# Load model if exists
model = None
try:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        logging.warning("Loaded fine-tuned classifier model from: " + MODEL_PATH)
    else:
        logging.warning("No trained model found at: " + MODEL_PATH + ". Using rule-based fallback.")
except Exception as e:
    logging.error(f"Failed to load model: {e}")

# Rule-based fallback
KEYWORDS = {
    "traffic": ["traffic", "jam", "congestion", "stuck", "road blocked", "vehicle"],
    "garbage": ["garbage", "trash", "waste", "rubbish", "bin", "overflow", "smell", "dirty"],
    "water": ["water", "logging", "flood", "drainage", "leak", "pipe", "rain"],
    "light": ["light", "street", "dark", "lamp", "pole", "electricity"]
}

def classify_issue(text: str) -> tuple[str, float]:
    """
    Classify text into issue categories.
    Uses ML model if available, otherwise rule-based.
    Returns (type, confidence)
    """
    # 1. Try ML Model
    if model:
        try:
            # Predict
            probas = model.predict_proba([text])[0]
            classes = model.classes_
            
            # Get max probability
            max_idx = probas.argmax()
            predicted_class = classes[max_idx]
            confidence = probas[max_idx]
            
            # Use scalar float for confidence to avoid serialization issues
            return predicted_class, float(confidence)
        except Exception as e:
            logging.error(f"Prediction error: {e}")
            # Fallthrough to rules if prediction fails

    # 2. Fallback to Rule-based
    text_lower = text.lower()
    scores = {k: 0.0 for k in KEYWORDS.keys()}
    
    for category, words in KEYWORDS.items():
        for word in words:
            if word in text_lower:
                scores[category] += 1.0
    
    best_category = max(scores, key=scores.get)
    max_score = scores[best_category]
    
    if max_score == 0:
        return "other", 0.0
        
    confidence = min(0.5 + (max_score * 0.1), 0.95)
    return best_category, confidence
