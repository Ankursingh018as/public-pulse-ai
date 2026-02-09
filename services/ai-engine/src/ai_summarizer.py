"""
AI City Intelligence Summarizer for Public Pulse
Generates executive-level AI summaries and insights including:
- Real-time city status overview
- Pattern detection across incidents
- Predictive resource allocation recommendations
- Anomaly detection and early warnings
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import Counter
import math

logger = logging.getLogger("ai-summarizer")


class CityIntelligenceSummarizer:
    """
    Generates AI-powered intelligence summaries for city administrators.
    Uses pattern recognition, statistical analysis, and heuristic rules
    to provide actionable insights without requiring external LLM calls.
    """
    
    # Vadodara area data for context-aware summaries
    AREAS = {
        "Alkapuri": {"pop": 45000, "zone": "Central", "critical_infra": True},
        "Gotri": {"pop": 62000, "zone": "West", "critical_infra": False},
        "Akota": {"pop": 38000, "zone": "South", "critical_infra": False},
        "Fatehgunj": {"pop": 55000, "zone": "Central", "critical_infra": True},
        "Manjalpur": {"pop": 72000, "zone": "South", "critical_infra": False},
        "Sayajigunj": {"pop": 48000, "zone": "Central", "critical_infra": True},
        "Karelibaug": {"pop": 52000, "zone": "East", "critical_infra": False},
        "Waghodia Road": {"pop": 41000, "zone": "East", "critical_infra": False},
        "Vasna": {"pop": 35000, "zone": "West", "critical_infra": False},
        "Makarpura": {"pop": 58000, "zone": "South", "critical_infra": True},
    }
    
    ISSUE_PRIORITIES = {
        "water": 0.9,
        "traffic": 0.8,
        "garbage": 0.6,
        "light": 0.5,
        "road": 0.7,
        "noise": 0.3,
    }

    def generate_executive_summary(
        self,
        incidents: List[Dict],
        predictions: List[Dict],
        recent_hours: int = 24,
    ) -> Dict:
        """
        Generate a comprehensive executive summary of city conditions.
        """
        now = datetime.now()
        cutoff = now - timedelta(hours=recent_hours)
        
        # Filter recent incidents
        recent = [i for i in incidents if self._parse_time(i.get("createdAt")) > cutoff]
        
        # Core metrics
        total_active = len([i for i in incidents if not i.get("resolved", False)])
        total_recent = len(recent)
        critical_count = len([i for i in incidents if i.get("severity", 0) >= 0.7 and not i.get("resolved")])
        pending_count = len([i for i in incidents if i.get("status") == "pending"])
        
        # Type distribution
        type_dist = Counter(i.get("event_type") or i.get("type", "other") for i in incidents if not i.get("resolved"))
        
        # Area hotspots
        area_counts = Counter(i.get("area_name", "Unknown") for i in incidents if not i.get("resolved"))
        hotspots = area_counts.most_common(5)
        
        # Trend analysis
        trend = self._calculate_trend(incidents, recent_hours)
        
        # Generate narrative
        narrative = self._generate_narrative(
            total_active, critical_count, pending_count,
            type_dist, hotspots, trend, predictions
        )
        
        # Resource recommendations
        recommendations = self._generate_recommendations(
            incidents, predictions, type_dist, hotspots
        )
        
        # Anomaly detection
        anomalies = self._detect_anomalies(incidents, recent_hours)
        
        # City health score (0-100)
        health_score = self._calculate_health_score(
            total_active, critical_count, trend, len(predictions)
        )
        
        return {
            "timestamp": now.isoformat(),
            "period_hours": recent_hours,
            "health_score": health_score,
            "health_label": self._health_label(health_score),
            "metrics": {
                "total_active": total_active,
                "new_last_period": total_recent,
                "critical": critical_count,
                "pending_review": pending_count,
                "predictions_active": len(predictions),
            },
            "type_distribution": dict(type_dist),
            "hotspot_areas": [
                {"area": area, "incidents": count, "severity": self._area_avg_severity(incidents, area)}
                for area, count in hotspots
            ],
            "trend": trend,
            "narrative": narrative,
            "recommendations": recommendations,
            "anomalies": anomalies,
            "ai_confidence": 0.85,
        }

    def generate_area_briefing(self, area_name: str, incidents: List[Dict]) -> Dict:
        """Generate a focused briefing for a specific area."""
        area_incidents = [i for i in incidents if i.get("area_name") == area_name]
        active = [i for i in area_incidents if not i.get("resolved")]
        
        area_info = self.AREAS.get(area_name, {"pop": 40000, "zone": "Unknown", "critical_infra": False})
        
        type_dist = Counter(i.get("event_type", i.get("type", "other")) for i in active)
        primary_issue = type_dist.most_common(1)[0] if type_dist else ("none", 0)
        
        risk_level = "low"
        if len(active) >= 5 or any(i.get("severity", 0) >= 0.8 for i in active):
            risk_level = "critical"
        elif len(active) >= 3 or any(i.get("severity", 0) >= 0.6 for i in active):
            risk_level = "high"
        elif len(active) >= 1:
            risk_level = "moderate"
        
        return {
            "area": area_name,
            "zone": area_info["zone"],
            "population_affected": area_info["pop"],
            "critical_infrastructure": area_info["critical_infra"],
            "active_incidents": len(active),
            "primary_issue": primary_issue[0],
            "risk_level": risk_level,
            "issue_breakdown": dict(type_dist),
            "recommendation": self._area_recommendation(area_name, active, risk_level),
        }

    def _calculate_trend(self, incidents: List[Dict], hours: int) -> Dict:
        """Calculate incident trend over the specified period."""
        now = datetime.now()
        half = now - timedelta(hours=hours / 2)
        start = now - timedelta(hours=hours)
        
        first_half = len([i for i in incidents 
                         if start < self._parse_time(i.get("createdAt")) <= half])
        second_half = len([i for i in incidents 
                          if half < self._parse_time(i.get("createdAt")) <= now])
        
        if first_half == 0:
            change_pct = 100 if second_half > 0 else 0
        else:
            change_pct = round(((second_half - first_half) / first_half) * 100)
        
        direction = "increasing" if change_pct > 10 else "decreasing" if change_pct < -10 else "stable"
        
        return {
            "direction": direction,
            "change_percent": change_pct,
            "first_half_count": first_half,
            "second_half_count": second_half,
        }

    def _generate_narrative(
        self, total_active: int, critical: int, pending: int,
        type_dist: Counter, hotspots: list, trend: Dict, predictions: list
    ) -> str:
        """Generate a human-readable narrative summary."""
        parts = []
        
        # Overall status
        if critical >= 3:
            parts.append(f"⚠️ ALERT: {critical} critical incidents require immediate attention.")
        elif total_active == 0:
            parts.append("✅ City systems operating normally. No active incidents reported.")
        else:
            parts.append(f"📊 Currently tracking {total_active} active incident{'s' if total_active != 1 else ''}.")
        
        # Primary issue type
        if type_dist:
            top_type, top_count = type_dist.most_common(1)[0]
            type_labels = {"traffic": "traffic congestion", "water": "water/drainage issues",
                          "garbage": "waste management", "light": "streetlight outages",
                          "road": "road damage", "noise": "noise complaints"}
            parts.append(f"Primary concern: {type_labels.get(top_type, top_type)} ({top_count} reports).")
        
        # Hotspot alert
        if hotspots and hotspots[0][1] >= 3:
            parts.append(f"🔥 Hotspot: {hotspots[0][0]} area with {hotspots[0][1]} active issues.")
        
        # Trend
        if trend["direction"] == "increasing":
            parts.append(f"📈 Incident rate is increasing ({trend['change_percent']}% in the last period).")
        elif trend["direction"] == "decreasing":
            parts.append(f"📉 Incident rate decreasing ({abs(trend['change_percent'])}% improvement).")
        
        # Pending approvals
        if pending > 0:
            parts.append(f"⏳ {pending} incident{'s' if pending != 1 else ''} awaiting admin review.")
        
        # Predictions
        if predictions:
            high_risk = [p for p in predictions if p.get("probability", 0) > 0.7]
            if high_risk:
                parts.append(f"🔮 AI predicts {len(high_risk)} high-risk event{'s' if len(high_risk) != 1 else ''} in the coming hours.")
        
        return " ".join(parts)

    def _generate_recommendations(
        self, incidents: list, predictions: list,
        type_dist: Counter, hotspots: list
    ) -> List[Dict]:
        """Generate actionable resource allocation recommendations."""
        recs = []
        
        # Based on incident volume in hotspots
        for area, count in hotspots[:3]:
            if count >= 3:
                area_incidents = [i for i in incidents if i.get("area_name") == area and not i.get("resolved")]
                types = Counter(i.get("event_type", i.get("type")) for i in area_incidents)
                primary = types.most_common(1)[0][0] if types else "general"
                
                resource_map = {
                    "traffic": "traffic police deployment",
                    "water": "drainage/water supply team",
                    "garbage": "sanitation crew dispatch",
                    "light": "electrical maintenance team",
                    "road": "road repair crew",
                }
                
                recs.append({
                    "priority": "high" if count >= 5 else "medium",
                    "area": area,
                    "action": f"Deploy {resource_map.get(primary, 'response team')} to {area}",
                    "reason": f"{count} active incidents, primarily {primary}",
                    "estimated_impact": f"Affects ~{self.AREAS.get(area, {}).get('pop', 40000):,} residents",
                })
        
        # Based on predictions
        for pred in predictions[:3]:
            if pred.get("probability", 0) > 0.6:
                area = pred.get("area_name", "Unknown")
                recs.append({
                    "priority": "medium",
                    "area": area,
                    "action": f"Pre-position resources for predicted {pred.get('type', 'incident')} in {area}",
                    "reason": f"AI prediction: {round(pred.get('probability', 0) * 100)}% probability",
                    "estimated_impact": "Proactive prevention",
                })
        
        # Time-based recommendations
        hour = datetime.now().hour
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            if type_dist.get("traffic", 0) >= 2:
                recs.append({
                    "priority": "medium",
                    "area": "City-wide",
                    "action": "Activate peak-hour traffic management protocol",
                    "reason": f"Rush hour period with {type_dist.get('traffic', 0)} traffic incidents",
                    "estimated_impact": "Reduced commute delays",
                })
        
        return recs[:5]

    def _detect_anomalies(self, incidents: List[Dict], hours: int) -> List[Dict]:
        """Detect unusual patterns in incident data."""
        anomalies = []
        now = datetime.now()
        cutoff = now - timedelta(hours=hours)
        
        recent = [i for i in incidents if self._parse_time(i.get("createdAt")) > cutoff]
        
        # Check for unusual clustering by type
        type_counts = Counter(i.get("event_type", i.get("type")) for i in recent)
        total = len(recent)
        
        for issue_type, count in type_counts.items():
            if total > 0:
                ratio = count / total
                # If one type makes up >60% of all incidents, that's anomalous
                if ratio > 0.6 and count >= 3:
                    anomalies.append({
                        "type": "type_spike",
                        "severity": "warning",
                        "description": f"Unusual spike in {issue_type} incidents ({count} of {total}, {round(ratio*100)}%)",
                        "affected_type": issue_type,
                        "recommendation": f"Investigate root cause of {issue_type} surge",
                    })
        
        # Check for geographic clustering
        area_counts = Counter(i.get("area_name", "Unknown") for i in recent)
        for area, count in area_counts.items():
            if count >= 4 and total > 0 and (count / total) > 0.4:
                anomalies.append({
                    "type": "area_cluster",
                    "severity": "warning", 
                    "description": f"Geographic incident cluster detected in {area} ({count} incidents)",
                    "affected_area": area,
                    "recommendation": f"Deploy additional monitoring to {area}",
                })
        
        # Check for rapid incident rate
        if len(recent) >= 10:
            # More than 10 incidents in the period is unusual
            rate_per_hour = len(recent) / max(hours, 1)
            if rate_per_hour > 2:
                anomalies.append({
                    "type": "rate_spike",
                    "severity": "critical" if rate_per_hour > 5 else "warning",
                    "description": f"High incident rate: {round(rate_per_hour, 1)} per hour (normal: ~0.5/hr)",
                    "recommendation": "Activate emergency response protocol",
                })
        
        return anomalies

    def _calculate_health_score(
        self, active: int, critical: int, trend: Dict, predictions: int
    ) -> int:
        """Calculate overall city health score (0-100)."""
        score = 100
        
        # Deduct for active incidents
        score -= min(30, active * 2)
        
        # Deduct more for critical
        score -= min(25, critical * 8)
        
        # Deduct for increasing trend
        if trend["direction"] == "increasing":
            score -= min(15, abs(trend["change_percent"]) // 5)
        elif trend["direction"] == "decreasing":
            score += min(10, abs(trend["change_percent"]) // 10)
        
        # Deduct for high-risk predictions
        score -= min(10, predictions * 2)
        
        return max(0, min(100, score))

    def _health_label(self, score: int) -> str:
        if score >= 85: return "Excellent"
        if score >= 70: return "Good"
        if score >= 55: return "Fair"
        if score >= 40: return "Concerning"
        return "Critical"

    def _area_avg_severity(self, incidents: list, area: str) -> float:
        area_incs = [i for i in incidents if i.get("area_name") == area and not i.get("resolved")]
        if not area_incs:
            return 0
        return round(sum(i.get("severity", 0.5) for i in area_incs) / len(area_incs), 2)

    def _area_recommendation(self, area: str, active: list, risk_level: str) -> str:
        if risk_level == "critical":
            return f"Immediate response required in {area}. Escalate to zone commander."
        if risk_level == "high":
            return f"Increased monitoring and resource allocation recommended for {area}."
        if risk_level == "moderate":
            return f"Standard response protocols active for {area}. Monitor for escalation."
        return f"{area} operating normally. Continue routine monitoring."

    @staticmethod
    def _parse_time(ts) -> datetime:
        """Parse various timestamp formats."""
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, (int, float)):
            # Unix timestamp in milliseconds or seconds
            if ts > 1e12:
                return datetime.fromtimestamp(ts / 1000)
            return datetime.fromtimestamp(ts)
        if isinstance(ts, str):
            try:
                # Normalize timezone: replace Z with +00:00 for ISO parsing,
                # then strip timezone info for naive datetime comparison
                normalized = ts.replace('Z', '+00:00')
                parsed = datetime.fromisoformat(normalized)
                return parsed.replace(tzinfo=None)
            except (ValueError, TypeError):
                pass
        return datetime.now() - timedelta(hours=1)  # Default to 1 hour ago
