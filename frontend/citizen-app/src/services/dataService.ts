"use client";

// Centralized data sync service for Public Pulse frontend
// - Provides getIncidents, submitIncident, getPredictions, getHistory
// - Uses localStorage as offline queue with retry logic
// - Tracks all citizen submissions for admin history view
// - Syncs verifications and citizen feedback

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

type IncidentPayload = {
  event_type: string;
  lat: number;
  lng: number;
  description?: string;
  source?: string;
  userId?: string;
};

type VerificationPayload = {
  incidentId: string;
  userId: string;
  response: 'yes' | 'no' | 'partial';
  hasPhoto: boolean;
  photoUrl?: string;
  location?: { lat: number; lng: number };
};

const PENDING_KEY = 'pp_pending_incidents_v2';
const HISTORY_KEY = 'pp_incidents_history_v2';
const VERIFICATIONS_KEY = 'pp_verifications_v2';
const SYNC_STATE_KEY = 'pp_sync_state_v2';

interface SyncState {
  lastSync: number;
  isOnline: boolean;
  pendingVerifications: VerificationPayload[];
}

function readPending(): IncidentPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('readPending error', e);
    return [];
  }
}

function writePending(list: IncidentPayload[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(0, 500))); } catch(e) { console.error(e); }
}

function readHistory(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('readHistory error', e);
    return [];
  }
}

function writeHistory(list: any[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 2000))); } catch(e) { console.error(e); }
}

function readSyncState(): SyncState {
  if (typeof window === 'undefined') return { lastSync: 0, isOnline: true, pendingVerifications: [] };
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? JSON.parse(raw) : { lastSync: 0, isOnline: true, pendingVerifications: [] };
  } catch (e) {
    return { lastSync: 0, isOnline: true, pendingVerifications: [] };
  }
}

function writeSyncState(state: SyncState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state)); } catch(e) { console.error(e); }
}

async function tryFlushPendingOnce(): Promise<void> {
  const pending = readPending();
  const syncState = readSyncState();
  
  if (pending.length === 0 && syncState.pendingVerifications.length === 0) return;

  // Flush pending incidents
  const remainingIncidents: IncidentPayload[] = [];
  for (const p of pending) {
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, submittedAt: Date.now() })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      // Append to history with server ID
      const hist = readHistory();
      hist.unshift({ 
        ...p, 
        _serverId: data.id || null, 
        _synced: true,
        _ts: Date.now(),
        status: 'pending_admin_review'
      });
      writeHistory(hist);
    } catch (e) {
      console.warn('flush failed for incident, keeping in queue', e);
      remainingIncidents.push(p);
    }
  }
  writePending(remainingIncidents);

  // Flush pending verifications
  const remainingVerifications: VerificationPayload[] = [];
  for (const v of syncState.pendingVerifications) {
    try {
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, timestamp: Date.now() })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
    } catch (e) {
      console.warn('flush failed for verification, keeping in queue', e);
      remainingVerifications.push(v);
    }
  }
  
  writeSyncState({ 
    ...syncState, 
    pendingVerifications: remainingVerifications,
    lastSync: Date.now(),
    isOnline: remainingIncidents.length === 0 && remainingVerifications.length === 0
  });
}

// Submit verification
export async function submitVerification(payload: VerificationPayload): Promise<{ success: boolean }> {
  const syncState = readSyncState();
  
  // Try immediate submit
  try {
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: Date.now() })
    });
    if (res.ok) {
      writeSyncState({ ...syncState, lastSync: Date.now(), isOnline: true });
      return { success: true };
    }
  } catch (e) {
    console.warn('Verification submit failed, queueing...', e);
  }

  // Queue for retry
  syncState.pendingVerifications.push(payload);
  writeSyncState({ ...syncState, isOnline: false });
  return { success: true }; // Optimistic
}

// Get sync status for UI
export function getSyncStatus(): { isOnline: boolean; pendingCount: number; lastSync: number } {
  const pending = readPending();
  const syncState = readSyncState();
  return {
    isOnline: syncState.isOnline,
    pendingCount: pending.length + syncState.pendingVerifications.length,
    lastSync: syncState.lastSync
  };
}

