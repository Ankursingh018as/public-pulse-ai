'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import dataService from '../services/dataService';
import ReportIssueModal from './ReportIssueModal';
import { useUser } from '../context/UserContext';

interface Prediction {
  id: string;
  type: string;
  lat: number;
  lng: number;
  probability: number;
  timeframe: string;
  severity: string;
  area_name: string;
  confidence: number;
}

interface CameraFeed {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
  type: string;
  videoUrl: string;
  status: string;
  totalDetections: number;
  lastDetectionAt: string | null;
}

interface MapProps {
  selectedFilter: string | null;
  onMarkerClick?: (incident: any) => void;
  onIncidentsChange?: (incidents: any[]) => void;
  onCameraClick?: (camera: CameraFeed) => void;
}

// Vadodara bounds and center
const VADODARA_CENTER: [number, number] = [22.3072, 73.1812];
const VADODARA_BOUNDS = {
  minLat: 22.22, maxLat: 22.40,
  minLng: 73.10, maxLng: 73.30
};

// Type colors for lightweight markers
const TYPE_COLORS: Record<string, string> = {
  traffic: '#ef4444',  // red
  garbage: '#f97316',  // orange
  water: '#3b82f6',    // blue
  light: '#eab308',    // yellow
  default: '#6b7280'   // gray
};

// Map click handler for reporting
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Auto-pan to user location
function LocationMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    }
  }, [position, map]);
  return null;
}

