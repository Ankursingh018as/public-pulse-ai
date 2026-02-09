import logging
import random
from datetime import datetime

logger = logging.getLogger("fusion-engine")

class FusionEngine:
    def __init__(self):
        self.weights = {
            "time_series": 0.25,
            "nlp": 0.20,
            "anomaly": 0.15,
            "history": 0.10,
            "video": 0.15,
            "weather": 0.10,
            "temporal": 0.05,
        }

    def calculate_risk(self, inputs: dict) -> dict:
        """
        Calculate Final Risk based on Enhanced Multi-Modal Fusion Formula:
        Risk = 0.25*TS + 0.20*NLP + 0.15*Anomaly + 0.10*History + 0.15*Video + 0.10*Weather + 0.05*Temporal
        """
        ts_score = inputs.get("time_series_score", 0.0)
        nlp_score = inputs.get("nlp_score", 0.0)
        anomaly_score = inputs.get("anomaly_score", 0.0)
        history_score = inputs.get("history_score", 0.0)
        video_score = inputs.get("video_score", 0.0)
        weather_score = inputs.get("weather_score", 0.0)
        temporal_score = inputs.get("temporal_score", 0.0)

        # If weather/temporal not provided, estimate from correlated signals.
        # Time-series and anomaly scores correlate with weather impact (e.g., flooding
        # spikes both time-series predictions and anomaly detection during rain events).
        if weather_score == 0.0 and "weather_score" not in inputs:
            weather_score = (ts_score + anomaly_score) / 2
        if temporal_score == 0.0 and "temporal_score" not in inputs:
            temporal_score = self._get_temporal_factor()

        final_risk = (
            (self.weights["time_series"] * ts_score) +
            (self.weights["nlp"] * nlp_score) +
            (self.weights["anomaly"] * anomaly_score) +
            (self.weights["history"] * history_score) +
            (self.weights["video"] * video_score) +
            (self.weights["weather"] * weather_score) +
            (self.weights["temporal"] * temporal_score)
        )

        # Cross-signal correlation boost
        correlation_boost = self._calculate_correlation_boost(inputs)
        final_risk = min(1.0, final_risk + correlation_boost)

        return {
            "final_risk": round(final_risk, 2),
            "level": self._get_level(final_risk),
            "breakdown": {
                "time_series": round(ts_score, 2),
                "nlp": round(nlp_score, 2),
                "anomaly": round(anomaly_score, 2),
                "history": round(history_score, 2),
                "video": round(video_score, 2),
                "weather": round(weather_score, 2),
                "temporal": round(temporal_score, 2),
            },
            "correlation_boost": round(correlation_boost, 3),
            "formula": "0.25*TS + 0.20*NLP + 0.15*Anomaly + 0.10*History + 0.15*Video + 0.10*Weather + 0.05*Temporal + Correlation"
        }

    def _calculate_correlation_boost(self, inputs: dict) -> float:
        """
        If multiple signals agree (high scores), the combined risk should be
        higher than the weighted sum — corroborating evidence increases confidence.
        """
        scores = [
            inputs.get("time_series_score", 0),
            inputs.get("nlp_score", 0),
            inputs.get("anomaly_score", 0),
            inputs.get("video_score", 0),
        ]
        high_signals = sum(1 for s in scores if s > 0.6)
        
        if high_signals >= 3:
            return 0.08  # Strong multi-signal agreement
        if high_signals >= 2:
            return 0.04  # Moderate agreement
        return 0.0

    def _get_temporal_factor(self) -> float:
        """
        Calculate time-of-day risk factor.
        Higher risk during rush hours, lower at night.
        """
        hour = datetime.now().hour
        # Rush hours: 8-10 AM and 5-8 PM
        if 8 <= hour <= 10 or 17 <= hour <= 20:
            return 0.8
        # Late night: lower activity
        if 22 <= hour or hour <= 5:
            return 0.3
        # Normal hours
        return 0.5

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