// Background sync loop
let syncHandle: number | null = null;
export function startBackgroundSync(intervalMs = 20000) {
  if (syncHandle != null) return;
  syncHandle = window.setInterval(() => tryFlushPendingOnce().catch(console.error), intervalMs);
}

export function stopBackgroundSync() {
  if (syncHandle != null) window.clearInterval(syncHandle);
  syncHandle = null;
}

export async function submitIncident(payload: IncidentPayload): Promise<void> {
  // store to pending queue first
  const pending = readPending();
  pending.unshift(payload);
  writePending(pending.slice(0, 500));

  // try immediate flush
  try {
    await tryFlushPendingOnce();
  } catch (e) {
    console.warn('Immediate flush failed', e);
  }
}

export async function getIncidents(): Promise<any[]> {
  // Try backend first, fallback to local history
  try {
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) throw new Error(`server ${res.status}`);
    const json = await res.json();
    const serverIncidents = json.data || json || [];
    // Mirror into local history for offline viewing
    const hist = readHistory();
    const serverIds = new Set(serverIncidents.map((i: any) => i.id));
    const uniqueLocal = hist.filter((h: any) => !serverIds.has(h.id) && !serverIds.has(h._serverId));
    const merged = [...serverIncidents, ...uniqueLocal].slice(0, 1000);
    writeHistory(merged);
    return merged;
  } catch (e) {
    console.warn('getIncidents backend failed, using local history', e);
    return readHistory();
  }
}

export async function getPredictions(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/predictions`);
    if (!res.ok) throw new Error('bad');
    return await res.json();
  } catch (e) {
    console.warn('getPredictions failed', e);
    return [];
  }
}

export async function getHistory(options?: {
  type?: string;
  since?: number;
  limit?: number;
  status?: string;
}): Promise<any[]> {
  // Try backend first
  try {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.since) params.set('since', options.since.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.status) params.set('status', options.status);
    
    const res = await fetch(`${API_BASE}/history?${params.toString()}`);
    if (res.ok) {
      const serverHistory = await res.json();
      // Merge with local for completeness
      const localHistory = readHistory();
      const serverIds = new Set(serverHistory.map((h: any) => h.id || h._serverId));
      const uniqueLocal = localHistory.filter(l => !serverIds.has(l.id) && !serverIds.has(l._serverId));
      return [...serverHistory, ...uniqueLocal].slice(0, options?.limit || 500);
    }
  } catch (e) {
    console.warn('getHistory backend failed, using local', e);
  }
  
  // Fallback to local history with filtering
  let history = readHistory();
  if (options?.type) {
    history = history.filter(h => h.event_type === options.type || h.type === options.type);
  }
  if (options?.since) {
    history = history.filter(h => (h._ts || h.createdAt || 0) >= options.since!);
  }
  if (options?.limit) {
    history = history.slice(0, options.limit);
  }
  return history;
}

// Get all data for admin dashboard
export async function getAdminExport(): Promise<{
  incidents: any[];
  predictions: any[];
  history: any[];
  syncStatus: { isOnline: boolean; pendingCount: number; lastSync: number };
}> {
  const [incidents, predictions, history] = await Promise.all([
    getIncidents(),
    getPredictions(),
    getHistory({ limit: 1000 })
  ]);
  
  return {
    incidents,
    predictions,
    history,
    syncStatus: getSyncStatus()
  };
}

// Clear old history (for maintenance)
export function clearOldHistory(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - olderThanMs;
  const history = readHistory();
  const filtered = history.filter(h => (h._ts || h.createdAt || 0) > cutoff);
  writeHistory(filtered);
}

export default {
  submitIncident,
  submitVerification,
  getIncidents,
  getPredictions,
  getHistory,
  getAdminExport,
  getSyncStatus,
  startBackgroundSync,
  stopBackgroundSync,
  clearOldHistory
};
