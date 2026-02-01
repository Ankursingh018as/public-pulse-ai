'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useCallback } from 'react';
import { Incident } from '../services/groqAdminService';

// Import leaflet.heat (must be required for client-side)
if (typeof window !== 'undefined') {
    require('leaflet.heat');
}

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Animated Pulsing Icons with status indication
const createPulseIcon = (color: string, severity: 'high' | 'medium' | 'low', status: string = 'pending') => {
    let animationClass = 'marker-pulse-blue';
    if (severity === 'high') animationClass = 'marker-pulse-red';
    if (severity === 'medium') animationClass = 'marker-pulse-orange';

    const statusBadge = status === 'approved' 
        ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid #0f172a;"></div>'
        : status === 'pending'
            ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#eab308;border-radius:50%;border:2px solid #0f172a;animation:pulse 1s infinite;"></div>'
            : '';

    return L.divIcon({
        className: 'custom-pulse-marker',
        html: `<div class="${animationClass}" style="
            position:relative;
            background-color: ${color}; 
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 0 10px ${color};">
            ${statusBadge}
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
};

const typeColors: Record<string, string> = {
    traffic: '#EF4444',
    water: '#3B82F6',
    garbage: '#F97316',
    streetlight: '#FBBF24',
    light: '#FBBF24',
    road: '#6B7280',
    encroachment: '#8B5CF6',
    animals: '#10B981',
    default: '#6366F1'
};

// Heatmap Component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        // @ts-ignore - leaflet.heat adds heatLayer to L
        const heat = L.heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 15,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
}

// Citizen Vote Overlay for Admin
function CitizenVoteLayer({ incidents }: { incidents: Incident[] }) {
    const [votes, setVotes] = useState<Array<{
        id: string;
        incidentId: string;
        type: 'yes' | 'no' | 'photo';
        lat: number;
        lng: number;
        timestamp: number;
    }>>([]);

    useEffect(() => {
        if (incidents.length === 0) return;

        const generateVote = () => {
            const approvedOrPending = incidents.filter(i => i.status === 'approved' || i.status === 'pending');
            if (approvedOrPending.length === 0) return;

            const incident = approvedOrPending[Math.floor(Math.random() * approvedOrPending.length)];
            const rand = Math.random();
            const type: 'yes' | 'no' | 'photo' = rand < 0.6 ? 'yes' : rand < 0.85 ? 'no' : 'photo';

            const newVote = {
                id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                incidentId: incident.id,
                type,
                lat: incident.lat + (Math.random() - 0.5) * 0.004,
                lng: incident.lng + (Math.random() - 0.5) * 0.004,
                timestamp: Date.now()
            };

            setVotes(prev => [...prev, newVote].slice(-80));

            // Update incident vote counts
            if (incident.citizenVotes) {
                incident.citizenVotes[type]++;
                if (type === 'yes') incident.verified++;
            }
        };

        const interval = setInterval(() => {
            if (Math.random() < 0.6) generateVote();
        }, 4000);

        // Initial burst
        setTimeout(() => {
            for (let i = 0; i < 5; i++) setTimeout(generateVote, i * 400);
        }, 1000);

        return () => clearInterval(interval);
    }, [incidents]);

    // Cleanup old votes
    useEffect(() => {
        const cleanup = setInterval(() => {
            setVotes(prev => prev.filter(v => Date.now() - v.timestamp < 25000));
        }, 5000);
        return () => clearInterval(cleanup);
    }, []);

    const voteColors = { yes: '#22c55e', no: '#ef4444', photo: '#3b82f6' };

    return (
        <>
            {votes.map(vote => {
                const opacity = Math.max(0.3, 1 - (Date.now() - vote.timestamp) / 25000);
                return (
                    <CircleMarker
                        key={vote.id}
                        center={[vote.lat, vote.lng]}
                        radius={5}
                        pathOptions={{
                            fillColor: voteColors[vote.type],
                            color: 'white',
                            weight: 1,
                            fillOpacity: opacity,
                            opacity: opacity
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                            <span className="text-[10px]">
                                {vote.type === 'yes' ? '✓ Confirmed' : vote.type === 'no' ? '✗ Denied' : '📷 Photo'}
                            </span>
                        </Tooltip>
                    </CircleMarker>
                );
            })}
        </>
    );
}

const VadodaraCenter: [number, number] = [22.3072, 73.1812];

interface LeafletMapProps {
    predictions?: any[];
    incidents?: Incident[];
    onMarkerClick?: (pred: any) => void;
    onIncidentsChange?: (incidents: Incident[]) => void;
    showVotes?: boolean;
}

export default function LeafletMap({ 
    predictions = [], 
    incidents: externalIncidents,
    onMarkerClick, 
    onIncidentsChange,
    showVotes = true 
}: LeafletMapProps) {
    const [internalIncidents, setInternalIncidents] = useState<Incident[]>([]);
    
    // Use external incidents if provided AND non-empty, otherwise internal
    const hasExternalIncidents = externalIncidents && externalIncidents.length > 0;
    const incidents = hasExternalIncidents ? externalIncidents : internalIncidents;

    // Generate dynamic incidents
    useEffect(() => {
        // Skip generation only if external incidents are already provided with data
        if (hasExternalIncidents) return;

        const generateIncident = (): Incident => {
            const types = ['traffic', 'garbage', 'water', 'light'];
            const type = types[Math.floor(Math.random() * types.length)];
            const severity = Number((Math.random() * 0.6 + 0.2).toFixed(2));

            return {
                id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                event_type: type,
                lat: VadodaraCenter[0] + (Math.random() - 0.5) * 0.06,
                lng: VadodaraCenter[1] + (Math.random() - 0.5) * 0.06,
                severity,
                radius: 100 + severity * 400,
                verified: 0,
                citizenVotes: { yes: 0, no: 0, photo: 0 },
                status: 'pending', // All start as pending
                resolved: false,
                createdAt: Date.now()
            };
        };

        // Initial incidents
        const initial = Array(5).fill(null).map(generateIncident);
        setInternalIncidents(initial);
        
        // Immediately notify parent
        if (onIncidentsChange) {
            onIncidentsChange(initial);
        }

        // Generate new incidents periodically
        const genInterval = setInterval(() => {
            setInternalIncidents(prev => {
                const newIncidents = [generateIncident(), ...prev].slice(0, 30);
                if (onIncidentsChange) onIncidentsChange(newIncidents);
                return newIncidents;
            });
        }, 15000);

        // Evolution loop
        const evolveInterval = setInterval(() => {
            setInternalIncidents(prev => {
                const evolved = prev.map(inc => {
                    if (inc.resolved || inc.status === 'rejected') {
                        inc.severity = Math.max(0, inc.severity - 0.03);
                        return inc.severity <= 0.05 ? { ...inc, toRemove: true } as any : inc;
                    }

                    // Only approved incidents evolve naturally
                    if (inc.status === 'approved') {
                        if (inc.verified > 0) {
                            inc.severity = Math.min(1, inc.severity + 0.01 * Math.min(inc.verified, 5));
                            inc.radius += 3 * Math.min(inc.verified, 5);
                        }
                    }

                    // Pending incidents slowly fade if unverified
                    if (inc.status === 'pending' && inc.citizenVotes.yes === 0) {
                        inc.severity = Math.max(0.1, inc.severity - 0.005);
                    }

                    return inc;
                }).filter((i: any) => !i.toRemove);
                
                if (onIncidentsChange) onIncidentsChange(evolved);
                return evolved;
            });
        }, 4000);

        return () => {
            clearInterval(genInterval);
            clearInterval(evolveInterval);
        };
    }, [hasExternalIncidents, onIncidentsChange]);

    // Transform to heatmap points (only approved incidents)
    const heatPoints: [number, number, number][] = [
        ...predictions.map(p => [
            p.lat || p.location?.lat || 22.3072,
            p.lng || p.location?.lng || 73.1812,
            p.probability || 0.5
        ] as [number, number, number]),
        ...incidents
            .filter(i => i.status === 'approved')
            .map(i => [i.lat, i.lng, i.severity] as [number, number, number])
    ];

    return (
        <MapContainer center={VadodaraCenter} zoom={13} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <HeatmapLayer points={heatPoints} />

            {/* Server predictions */}
            {predictions.map((pred, idx) => {
                const lat = pred.lat || pred.location?.lat || (22.3072 + (idx * 0.008));
                const lng = pred.lng || pred.location?.lng || (73.1812 + (idx * 0.008));
                const probability = parseFloat(pred.probability) || 0.5;
                const type = pred.event_type?.toLowerCase() || 'default';
                const color = typeColors[type] || typeColors.default;
                const severity = probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low';

                return (
                    <Marker
                        key={`pred-${idx}`}
                        position={[lat, lng]}
                        icon={createPulseIcon(color, severity, 'approved')}
                        eventHandlers={{ click: () => onMarkerClick && onMarkerClick(pred) }}
                    />
                );
            })}

            {/* Dynamic incidents */}
            {incidents.map((inc, idx) => {
                const color = typeColors[inc.event_type] || typeColors.default;
                const severity = inc.severity > 0.7 ? 'high' : inc.severity > 0.4 ? 'medium' : 'low';
                
                // Intensity color based on severity
                const intensityColor = inc.severity >= 0.7 ? '#dc2626' : 
                    inc.severity >= 0.5 ? '#ea580c' : color;

                // Only show approved incidents prominently
                const isApproved = inc.status === 'approved';
                const isPending = inc.status === 'pending';

                return (
                    <div key={inc.id || `inc-${idx}`}>
                        {/* Expansion circle - larger for approved */}
                        <Circle
                            center={[inc.lat, inc.lng]}
                            pathOptions={{
                                fillColor: intensityColor,
                                color: intensityColor,
                                opacity: isApproved ? 0.3 : 0.15,
                                fillOpacity: isApproved ? 0.12 : 0.05,
                                dashArray: isPending ? '5, 5' : undefined
                            }}
                            radius={isApproved ? Math.max(50, inc.radius) : Math.max(30, inc.radius * 0.5)}
                        />

                        {/* Inner intensity for high severity approved */}
                        {isApproved && inc.severity >= 0.5 && (
                            <Circle
                                center={[inc.lat, inc.lng]}
                                pathOptions={{
                                    fillColor: intensityColor,
                                    color: 'transparent',
                                    fillOpacity: 0.2
                                }}
                                radius={Math.max(30, inc.radius * 0.3)}
                            />
                        )}

                        <Marker
                            position={[inc.lat, inc.lng]}
                            icon={createPulseIcon(intensityColor, severity, inc.status)}
                            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(inc) }}
                        >
                            <Popup>
                                <div className="p-2 text-center min-w-[160px]">
                                    <h3 className="font-bold capitalize text-sm">{inc.event_type} Issue</h3>
                                    <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                                        inc.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        inc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {inc.status.toUpperCase()}
                                    </div>
                                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                                        <p>Severity: <span className="font-bold">{Math.round(inc.severity * 100)}%</span></p>
                                        <p>Votes: {inc.citizenVotes.yes}✓ / {inc.citizenVotes.no}✗</p>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </div>
                );
            })}

            {/* Citizen vote overlay */}
            {showVotes && <CitizenVoteLayer incidents={incidents} />}
        </MapContainer>
    );
}
