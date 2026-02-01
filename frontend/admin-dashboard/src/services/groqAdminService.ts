/**
 * Groq LLM Service for Admin AI Narration
 * Generates real-time analysis and recommendations for city incidents
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
  citizenVotes: { yes: number; no: number; photo: number };
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  resolved: boolean;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface NarrationResult {
  text: string;
  incident: Incident;
  timestamp: number;
  recommendation?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Generate AI narration and recommendation for admin dashboard
 */
export async function generateAdminNarration(incident: Incident, context?: {
  weatherRisk?: number;
  nearbyIncidents?: number;
  pendingApprovals?: number;
  avgResponseTime?: number;
}): Promise<{ narration: string; recommendation: string; priority: string }> {
  const severityLabel = incident.severity >= 0.7 ? 'critical' : incident.severity >= 0.4 ? 'high' : 'moderate';
  const verificationStatus = incident.verified > 0 
    ? `${incident.verified} citizen confirmations`
    : 'No citizen verification yet';
  
  const voteRatio = incident.citizenVotes.yes + incident.citizenVotes.no > 0
    ? Math.round((incident.citizenVotes.yes / (incident.citizenVotes.yes + incident.citizenVotes.no)) * 100)
    : 0;

  const typeDescriptions: Record<string, string> = {
    traffic: 'traffic congestion',
    garbage: 'waste overflow/garbage collection issue',
    water: 'waterlogging/drainage problem',
    light: 'streetlight malfunction',
    road: 'road damage or obstruction',
    encroachment: 'illegal encroachment',
    animals: 'stray animal concern'
  };

  const prompt = `You are an AI city operations analyst for Vadodara Municipal Corporation. Analyze this incident and provide:
1. A brief situation assessment (2 sentences)
2. A specific action recommendation for the admin

Incident Details:
- Type: ${incident.event_type} - ${typeDescriptions[incident.event_type] || 'civic issue'}
- Severity: ${severityLabel} (${Math.round(incident.severity * 100)}%)
- Status: ${incident.status.toUpperCase()}
- Citizen Votes: ${incident.citizenVotes.yes} confirmed, ${incident.citizenVotes.no} denied, ${incident.citizenVotes.photo} with photos
- Trust Score: ${voteRatio}%
- Affected Radius: ~${Math.round(incident.radius)}m
- Location: ${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}
${context?.nearbyIncidents ? `- Nearby Active Issues: ${context.nearbyIncidents}` : ''}
${context?.pendingApprovals ? `- Pending Approvals in Queue: ${context.pendingApprovals}` : ''}

Respond in JSON format: {"assessment": "...", "recommendation": "...", "priority": "critical|high|medium|low"}`;

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
            content: 'You are a smart city operations AI. Respond only with valid JSON. Be direct and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 200,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return getFallbackAdminNarration(incident);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    try {
      const parsed = JSON.parse(content);
      
      // Handle recommendation being an object or string
      let recommendationText = parsed.recommendation;
      if (typeof recommendationText === 'object' && recommendationText !== null) {
        // If recommendation is an object (e.g., {urgency: ..., action: ...}), convert to string
        recommendationText = recommendationText.action || recommendationText.urgency || JSON.stringify(recommendationText);
      }
      
      return {
        narration: parsed.assessment || getFallbackAdminNarration(incident).narration,
        recommendation: recommendationText || 'Review and take appropriate action.',
        priority: parsed.priority || (incident.severity >= 0.7 ? 'critical' : 'medium')
      };
    } catch {
      return getFallbackAdminNarration(incident);
    }
  } catch (error) {
    console.error('Failed to generate admin narration:', error);
    return getFallbackAdminNarration(incident);
  }
}

/**
 * Fallback narration for admin when API unavailable
 */
function getFallbackAdminNarration(incident: Incident): { narration: string; recommendation: string; priority: string } {
  const templates: Record<string, { narration: string; recommendation: string }> = {
    traffic: {
      narration: `Traffic congestion at ${Math.round(incident.severity * 100)}% severity with ${incident.citizenVotes.yes} citizen confirmations. Pattern suggests rush hour buildup.`,
      recommendation: incident.severity >= 0.6 ? 'Deploy traffic personnel and consider signal timing adjustment.' : 'Monitor for escalation.'
    },
    garbage: {
      narration: `Waste overflow reported with ${incident.citizenVotes.yes} confirmations. Sanitation response needed within ${incident.severity >= 0.6 ? '2' : '4'} hours.`,
      recommendation: 'Dispatch sanitation crew to affected area.'
    },
    water: {
      narration: `Waterlogging detected affecting ~${Math.round(incident.radius)}m radius. ${incident.citizenVotes.photo} photos submitted for verification.`,
      recommendation: incident.severity >= 0.5 ? 'Alert drainage team and issue citizen advisory.' : 'Schedule routine inspection.'
    },
    light: {
      narration: `Streetlight malfunction reported. ${incident.verified} citizens have confirmed the issue.`,
      recommendation: 'Add to electrical maintenance queue for next shift.'
    }
  };

  const template = templates[incident.event_type] || {
    narration: `Civic issue detected at ${Math.round(incident.severity * 100)}% severity with ${incident.citizenVotes.yes} confirmations.`,
    recommendation: 'Review incident details and assign to appropriate department.'
  };

  return {
    ...template,
    priority: incident.severity >= 0.7 ? 'critical' : incident.severity >= 0.5 ? 'high' : 'medium'
  };
}

/**
 * Generate batch analysis for admin dashboard summary
 */
export async function generateDashboardSummary(incidents: Incident[]): Promise<string> {
  const pending = incidents.filter(i => i.status === 'pending').length;
  const critical = incidents.filter(i => i.severity >= 0.7).length;
  const highVerified = incidents.filter(i => i.citizenVotes.yes >= 3).length;

  const prompt = `Summarize the city's current status in one brief sentence for an admin dashboard:
- ${incidents.length} total active incidents
- ${pending} awaiting approval
- ${critical} critical severity
- ${highVerified} with strong citizen verification
Be concise and professional.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 60
      })
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || `${incidents.length} active incidents, ${pending} pending approval.`;
  } catch {
    return `${incidents.length} active incidents, ${pending} pending admin approval, ${critical} critical.`;
  }
}
