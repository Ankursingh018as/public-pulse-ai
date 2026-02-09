// Admin Dashboard Data Service
// Centralized data fetching with history support

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface Incident {
  id: string;
  type: string;
  event_type?: string;
  lat: number;
  lng: number;
  severity: number;
  radius: number;
  verified: number;
  resolved: boolean;
  description?: string;
  source: string;
  createdAt: number;
  updatedAt?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'resolved';
  adminNotes?: string;
  verifications?: Verification[];
}

export interface Verification {
  id: string;
  incidentId: string;
  userId: string;
  response: 'yes' | 'no' | 'partial';
  hasPhoto: boolean;
  photoUrl?: string;
  timestamp: number;
  location?: { lat: number; lng: number };
}

export interface Prediction {
  id: string;
  type: string;
  event_type?: string;
  lat: number;
  lng: number;
  probability: number;
  severity: number;
  area_name?: string;
  timeframe?: string;
  confidence: number;
  reasons?: string[];
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  type: string;
  event_type?: string;
  lat: number;
  lng: number;
  description?: string;
  source: string;
  userId?: string;
  status: string;
  area_name?: string;
  _serverId?: string;
  _synced?: boolean;
  _ts: number;
  createdAt?: number;
  adminAction?: {
    action: string;
    by: string;
    timestamp: number;
    notes?: string;
  };
}

export interface DashboardStats {
  totalIncidents: number;
  pendingApproval: number;
  verified: number;
  resolved: number;
  activePredictions: number;
  citizenReports: number;
  aiDetections: number;
}

// Fetch all incidents
export async function fetchIncidents(options?: {
  status?: string;
  type?: string;
  since?: number;
  limit?: number;
}): Promise<Incident[]> {
  try {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.type) params.set('type', options.type);
    if (options?.since) params.set('since', options.since.toString());
    if (options?.limit) params.set('limit', options.limit.toString());

    const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || data || [];
  } catch (e) {
    console.error('fetchIncidents failed', e);
    return [];
  }
}

// Fetch predictions
export async function fetchPredictions(): Promise<Prediction[]> {
  try {
    const res = await fetch(`${API_BASE}/predictions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || data || [];
  } catch (e) {
    console.error('fetchPredictions failed', e);
    return [];
  }
}

// Fetch history (all citizen reports and incidents)
export async function fetchHistory(options?: {
  type?: string;
  since?: number;
  limit?: number;
  source?: string;
}): Promise<HistoryEntry[]> {
  try {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.since) params.set('since', options.since.toString());
    if (options?.limit) params.set('limit', (options.limit || 500).toString());
    if (options?.source) params.set('source', options.source);

    const res = await fetch(`${API_BASE}/history?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('fetchHistory failed', e);
    return [];
  }
}

// Fetch dashboard stats
export async function fetchStats(): Promise<DashboardStats> {
  try {
    const [incidents, predictions, history] = await Promise.all([
      fetchIncidents({ limit: 500 }),
      fetchPredictions(),
      fetchHistory({ limit: 500 })
    ]);

    return {
      totalIncidents: incidents.length,
      pendingApproval: incidents.filter(i => i.status === 'pending' || !i.status).length,
      verified: incidents.filter(i => i.verified >= 0.75).length,
      resolved: incidents.filter(i => i.resolved).length,
      activePredictions: predictions.length,
      citizenReports: history.filter(h => h.source?.includes('citizen')).length,
      aiDetections: history.filter(h => h.source === 'ai' || h.source === 'ai-simulation').length
    };
  } catch (e) {
    console.error('fetchStats failed', e);
    return {
      totalIncidents: 0,
      pendingApproval: 0,
      verified: 0,
      resolved: 0,
      activePredictions: 0,
      citizenReports: 0,
      aiDetections: 0
    };
  }
}

// Approve/Reject incident
export async function updateIncidentStatus(
  incidentId: string,
  action: 'approve' | 'reject' | 'resolve',
  adminId: string,
  notes?: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/admin/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        adminId,
        notes,
        timestamp: Date.now()
      })
    });
    return { success: res.ok };
  } catch (e) {
    console.error('updateIncidentStatus failed', e);
    return { success: false };
  }
}

// Get verifications for an incident
export async function fetchVerifications(incidentId: string): Promise<Verification[]> {
  try {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/verifications`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('fetchVerifications failed', e);
    return [];
  }
}

// Export all data for reports
export async function exportAllData(): Promise<{
  incidents: Incident[];
  predictions: Prediction[];
  history: HistoryEntry[];
  stats: DashboardStats;
  exportedAt: number;
}> {
  const [incidents, predictions, history, stats] = await Promise.all([
    fetchIncidents({ limit: 2000 }),
    fetchPredictions(),
    fetchHistory({ limit: 2000 }),
    fetchStats()
  ]);

  return {
    incidents,
    predictions,
    history,
    stats,
    exportedAt: Date.now()
  };
}

// Subscribe to real-time updates (polling fallback)
export function subscribeToUpdates(
  callback: (data: { incidents: Incident[]; predictions: Prediction[] }) => void,
  intervalMs: number = 15000
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const [incidents, predictions] = await Promise.all([
        fetchIncidents({ limit: 100 }),
        fetchPredictions()
      ]);
      callback({ incidents, predictions });
    } catch (e) {
      console.warn('Poll failed', e);
    }
  };

  poll();
  const interval = setInterval(poll, intervalMs);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

// Fetch video detection model status
export async function fetchModelStatus(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/video/model/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || data;
  } catch (e) {
    console.error('fetchModelStatus failed', e);
    return null;
  }
}

export default {
  fetchIncidents,
  fetchPredictions,
  fetchHistory,
  fetchStats,
  updateIncidentStatus,
  fetchVerifications,
  exportAllData,
  subscribeToUpdates,
  fetchModelStatus
};
