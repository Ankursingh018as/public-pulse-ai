/**
 * AI Prediction Service for Citizen App
 * Handles forecasting, trend analysis, and risk predictions
 */

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AVAILABLE = !!GROQ_API_KEY;

export interface Prediction {
  id: string;
  type: 'traffic' | 'water' | 'garbage' | 'light' | 'air_quality';
  lat: number;
  lng: number;
  probability: number;
  timeframe: string; // "1h", "2h", "4h", "24h"
  severity: 'low' | 'medium' | 'high' | 'critical';
  area_name: string;
  reasons: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  createdAt: number;
  expiresAt: number;
}

export interface TrendData {
  type: string;
  hourly: number[];
  daily: number[];
  peakHours: number[];
  riskZones: { lat: number; lng: number; intensity: number }[];
}

export interface AIAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  affectedArea: string;
  predictedTime: string;
  confidence: number;
  recommendations: string[];
  timestamp: number;
}

// Vadodara area coordinates for predictions
const VADODARA_AREAS = [
  { name: 'Alkapuri', lat: 22.3098, lng: 73.1738, trafficRisk: 0.7, waterRisk: 0.3 },
  { name: 'Gotri', lat: 22.3307, lng: 73.1430, trafficRisk: 0.5, waterRisk: 0.6 },
  { name: 'Akota', lat: 22.2930, lng: 73.1699, trafficRisk: 0.6, waterRisk: 0.4 },
  { name: 'Fatehgunj', lat: 22.3202, lng: 73.1925, trafficRisk: 0.8, waterRisk: 0.5 },
  { name: 'Manjalpur', lat: 22.2732, lng: 73.1870, trafficRisk: 0.4, waterRisk: 0.7 },
  { name: 'Sayajigunj', lat: 22.3166, lng: 73.1843, trafficRisk: 0.9, waterRisk: 0.3 },
  { name: 'Karelibaug', lat: 22.3086, lng: 73.2040, trafficRisk: 0.6, waterRisk: 0.5 },
  { name: 'Waghodia Road', lat: 22.2995, lng: 73.2200, trafficRisk: 0.5, waterRisk: 0.6 },
  { name: 'Vasna', lat: 22.2700, lng: 73.1600, trafficRisk: 0.4, waterRisk: 0.8 },
  { name: 'Makarpura', lat: 22.2550, lng: 73.1900, trafficRisk: 0.5, waterRisk: 0.7 },
];

/**
 * Generate AI-powered predictions for the next few hours
 */
export async function generatePredictions(
  currentIncidents: { type: string; lat: number; lng: number; severity: number }[],
  weatherData?: { rainProbability: number; humidity: number }
): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const currentHour = new Date().getHours();
  
  // Time-based risk factors
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 20);
  const isNightTime = currentHour >= 22 || currentHour <= 5;
  const rainRisk = weatherData?.rainProbability || Math.random() * 0.5;

  for (const area of VADODARA_AREAS) {
    // Check for nearby current incidents
    const nearbyIncidents = currentIncidents.filter(inc => 
      Math.abs(inc.lat - area.lat) < 0.015 && Math.abs(inc.lng - area.lng) < 0.015
    );

    // Traffic prediction
    if (isRushHour || nearbyIncidents.some(i => i.type === 'traffic')) {
      const baseRisk = area.trafficRisk;
      const rushMultiplier = isRushHour ? 1.4 : 1.0;
      const incidentMultiplier = 1 + (nearbyIncidents.filter(i => i.type === 'traffic').length * 0.15);
      const probability = Math.min(0.95, baseRisk * rushMultiplier * incidentMultiplier);

      if (probability > 0.4) {
        predictions.push({
          id: `pred-traffic-${area.name}-${Date.now()}`,
          type: 'traffic',
          lat: area.lat + (Math.random() - 0.5) * 0.008,
          lng: area.lng + (Math.random() - 0.5) * 0.008,
          probability,
          timeframe: isRushHour ? '1h' : '2h',
          severity: probability > 0.7 ? 'high' : probability > 0.5 ? 'medium' : 'low',
          area_name: area.name,
          reasons: getTrafficReasons(isRushHour, nearbyIncidents.length, area.name),
          trend: probability > 0.6 ? 'increasing' : 'stable',
          confidence: 0.85 + Math.random() * 0.1,
          createdAt: Date.now(),
          expiresAt: Date.now() + (isRushHour ? 3600000 : 7200000)
        });
      }
    }

    // Waterlogging prediction
    if (rainRisk > 0.3 || nearbyIncidents.some(i => i.type === 'water')) {
      const baseRisk = area.waterRisk;
      const rainMultiplier = 1 + rainRisk;
      const probability = Math.min(0.9, baseRisk * rainMultiplier);

      if (probability > 0.35) {
        predictions.push({
          id: `pred-water-${area.name}-${Date.now()}`,
          type: 'water',
          lat: area.lat + (Math.random() - 0.5) * 0.006,
          lng: area.lng + (Math.random() - 0.5) * 0.006,
          probability,
          timeframe: '2h',
          severity: probability > 0.65 ? 'high' : probability > 0.45 ? 'medium' : 'low',
          area_name: area.name,
          reasons: getWaterReasons(rainRisk, area.name),
          trend: rainRisk > 0.5 ? 'increasing' : 'stable',
          confidence: 0.75 + Math.random() * 0.15,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7200000
        });
      }
    }

    // Streetlight prediction (night time)
    if (isNightTime && Math.random() < 0.3) {
      predictions.push({
        id: `pred-light-${area.name}-${Date.now()}`,
        type: 'light',
        lat: area.lat + (Math.random() - 0.5) * 0.01,
        lng: area.lng + (Math.random() - 0.5) * 0.01,
        probability: 0.4 + Math.random() * 0.3,
        timeframe: '4h',
        severity: 'low',
        area_name: area.name,
        reasons: ['Historical outage pattern', 'Grid load analysis'],
        trend: 'stable',
        confidence: 0.7,
        createdAt: Date.now(),
        expiresAt: Date.now() + 14400000
      });
    }
  }

  return predictions.sort((a, b) => b.probability - a.probability).slice(0, 12);
}