export default function Map({ selectedFilter, onMarkerClick, onIncidentsChange, onCameraClick }: MapProps) {
  const { user } = useUser();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [aiPredictions, setAIPredictions] = useState<any[]>([]);
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPosition, setReportPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const mountedRef = useRef(true);

  // Sync incidents to parent and dataService
  const syncIncidents = useCallback((incs: any[]) => {
    setIncidents(incs);
    onIncidentsChange?.(incs);
  }, [onIncidentsChange]);

  // Initial data load from backend/localStorage
  useEffect(() => {
    mountedRef.current = true;

    const loadInitialData = async () => {
      try {
        // Fetch from backend via dataService (falls back to localStorage)
        const serverIncidents = await dataService.getIncidents();
        if (mountedRef.current && serverIncidents.length > 0) {
          const mapped = serverIncidents.slice(0, 50).map((inc: any) => ({
            id: inc.id || inc._serverId || `local-${Date.now()}-${Math.random()}`,
            type: inc.event_type || inc.type || 'traffic',
            event_type: inc.event_type || inc.type || 'traffic',
            lat: inc.lat,
            lng: inc.lng,
            severity: inc.severity || 0.5,
            radius: inc.radius || 100,
            verified: inc.verified || 0,
            resolved: inc.resolved || false,
            description: inc.description,
            source: inc.source || 'backend',
            createdAt: inc.createdAt || inc._ts || Date.now()
          }));
          syncIncidents(mapped);
        }

        // Also fetch predictions
        const serverPredictions = await dataService.getPredictions();
        if (mountedRef.current && Array.isArray(serverPredictions)) {
          setPredictions(serverPredictions);
        }
      } catch {
        // Silent fail - use simulation fallback
      }
    };

    loadInitialData();

    // Get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mountedRef.current) {
            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          }
        },
        () => setUserLocation(VADODARA_CENTER)
      );
    }

    return () => { mountedRef.current = false; };
  }, [syncIncidents]);

  // Periodic sync with backend (every 30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const serverIncidents = await dataService.getIncidents();
        if (serverIncidents.length > 0) {
          // Merge with local state, keeping newer versions
          const serverLookup = new globalThis.Map(serverIncidents.map((i: any) => [i.id || i._serverId, i]));
          setIncidents(prev => {
            const merged = prev.map(local => {
              const server = serverLookup.get(local.id);
              return server ? { ...local, ...server, id: local.id } : local;
            });
            // Add new server incidents not in local
            serverIncidents.forEach((s: any) => {
              if (!prev.find(l => l.id === s.id || l.id === s._serverId)) {
                merged.push({
                  id: s.id || s._serverId,
                  type: s.event_type || s.type,
                  event_type: s.event_type || s.type,
                  lat: s.lat,
                  lng: s.lng,
                  severity: s.severity || 0.5,
                  radius: s.radius || 100,
                  verified: s.verified || 0,
                  resolved: s.resolved || false,
                  description: s.description,
                  source: s.source || 'backend',
                  createdAt: s.createdAt || s._ts || Date.now()
                });
              }
            });
            return merged.slice(0, 60);
          });
        }
      } catch (e) {
        // Silent fail - offline mode
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch AI predictions from API (every 2 min)
  useEffect(() => {
    const fetchAIPreds = async () => {
      if (!mountedRef.current) return;
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${API_URL}/predictions`);
        if (res.ok) {
          const data = await res.json();
          if (mountedRef.current && data.data) {
            // Map API predictions to local format
            const mapped = data.data.slice(0, 10).map((p: any) => ({
              id: p._id || p.id,
              type: p.event_type,
              lat: p.lat || p.location?.lat,
              lng: p.lng || p.location?.lng,
              probability: p.probability || p.confidence || 0.5,
              timeframe: p.timeframe || '2h',
              severity: p.severity || 'medium',
              area_name: p.area_name || 'Unknown',
              reasons: p.reasons || [],
              trend: p.trend || 'stable',
              confidence: p.confidence || 0.5,
              createdAt: new Date(p.createdAt).getTime(),
              expiresAt: new Date(p.valid_until || Date.now() + 7200000).getTime()
            }));
            setAIPredictions(mapped);
          }
        }
      } catch {
        // Silent fail - offline mode or API down
      }
    };

    fetchAIPreds();
    const interval = setInterval(fetchAIPreds, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch camera feed locations
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${API_URL}/video/cameras`);
        if (res.ok) {
          const data = await res.json();
          if (mountedRef.current && data.data) {
            setCameras(data.data);
          }
        }
      } catch {
        // Silent fail
      }
    };
    fetchCameras();
    const interval = setInterval(fetchCameras, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Sync to parent when incidents change
  useEffect(() => {
    onIncidentsChange?.(incidents);
  }, [incidents, onIncidentsChange]);

  // Handle map click for reporting
  const handleMapClick = (lat: number, lng: number) => {
    setReportPosition({ lat, lng });
    setReportModalOpen(true);
  };

  // Handle report submission
  const handleReportSubmit = async (payload: { event_type: string; lat: number; lng: number; description?: string }) => {
    // Add to local state immediately (optimistic)
    const newIncident = {
      id: `citizen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: payload.event_type,
      event_type: payload.event_type,
      lat: payload.lat,
      lng: payload.lng,
      severity: 0.6,
      radius: 120,
      verified: 1, // Self-verified
      resolved: false,
      description: payload.description,
      source: 'citizen-map-click',
      createdAt: Date.now()
    };

    setIncidents(prev => [newIncident, ...prev].slice(0, 50));

    // Submit to backend via dataService
    await dataService.submitIncident({
      ...payload,
      source: 'citizen-map-click',
      userId: user?.id || 'anonymous'
    });
  };

  // Filter incidents by type
  const filteredIncidents = selectedFilter
    ? incidents.filter(i => i.type === selectedFilter || i.event_type === selectedFilter)
    : incidents;

  const filteredPredictions = selectedFilter
    ? aiPredictions.filter(p => p.type === selectedFilter)
    : aiPredictions;

  return (
    <>
      <MapContainer
        center={VADODARA_CENTER}
        zoom={13}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: '#0a0a0a' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <LocationMarker position={userLocation} />
        <MapClickHandler onMapClick={handleMapClick} />

        {/* AI Prediction Markers - Dashed outline circles */}
        {filteredPredictions.map((pred) => (
          <CircleMarker
            key={pred.id}
            center={[pred.lat, pred.lng]}
            radius={8 + pred.probability * 12}
            pathOptions={{
              color: TYPE_COLORS[pred.type] || TYPE_COLORS.default,
              fillColor: TYPE_COLORS[pred.type] || TYPE_COLORS.default,
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5,5'
            }}
            eventHandlers={{ click: () => onMarkerClick?.(pred) }}
          >
            <Popup className="dark-popup">
              <div className="text-sm bg-[#1a1a1a] text-white p-2 rounded-lg min-w-[140px] -m-3">
                <strong className="capitalize text-cyan-400">{pred.type}</strong>
                <span className="text-slate-400 text-xs ml-1">Prediction</span>
                <div className="text-slate-400 text-xs mt-1">
                  <div>Probability: <span className="text-white">{Math.round(pred.probability * 100)}%</span></div>
                  <div>Area: <span className="text-white">{pred.area_name}</span></div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Incident Markers - Solid glowing circles */}
        {filteredIncidents.map((inc) => {
          const color = TYPE_COLORS[inc.type] || TYPE_COLORS[inc.event_type] || TYPE_COLORS.default;
          const isVerified = inc.verified >= 0.75;
          const size = 10 + inc.severity * 10;

          return (
            <CircleMarker
              key={inc.id}
              center={[inc.lat, inc.lng]}
              radius={size}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7 + inc.severity * 0.2,
                weight: isVerified ? 4 : 2,
                className: 'glow-marker'
              }}
              eventHandlers={{ click: () => onMarkerClick?.(inc) }}
            >
              <Popup className="dark-popup">
                <div className="text-sm bg-[#1a1a1a] text-white p-3 rounded-lg min-w-[160px] -m-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                    <strong className="capitalize">{inc.type || inc.event_type}</strong>
                    {isVerified && <span className="text-emerald-400 text-xs">✓</span>}
                  </div>
                  <div className="text-slate-400 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Severity</span>
                      <span className="text-white">{Math.round(inc.severity * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verifications</span>
                      <span className="text-white">{inc.verified}</span>
                    </div>
                    {inc.description && <div className="italic text-slate-500 mt-1">"{inc.description}"</div>}
                  </div>
                  <button
                    onClick={() => onMarkerClick?.(inc)}
                    className="mt-3 w-full px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg hover:bg-cyan-500/30 border border-cyan-500/30 font-medium"
                  >
                    Verify Issue
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* User Location Marker */}
        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              weight: 3
            }}
          >
            <Popup>
              <div className="text-sm font-medium">📍 Your Location</div>
            </Popup>
          </CircleMarker>
        )}

        {/* Camera Feed Markers - 📹 icons */}
        {cameras.map((cam) => (
          <CircleMarker
            key={cam.id}
            center={[cam.lat, cam.lng]}
            radius={12}
            pathOptions={{
              color: '#a855f7',
              fillColor: '#7c3aed',
              fillOpacity: 0.85,
              weight: 3,
              className: 'camera-marker'
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation();
                onCameraClick?.(cam);
              }
            }}
          >
            <Popup className="dark-popup">
              <div className="text-sm bg-[#1a1a1a] text-white p-3 rounded-lg min-w-[160px] -m-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📹</span>
                  <strong className="text-purple-400">{cam.name}</strong>
                </div>
                <div className="text-slate-400 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Area</span>
                    <span className="text-white">{cam.area}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monitor</span>
                    <span className="capitalize text-white">{cam.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detections</span>
                    <span className="text-orange-400 font-bold">{cam.totalDetections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`font-bold ${cam.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cam.status === 'active' ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onCameraClick?.(cam)}
                  className="mt-3 w-full px-3 py-1.5 bg-purple-500/20 text-purple-400 text-xs rounded-lg hover:bg-purple-500/30 border border-purple-500/30 font-medium"
                >
                  🔍 Analyze Video
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Click Report Modal */}
      <ReportIssueModal
        open={reportModalOpen}
        position={reportPosition}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}
