import os
import logging
import threading

# Path to trained model - use relative path for cross-platform compatibility
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "classifier.pkl")

# Lazy-loaded ML model (sklearn import can be very slow on Python 3.13)
_model = None
_model_loaded = False
_model_lock = threading.Lock()


def _get_model():
    """Lazy-load the sklearn model on first use, not at import time."""
    global _model, _model_loaded
    if _model_loaded:
        return _model
    with _model_lock:
        if _model_loaded:
            return _model
        try:
            if os.path.exists(MODEL_PATH):
                import pickle
                with open(MODEL_PATH, 'rb') as f:
                    _model = pickle.load(f)
                logging.info("Loaded classifier model from: " + MODEL_PATH)
            else:
                logging.warning("No trained model at: " + MODEL_PATH + ". Using rule-based fallback.")
        except Exception as e:
            logging.error(f"Failed to load classifier model: {e}")
        _model_loaded = True
        return _model


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
    model = _get_model()
    if model:
        try:
            probas = model.predict_proba([text])[0]
            classes = model.classes_
            max_idx = probas.argmax()
            predicted_class = classes[max_idx]
            confidence = probas[max_idx]
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
