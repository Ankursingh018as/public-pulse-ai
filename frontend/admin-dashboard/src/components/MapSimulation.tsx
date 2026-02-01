'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, Search, Shield, Users, Wifi, XCircle, Check, X, Brain } from 'lucide-react';
import { Incident } from '../services/groqAdminService';
import AdminAIPanel from './AdminAIPanel';
import AdminApprovalQueue from './AdminApprovalQueue';

// Dynamic import for Leaflet map (client-side only)
const LeafletMap = dynamic(() => import('./LeafletMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500">Initializing Intelligence Layer...</div>
});

export default function MapSimulation() {
    const [simulating, setSimulating] = useState(false);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<any>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showApprovalQueue, setShowApprovalQueue] = useState(true);

    useEffect(() => {
        setLastUpdate(new Date());
    }, []);

    const fetchPredictions = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            const res = await fetch(`${API_URL}/predictions`);
            const data = await res.json();
            if (data.data) {
                setPredictions(data.data);
                setLastUpdate(new Date());
            }
        } catch (e) {
            console.error("Failed to load map data", e);
        }
    };

    useEffect(() => {
        fetchPredictions();
        const interval = setInterval(fetchPredictions, 5000);
        return () => clearInterval(interval);
    }, []);

    // Handle incident approval
    const handleApprove = useCallback((incidentId: string) => {
        setIncidents(prev => prev.map(inc => 
            inc.id === incidentId 
                ? { ...inc, status: 'approved' as const, approvedAt: Date.now(), approvedBy: 'Admin' }
                : inc
        ));
    }, []);

    // Handle incident rejection
    const handleReject = useCallback((incidentId: string) => {
        setIncidents(prev => prev.map(inc => 
            inc.id === incidentId 
                ? { ...inc, status: 'rejected' as const }
                : inc
        ));
    }, []);

    // Handle view on map
    const handleViewOnMap = useCallback((incident: Incident) => {
        setSelectedIncident(incident);
    }, []);

    const handleSimulate = async (type: string) => {
        setSimulating(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            await fetch(`${API_URL}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `Emergent ${type} cluster detected at Vadodara Central`,
                    source: 'simulation_console',
                    metadata: { simulated: true, urgent: true }
                })
            });
            await fetchPredictions();
        } catch (e) {
            console.error(e);
        } finally {
            setSimulating(false);
        }
    };

    const pendingCount = incidents.filter(i => i.status === 'pending').length;
    const approvedCount = incidents.filter(i => i.status === 'approved').length;

    return (
        <div className="h-full w-full flex flex-col relative bg-slate-900 overflow-hidden">
            {/* AI Status Ticker */}
            <div className="absolute top-4 left-4 z-[1000] bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs text-green-400 font-mono tracking-wider">
                    AI ANALYZING VADODARA... UPDATED {lastUpdate ? lastUpdate.toLocaleTimeString() : '...'}
                </span>
            </div>

            {/* Pending Approval Badge */}
            {pendingCount > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-500/90 backdrop-blur-md px-4 py-2 rounded-full border border-yellow-400/50 flex items-center gap-2 animate-pulse">
                    <Clock className="w-4 h-4 text-yellow-900" />
                    <span className="text-sm font-bold text-yellow-900">
                        {pendingCount} incidents awaiting approval
                    </span>
                </div>
            )}

            <div className="flex-1 relative z-0">
                <LeafletMap
                    predictions={predictions}
                    incidents={incidents}
                    onMarkerClick={setSelectedIncident}
                    onIncidentsChange={setIncidents}
                    showVotes={true}
                />

                {/* AI Command Panel - Top Right */}
                <div className="absolute top-16 right-4 z-[1000]">
                    <AdminAIPanel incidents={incidents} />
                </div>

                {/* Simulation Control Panel */}
                <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl z-[999] w-48 transition-all hover:bg-slate-900">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Wifi className="w-3 h-3 text-cyan-500 animate-pulse" /> Live Simulation
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={() => handleSimulate('Traffic')}
                            disabled={simulating}
                            className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-2 rounded-lg w-full hover:bg-red-500/20 transition-all font-bold flex items-center justify-center gap-2">
                            {simulating && <span className="animate-spin">⟳</span>} Traffic Pulse
                        </button>
                        <button
                            onClick={() => handleSimulate('Waterlog')}
                            disabled={simulating}
                            className="text-xs bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 px-3 py-2 rounded-lg w-full hover:bg-cyan-500/20 transition-all font-bold flex items-center justify-center gap-2">
                            {simulating && <span className="animate-spin">⟳</span>} Flood Ripple
                        </button>
                    </div>
                    
                    {/* Stats */}
                    <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                        <div>
                            <p className="text-lg font-bold text-yellow-400">{pendingCount}</p>
                            <p className="text-[9px] text-slate-500 uppercase">Pending</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-green-400">{approvedCount}</p>
                            <p className="text-[9px] text-slate-500 uppercase">Approved</p>
                        </div>
                    </div>
                </div>

                {/* Approval Queue Panel - Bottom */}
                {showApprovalQueue && (
                    <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-4xl mx-auto">
                        <AdminApprovalQueue
                            incidents={incidents}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onViewOnMap={handleViewOnMap}
                        />
                    </div>
                )}

                {/* Toggle Approval Queue */}
                <button
                    onClick={() => setShowApprovalQueue(!showApprovalQueue)}
                    className="absolute bottom-4 right-4 z-[1001] p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 text-white transition-all"
                >
                    {showApprovalQueue ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </button>

                {/* Incident Detail Slide-in Panel */}
                <div className={`absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[1002] transform transition-transform duration-300 ease-in-out ${selectedIncident ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedIncident && (
                        <div className="p-6 h-full overflow-y-auto">
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>

                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                                        (selectedIncident.probability || selectedIncident.severity) > 0.7 
                                            ? 'bg-red-500/20 text-red-400' 
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {selectedIncident.event_type}
                                    </span>
                                    {selectedIncident.status && (
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                                            selectedIncident.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                            selectedIncident.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                            {selectedIncident.status}
                                        </span>
                                    )}
                                    <span className="text-xs font-mono text-slate-500">ID: #{selectedIncident.id?.slice(-6) || 'N/A'}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white leading-tight mb-1">
                                    {selectedIncident.area_name || `${selectedIncident.event_type} Incident`}
                                </h2>
                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Vadodara, Gujarat
                                </p>
                            </div>

                            <div className="mt-8 space-y-6">
                                {/* AI Confidence / Severity */}
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-purple-400" /> 
                                            {selectedIncident.probability ? 'AI Confidence' : 'Severity'}
                                        </h4>
                                        <span className="text-xl font-bold text-white">
                                            {Math.round((selectedIncident.probability || selectedIncident.severity) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                                            style={{ width: `${(selectedIncident.probability || selectedIncident.severity) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Citizen Verification */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Citizen Verification</h4>
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-green-400">
                                                {selectedIncident.citizenVotes?.yes || selectedIncident.verified_by_count || 0}
                                            </p>
                                            <p className="text-xs uppercase text-green-600 font-bold">Confirmed</p>
                                        </div>
                                        <div className="flex-1 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-red-400">
                                                {selectedIncident.citizenVotes?.no || 0}
                                            </p>
                                            <p className="text-[10px] uppercase text-red-600 font-bold">Denied</p>
                                        </div>
                                        {selectedIncident.citizenVotes?.photo > 0 && (
                                            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                                                <p className="text-2xl font-bold text-blue-400">
                                                    {selectedIncident.citizenVotes?.photo}
                                                </p>
                                                <p className="text-[10px] uppercase text-blue-600 font-bold">Photos</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 text-center flex items-center justify-center gap-1">
                                        <Users className="w-3 h-3" /> Verified by local community
                                    </p>
                                </div>

                                {/* Admin Actions for pending incidents */}
                                {selectedIncident.status === 'pending' && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Admin Action Required</h4>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => {
                                                    handleApprove(selectedIncident.id);
                                                    setSelectedIncident({ ...selectedIncident, status: 'approved' });
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-4 h-4" /> Approve
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    handleReject(selectedIncident.id);
                                                    setSelectedIncident({ ...selectedIncident, status: 'rejected' });
                                                }}
                                                className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <X className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Timeline */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Timeline</h4>
                                    <div className="relative pl-4 border-l border-slate-700 space-y-6">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900"></div>
                                            <p className="text-xs text-slate-500">
                                                {selectedIncident.createdAt 
                                                    ? new Date(selectedIncident.createdAt).toLocaleTimeString()
                                                    : '10 mins ago'}
                                            </p>
                                            <p className="text-sm text-white font-medium">Issue Detected</p>
                                        </div>
                                        {selectedIncident.status === 'approved' && selectedIncident.approvedAt && (
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900"></div>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(selectedIncident.approvedAt).toLocaleTimeString()}
                                                </p>
                                                <p className="text-sm text-cyan-400 font-medium">
                                                    Approved by {selectedIncident.approvedBy || 'Admin'}
                                                </p>
                                            </div>
                                        )}
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-500 border-2 border-slate-900 animate-pulse"></div>
                                            <p className="text-xs text-slate-500">Estimated</p>
                                            <p className="text-sm text-slate-400 font-bold flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Resolution in ~1.5 Hours
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button for approved incidents */}
                                {selectedIncident.status === 'approved' && (
                                    <button className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl text-white font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Dispatch Response Team
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
