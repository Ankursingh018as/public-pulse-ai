'use client';

import { AlertTriangle, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Incident } from '../hooks/useIncidents';

interface AlertsViewProps {
    incidents: Incident[];
    onIncidentClick: (incident: Incident) => void;
}

export default function AlertsView({ incidents, onIncidentClick }: AlertsViewProps) {
    const sortedIncidents = [...incidents].sort((a, b) => b.severity - a.severity);
    const criticalIncidents = sortedIncidents.filter(inc => inc.severity >= 0.7);
    const moderateIncidents = sortedIncidents.filter(inc => inc.severity >= 0.4 && inc.severity < 0.7);
    const minorIncidents = sortedIncidents.filter(inc => inc.severity < 0.4);

    const getTimeAgo = (timestamp: number) => {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        return `${Math.floor(minutes / 60)}h ago`;
    };

    const getSeverityColor = (severity: number) => {
        if (severity >= 0.7) return 'border-red-500/30 bg-red-500/5';
        if (severity >= 0.4) return 'border-orange-500/30 bg-orange-500/5';
        return 'border-yellow-500/30 bg-yellow-500/5';
    };

    const getSeverityBadge = (severity: number) => {
        if (severity >= 0.7) return { label: 'CRITICAL', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
        if (severity >= 0.4) return { label: 'MODERATE', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
        return { label: 'MINOR', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
    };

    const renderIncidentCard = (inc: Incident) => {
        const badge = getSeverityBadge(inc.severity);

        return (
            <div
                key={inc.id}
                onClick={() => onIncidentClick(inc)}
                className={`p-4 rounded-2xl border ${getSeverityColor(inc.severity)} backdrop-blur-sm cursor-pointer hover:bg-white/5 transition-all active:scale-[0.98]`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${badge.color} border`}>
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white capitalize text-sm">{inc.event_type} Issue</h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock size={12} /> {getTimeAgo(inc.createdAt)}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color} uppercase`}>
                        {badge.label}
                    </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin size={12} className="text-cyan-400" />
                        <span>Near you</span>
                    </div>
                    {inc.verified > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle size={12} />
                            <span>{inc.verified} verified</span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">Unverified</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 bg-slate-950 overflow-y-auto pb-28 z-[600]">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pt-6 pb-4 px-4 z-10 backdrop-blur-xl">
                <h1 className="text-2xl font-bold text-white mb-1">Active Alerts</h1>
                <p className="text-sm text-slate-400">Your neighborhood watch</p>
            </div>

            {/* Stats Summary */}
            <div className="px-4 mb-6">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-red-400">{criticalIncidents.length}</p>
                        <p className="text-[10px] text-red-300/70 font-bold uppercase tracking-wide">Critical</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-orange-400">{moderateIncidents.length}</p>
                        <p className="text-[10px] text-orange-300/70 font-bold uppercase tracking-wide">Moderate</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-yellow-400">{minorIncidents.length}</p>
                        <p className="text-[10px] text-yellow-300/70 font-bold uppercase tracking-wide">Minor</p>
                    </div>
                </div>
            </div>

            {/* Incident Lists */}
            <div className="px-4 space-y-6">
                {criticalIncidents.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Critical Incidents
                        </h2>
                        <div className="space-y-3">
                            {criticalIncidents.map(renderIncidentCard)}
                        </div>
                    </div>
                )}

                {moderateIncidents.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Moderate Issues
                        </h2>
                        <div className="space-y-3">
                            {moderateIncidents.map(renderIncidentCard)}
                        </div>
                    </div>
                )}

                {minorIncidents.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            Minor Reports
                        </h2>
                        <div className="space-y-3">
                            {minorIncidents.map(renderIncidentCard)}
                        </div>
                    </div>
                )}

                {incidents.length === 0 && (
                    <div className="text-center py-16">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-3 opacity-50" />
                        <h3 className="text-lg font-bold text-white mb-2">All Clear!</h3>
                        <p className="text-sm text-slate-400">No active alerts in your area</p>
                    </div>
                )}
            </div>
        </div>
    );
}