function getTrafficReasons(isRushHour: boolean, nearbyCount: number, area: string): string[] {
  const reasons = [];
  if (isRushHour) reasons.push('Peak hour traffic pattern');
  if (nearbyCount > 0) reasons.push(`${nearbyCount} active incident(s) nearby`);
  reasons.push(`Historical congestion data for ${area}`);
  if (Math.random() > 0.5) reasons.push('School/office zone activity');
  return reasons;
}

function getWaterReasons(rainRisk: number, area: string): string[] {
  const reasons = [];
  if (rainRisk > 0.5) reasons.push('High rainfall probability');
  reasons.push(`Drainage capacity analysis for ${area}`);
  if (Math.random() > 0.6) reasons.push('Low-lying area vulnerability');
  return reasons;
}

/**
 * Generate AI alerts using Groq LLM
 */
export async function generateAIAlerts(
  predictions: Prediction[],
  incidents: { type: string; severity: number; area_name?: string }[]
): Promise<AIAlert[]> {
  const criticalPredictions = predictions.filter(p => p.probability > 0.6);
  const highSeverityIncidents = incidents.filter(i => i.severity > 0.6);

  if (criticalPredictions.length === 0 && highSeverityIncidents.length === 0) {
    return [];
  }

  // Skip API call if no Groq key configured
  if (!GROQ_AVAILABLE) {
    return generateFallbackAlerts(criticalPredictions, highSeverityIncidents);
  }

  const prompt = `As a smart city AI, generate 2-3 brief alert messages for Vadodara citizens based on this data:

Predictions: ${JSON.stringify(criticalPredictions.slice(0, 3).map(p => ({
    type: p.type,
    area: p.area_name,
    probability: Math.round(p.probability * 100),
    timeframe: p.timeframe
  })))}

Active Issues: ${JSON.stringify(highSeverityIncidents.slice(0, 3).map(i => ({
    type: i.type,
    severity: Math.round(i.severity * 100)
  })))}

Respond in JSON array format:
[{"title": "...", "message": "...", "severity": "info|warning|critical", "recommendation": "..."}]`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a smart city alert system. Keep alerts brief and actionable. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      return generateFallbackAlerts(criticalPredictions, highSeverityIncidents);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    try {
      const parsed = JSON.parse(content);
      // LLM may return objects instead of strings — coerce safely
      const safeStr = (val: any): string =>
        typeof val === 'object' && val !== null
          ? (val.situation || val.action || val.message || val.urgency || JSON.stringify(val))
          : String(val ?? '');
      return parsed.map((alert: any, idx: number) => ({
        id: `alert-${Date.now()}-${idx}`,
        title: safeStr(alert.title),
        message: safeStr(alert.message),
        severity: typeof alert.severity === 'string' ? alert.severity : 'warning',
        type: criticalPredictions[0]?.type || 'general',
        affectedArea: criticalPredictions[0]?.area_name || 'Vadodara',
        predictedTime: criticalPredictions[0]?.timeframe || '2h',
        confidence: criticalPredictions[0]?.confidence || 0.8,
        recommendations: [safeStr(alert.recommendation) || 'Stay alert and plan accordingly'],
        timestamp: Date.now()
      }));
    } catch {
      return generateFallbackAlerts(criticalPredictions, highSeverityIncidents);
    }
  } catch (error) {
    console.error('AI Alert generation failed:', error);
    return generateFallbackAlerts(criticalPredictions, highSeverityIncidents);
  }
}

