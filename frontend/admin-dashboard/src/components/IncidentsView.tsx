'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, X, Eye, Clock, MapPin, Users, Camera, RefreshCw, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import adminDataService, { Incident } from '../services/adminDataService';

export default function IncidentsView() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'resolved'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminDataService.fetchIncidents({ limit: 200 });
            setIncidents(data);
        } catch (err) {
            console.error('Failed to fetch incidents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleApprove = useCallback(async (incidentId: string) => {
        setProcessingId(incidentId);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            await fetch(`${API_URL}/incidents/${incidentId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', adminId: 'admin' })
            });
            setIncidents(prev => prev.map(inc =>
                inc.id === incidentId ? { ...inc, status: 'approved' as const } : inc
            ));
        } catch (e) {
            console.error('Failed to approve:', e);
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleReject = useCallback(async (incidentId: string) => {
        setProcessingId(incidentId);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            await fetch(`${API_URL}/incidents/${incidentId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', adminId: 'admin' })
            });
            setIncidents(prev => prev.map(inc =>
                inc.id === incidentId ? { ...inc, status: 'rejected' as const } : inc
            ));
        } catch (e) {
            console.error('Failed to reject:', e);
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleResolve = useCallback(async (incidentId: string) => {
        setProcessingId(incidentId);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            await fetch(`${API_URL}/incidents/${incidentId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setIncidents(prev => prev.map(inc =>
                inc.id === incidentId ? { ...inc, status: 'resolved' as const, resolved: true } : inc
            ));
        } catch (e) {
            console.error('Failed to resolve:', e);
        } finally {
            setProcessingId(null);
        }
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'traffic': return '🚗';
            case 'garbage': return '🗑️';
            case 'water': return '💧';
            case 'light': return '💡';
            case 'road': return '🛣️';
            case 'noise': return '🔊';
            default: return '⚠️';
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'resolved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'pending':
            default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    const getSeverityColor = (severity: number) => {
        if (severity >= 0.7) return 'text-red-400 bg-red-500/20';
        if (severity >= 0.4) return 'text-orange-400 bg-orange-500/20';
        return 'text-yellow-400 bg-yellow-500/20';
    };

    // Apply filters
    const filteredIncidents = incidents.filter(inc => {
        const eventType = inc.event_type || inc.type || '';
        if (filter !== 'all' && inc.status !== filter) return false;
        if (typeFilter !== 'all' && eventType !== typeFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                eventType.toLowerCase().includes(q) ||
                (inc.description || '').toLowerCase().includes(q) ||
                (inc.id || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const statusCounts = {
        all: incidents.length,
        pending: incidents.filter(i => i.status === 'pending' || !i.status).length,
        approved: incidents.filter(i => i.status === 'approved').length,
        rejected: incidents.filter(i => i.status === 'rejected').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-4">
                {(Object.keys(statusCounts) as Array<keyof typeof statusCounts>).map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`p-4 rounded-xl border transition-all ${
                            filter === key
                                ? 'bg-white/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                    >
                        <p className="text-2xl font-bold text-white">{statusCounts[key]}</p>
                        <p className="text-xs text-slate-400 uppercase font-semibold mt-1">{key}</p>
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search incidents..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer"
                >
                    <option value="all">All Types</option>
                    <option value="traffic">🚗 Traffic</option>
                    <option value="garbage">🗑️ Garbage</option>
                    <option value="water">💧 Water</option>
                    <option value="light">💡 Light</option>
                    <option value="road">🛣️ Road</option>
                    <option value="noise">🔊 Noise</option>
                </select>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Incidents Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                {loading && incidents.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No incidents found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredIncidents.map(incident => {
                            const eventType = incident.event_type || incident.type || 'other';
                            const isProcessing = processingId === incident.id;
                            const isSelected = selectedIncident?.id === incident.id;

                            return (
                                <div
                                    key={incident.id}
                                    className={`p-4 flex items-center gap-4 transition-all hover:bg-white/5 ${isProcessing ? 'opacity-50' : ''} ${isSelected ? 'bg-cyan-500/5' : ''}`}
                                >
                                    {/* Type Icon */}
                                    <div className="text-2xl w-10 text-center">{getTypeIcon(eventType)}</div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-semibold capitalize">{eventType}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>
                                                {Math.round(incident.severity * 100)}%
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(incident.status)}`}>
                                                {(incident.status || 'pending').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {incident.lat?.toFixed(4)}, {incident.lng?.toFixed(4)}
                                            </span>
                                            {incident.description && (
                                                <span className="truncate max-w-[200px] text-slate-500 italic">
                                                    &quot;{incident.description}&quot;
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Verified Count */}
                                    <div className="text-center px-3">
                                        <div className="text-lg font-bold text-cyan-400">{incident.verified || 0}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Verified</div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {(incident.status === 'pending' || !incident.status) && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(incident.id)}
                                                    disabled={isProcessing}
                                                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all disabled:opacity-50"
                                                    title="Approve"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(incident.id)}
                                                    disabled={isProcessing}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {incident.status === 'approved' && (
                                            <button
                                                onClick={() => handleResolve(incident.id)}
                                                disabled={isProcessing}
                                                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50 text-xs font-semibold"
                                                title="Mark Resolved"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedIncident(isSelected ? null : incident)}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedIncident && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Incident Details</h3>
                        <button
                            onClick={() => setSelectedIncident(null)}
                            className="text-slate-400 hover:text-white"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Type</p>
                            <p className="text-white capitalize">{selectedIncident.event_type || selectedIncident.type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Severity</p>
                            <p className="text-white">{Math.round(selectedIncident.severity * 100)}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Status</p>
                            <p className="text-white capitalize">{selectedIncident.status || 'pending'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Location</p>
                            <p className="text-white">{selectedIncident.lat?.toFixed(4)}, {selectedIncident.lng?.toFixed(4)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Verifications</p>
                            <p className="text-white">{selectedIncident.verified || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Source</p>
                            <p className="text-white">{selectedIncident.source || 'citizen'}</p>
                        </div>
                    </div>
                    {selectedIncident.description && (
                        <div className="mt-4">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Description</p>
                            <p className="text-slate-300 text-sm">{selectedIncident.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
