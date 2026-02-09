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
            case 'approved': return 'bg-green-50 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
            case 'resolved': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'pending':
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const getSeverityColor = (severity: number) => {
        if (severity >= 0.7) return 'text-rose-600 bg-rose-50';
        if (severity >= 0.4) return 'text-orange-600 bg-orange-50';
        return 'text-amber-600 bg-amber-50';
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
        <div className="space-y-4 md:space-y-6 animate-fade-in p-1">
            {/* Stats Row */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4">
                {(Object.keys(statusCounts) as Array<keyof typeof statusCounts>).map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`p-2.5 md:p-4 rounded-[1.5rem] border transition-all ${filter === key
                                ? 'bg-white border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                                : 'bg-white border-slate-100 hover:border-cyan-200 hover:shadow-md'
                            }`}
                    >
                        <p className="text-lg md:text-2xl font-black text-slate-800">{statusCounts[key]}</p>
                        <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold mt-0.5 md:mt-1 tracking-wide">{key}</p>
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search incidents..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm appearance-none cursor-pointer flex-1 sm:flex-initial transition-all font-medium"
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
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-cyan-600 hover:border-cyan-200 transition-colors shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Incidents Table */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {loading && incidents.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No incidents found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredIncidents.map(incident => {
                            const eventType = incident.event_type || incident.type || 'other';
                            const isProcessing = processingId === incident.id;
                            const isSelected = selectedIncident?.id === incident.id;

                            return (
                                <div
                                    key={incident.id}
                                    className={`p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 transition-all hover:bg-slate-50 ${isProcessing ? 'opacity-50' : ''} ${isSelected ? 'bg-cyan-50/50' : ''}`}
                                >
                                    {/* Top row: Icon + Info + Actions */}
                                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                        {/* Type Icon */}
                                        <div className="text-xl md:text-2xl w-8 md:w-10 text-center shrink-0 p-2 bg-slate-50 rounded-xl">{getTypeIcon(eventType)}</div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                                                <span className="text-slate-900 font-bold capitalize text-sm">{eventType}</span>
                                                <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>
                                                    {Math.round(incident.severity * 100)}%
                                                </span>
                                                <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(incident.status)}`}>
                                                    {(incident.status || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                                    <span className="truncate">{incident.lat?.toFixed(4)}, {incident.lng?.toFixed(4)}</span>
                                                </span>
                                                <span className="hidden sm:flex items-center gap-1">
                                                    <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                                                    {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom row on mobile: Verified + Actions */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                                        {/* Verified Count */}
                                        <div className="text-center px-2 md:px-3">
                                            <div className="text-base md:text-lg font-bold text-cyan-600">{incident.verified || 0}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Verified</div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            {(incident.status === 'pending' || !incident.status) && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(incident.id)}
                                                        disabled={isProcessing}
                                                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg transition-all disabled:opacity-50 shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(incident.id)}
                                                        disabled={isProcessing}
                                                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-all disabled:opacity-50 shadow-sm"
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
                                                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-1 shadow-sm"
                                                    title="Mark Resolved"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Resolve
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedIncident(isSelected ? null : incident)}
                                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"
                    onClick={() => setSelectedIncident(null)}
                >
                    <div className="bg-white rounded-[2rem] p-6 shadow-2xl max-w-2xl w-full mx-4 border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <div className="p-2 bg-cyan-50 rounded-xl text-cyan-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                Incident Details
                            </h3>
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Type</p>
                                <p className="text-slate-900 font-bold capitalize flex items-center gap-2">
                                    {getTypeIcon(selectedIncident.event_type || selectedIncident.type || '')}
                                    {selectedIncident.event_type || selectedIncident.type}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Severity</p>
                                <p className="text-slate-900 font-bold">{Math.round(selectedIncident.severity * 100)}%</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Status</p>
                                <p className={`text-sm font-bold capitalize inline-block px-2 py-0.5 rounded ${getStatusColor(selectedIncident.status)}`}>
                                    {selectedIncident.status || 'pending'}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Location</p>
                                <p className="text-slate-900 font-medium flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {selectedIncident.lat?.toFixed(6)}, {selectedIncident.lng?.toFixed(6)}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Verifications</p>
                                <p className="text-slate-900 font-bold">{selectedIncident.verified || 0}</p>
                            </div>
                        </div>

                        {selectedIncident.description && (
                            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-2">Description</p>
                                <p className="text-slate-700 text-sm leading-relaxed">{selectedIncident.description}</p>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
