import logging
import random

logger = logging.getLogger("fusion-engine")

class FusionEngine:
    def __init__(self):
        self.weights = {
            "time_series": 0.30,
            "nlp": 0.25,
            "anomaly": 0.15,
            "history": 0.10,
            "video": 0.20
        }

    def calculate_risk(self, inputs: dict) -> dict:
        """
        Calculate Final Risk based on Fusion Formula:
        Risk = 0.30 * TimeSeries + 0.25 * NLP + 0.15 * Anomaly + 0.10 * History + 0.20 * Video
        """
        ts_score = inputs.get("time_series_score", 0.0)
        nlp_score = inputs.get("nlp_score", 0.0)
        anomaly_score = inputs.get("anomaly_score", 0.0)
        history_score = inputs.get("history_score", 0.0)
        video_score = inputs.get("video_score", 0.0)

        final_risk = (
            (self.weights["time_series"] * ts_score) +
            (self.weights["nlp"] * nlp_score) +
            (self.weights["anomaly"] * anomaly_score) +
            (self.weights["history"] * history_score) +
            (self.weights["video"] * video_score)
        )

        return {
            "final_risk": round(final_risk, 2),
            "level": self._get_level(final_risk),
            "breakdown": {
                "time_series": ts_score,
                "nlp": nlp_score,
                "anomaly": anomaly_score,
                "history": history_score,
                "video": video_score
            },
            "formula": "0.30*TS + 0.25*NLP + 0.15*Anomaly + 0.10*History + 0.20*Video"
        }

    def _get_level(self, score):
        if score > 0.8: return "CRITICAL"
        if score > 0.6: return "HIGH"
        if score > 0.4: return "MEDIUM"
        return "LOW"

    # ==========================================
    # Mock Models for Demonstration
    # ==========================================
    
    def simulate_gotri_scenario(self):
        """
        Simulate the specific 'Gotri Road Jam' scenario.
        """
        return self.calculate_risk({
            "time_series_score": 0.95, # Predicts jam in 1 hour
            "nlp_score": 0.95,         # "Gotri road jam ho raha hai"
            "anomaly_score": 0.90,     # Speed drop detected
            "history_score": 0.80,     # Frequent jam spot
            "video_score": 0.85        # Video detection corroborates
        })

    def get_time_series_prediction(self, area_id: int):
        # In real system: Load LSTM model and predict
        # For demo: Return mock trend
        return random.uniform(0.4, 0.9)

    def get_anomaly_score(self, area_id: int):
        # In real system: Z-score of sensor data
        return random.uniform(0.3, 0.8)

    def get_history_score(self, area_id: int):
        # In real system: Query DB for past incident count
        return random.uniform(0.2, 0.6)

    def get_video_score(self, area_id: int):
        # In real system: Run YOLO on latest camera feed for the area
        # Returns normalized detection density score
        return random.uniform(0.1, 0.7)