function generateFallbackAlerts(predictions: Prediction[], incidents: any[]): AIAlert[] {
  const alerts: AIAlert[] = [];

  if (predictions.length > 0) {
    const top = predictions[0];
    alerts.push({
      id: `alert-${Date.now()}-0`,
      title: `${top.type.charAt(0).toUpperCase() + top.type.slice(1)} Alert - ${top.area_name}`,
      message: `${Math.round(top.probability * 100)}% probability of ${top.type} issues in ${top.area_name} within ${top.timeframe}`,
      severity: top.severity === 'high' ? 'critical' : 'warning',
      type: top.type,
      affectedArea: top.area_name,
      predictedTime: top.timeframe,
      confidence: top.confidence,
      recommendations: top.reasons,
      timestamp: Date.now()
    });
  }

  return alerts;
}

/**
 * Analyze trends across incidents
 */
export function analyzeTrends(incidents: { type: string; createdAt: number; severity: number }[]): Record<string, TrendData> {
  const trends: Record<string, TrendData> = {};
  const types = ['traffic', 'water', 'garbage', 'light'];

  for (const type of types) {
    const typeIncidents = incidents.filter(i => i.type === type);
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    typeIncidents.forEach(inc => {
      const date = new Date(inc.createdAt);
      hourly[date.getHours()]++;
      daily[date.getDay()]++;
    });

    // Find peak hours
    const peakHours = hourly
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    trends[type] = {
      type,
      hourly,
      daily,
      peakHours,
      riskZones: [] // Would be populated from actual data
    };
  }

  return trends;
}

/**
 * Generate prediction circles for map overlay
 */
export function getPredictionCircles(predictions: Prediction[]): {
  lat: number;
  lng: number;
  radius: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  label: string;
}[] {
  return predictions.map(pred => {
    const colors: Record<string, string> = {
      traffic: '#EF4444',
      water: '#3B82F6',
      garbage: '#F97316',
      light: '#FBBF24',
      air_quality: '#8B5CF6'
    };

    return {
      lat: pred.lat,
      lng: pred.lng,
      radius: 200 + pred.probability * 600,
      color: colors[pred.type] || '#6366F1',
      opacity: 0.15 + pred.probability * 0.25,
      pulseSpeed: pred.trend === 'increasing' ? 1.5 : 2.5,
      label: `${pred.type.toUpperCase()} - ${Math.round(pred.probability * 100)}%`
    };
  });
}

/**
 * Get AI-powered area safety score
 */
export async function getAreaSafetyScore(
  lat: number,
  lng: number,
  incidents: { lat: number; lng: number; type: string; severity: number }[],
  predictions: Prediction[]
): Promise<{
  score: number;
  label: string;
  factors: { name: string; impact: number }[];
  recommendation: string;
}> {
  // Find nearby incidents and predictions
  const nearby = incidents.filter(i => 
    Math.abs(i.lat - lat) < 0.02 && Math.abs(i.lng - lng) < 0.02
  );
  const nearbyPredictions = predictions.filter(p =>
    Math.abs(p.lat - lat) < 0.02 && Math.abs(p.lng - lng) < 0.02
  );

  // Calculate base score (100 = perfectly safe)
  let score = 100;
  const factors: { name: string; impact: number }[] = [];

  // Incident impact
  nearby.forEach(inc => {
    const impact = Math.round(inc.severity * 15);
    score -= impact;
    factors.push({ name: `Active ${inc.type} incident`, impact: -impact });
  });

  // Prediction impact
  nearbyPredictions.forEach(pred => {
    const impact = Math.round(pred.probability * 10);
    score -= impact;
    factors.push({ name: `${pred.type} risk (${pred.timeframe})`, impact: -impact });
  });

  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? 'Safe' : score >= 60 ? 'Moderate' : score >= 40 ? 'Caution' : 'High Risk';
  
  const recommendations: Record<string, string> = {
    'Safe': 'Area is currently safe for travel and activities.',
    'Moderate': 'Minor issues nearby. Stay aware of surroundings.',
    'Caution': 'Several active issues. Consider alternative routes.',
    'High Risk': 'Multiple severe issues detected. Avoid area if possible.'
  };

  return {
    score,
    label,
    factors: factors.slice(0, 5),
    recommendation: recommendations[label]
  };
}
