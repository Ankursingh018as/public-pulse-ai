/**
 * Groq LLM Service for AI Narration
 * Generates real-time explanations for city incidents
 */

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface Incident {
  id: string;
  event_type: string;
  lat: number;
  lng: number;
  severity: number;
  radius: number;
  verified: number;
  resolved: boolean;
  createdAt: number;
}

export interface NarrationResult {
  text: string;
  incident: Incident;
  timestamp: number;
}

/**
 * Generate AI narration for an incident using Groq's LLM
 */
export async function generateNarration(incident: Incident, context?: {
  weatherRisk?: number;
  nearbyIncidents?: number;
  recentTrend?: string;
}): Promise<string> {
  // Skip API call if no key configured
  if (!GROQ_API_KEY) {
    return getFallbackNarration(incident);
  }

  const severityLabel = incident.severity >= 0.7 ? 'high' : incident.severity >= 0.4 ? 'moderate' : 'low';
  const verificationStatus = incident.verified > 0 
    ? `Verified by ${incident.verified} citizen${incident.verified > 1 ? 's' : ''}`
    : 'Unverified';

  const typeDescriptions: Record<string, string> = {
    traffic: 'traffic congestion detected',
    garbage: 'waste overflow reported',
    water: 'waterlogging or drainage issue',
    light: 'streetlight malfunction'
  };

  const prompt = `You are an AI assistant for a smart city monitoring system in Vadodara, India. Generate a brief, actionable insight (2-3 sentences max) for citizens about this incident:

Incident Type: ${incident.event_type} - ${typeDescriptions[incident.event_type] || 'civic issue'}
Severity: ${severityLabel} (${Math.round(incident.severity * 100)}%)
Status: ${verificationStatus}
Location: Near coordinates ${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}
Affected Radius: ~${Math.round(incident.radius)}m
${context?.weatherRisk ? `Rain Probability: ${context.weatherRisk}%` : ''}
${context?.nearbyIncidents ? `Nearby Active Issues: ${context.nearbyIncidents}` : ''}

Provide a helpful, concise explanation of what's happening and any recommended actions for citizens. Be specific and practical.`;

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
          {
            role: 'system',
            content: 'You are a smart city AI assistant. Keep responses under 50 words, be direct and helpful.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return getFallbackNarration(incident);
    }

    const data = await response.json();
    const narration = data.choices?.[0]?.message?.content?.trim();
    
    if (!narration) {
      return getFallbackNarration(incident);
    }

    return narration;
  } catch (error) {
    console.error('Failed to generate narration:', error);
    return getFallbackNarration(incident);
  }
}

/**
 * Fallback narration when API is unavailable
 */
function getFallbackNarration(incident: Incident): string {
  const templates: Record<string, string[]> = {
    traffic: [
      `Traffic congestion detected with ${Math.round(incident.severity * 100)}% severity. Consider alternate routes.`,
      `Slow movement reported in this area. Expected delays of 15-30 minutes.`,
      `Traffic buildup forming. AI predicts expansion over the next hour.`
    ],
    garbage: [
      `Waste overflow reported at ${Math.round(incident.severity * 100)}% capacity. Sanitation team notified.`,
      `Garbage collection needed. ${incident.verified > 0 ? `Confirmed by ${incident.verified} citizens.` : 'Awaiting verification.'}`,
      `Smart bin overflow detected. Municipal services alerted.`
    ],
    water: [
      `Waterlogging detected with ${Math.round(incident.radius)}m affected area. Use caution.`,
      `Drainage issue reported. Avoid low-lying sections if possible.`,
      `Water accumulation forming. ${incident.severity >= 0.6 ? 'May worsen with rain.' : 'Currently manageable.'}`
    ],
    light: [
      `Streetlight malfunction reported. Maintenance scheduled.`,
      `Lighting issue detected. Exercise caution after dark.`,
      `Infrastructure alert: Street lighting needs attention in this zone.`
    ]
  };

  const typeTemplates = templates[incident.event_type] || templates.traffic;
  return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
}

/**
 * Batch generate narrations for multiple significant incidents
 */
export async function generateBatchNarrations(
  incidents: Incident[],
  maxNarrations: number = 3
): Promise<NarrationResult[]> {
  // Filter to most significant incidents
  const significant = incidents
    .filter(inc => inc.severity >= 0.5 || inc.verified > 0)
    .sort((a, b) => (b.severity + b.verified * 0.2) - (a.severity + a.verified * 0.2))
    .slice(0, maxNarrations);

  const results: NarrationResult[] = [];

  for (const incident of significant) {
    const text = await generateNarration(incident);
    results.push({
      text,
      incident,
      timestamp: Date.now()
    });
    // Small delay between API calls
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}
