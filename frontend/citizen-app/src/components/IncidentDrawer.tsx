import { useRef, useEffect } from 'react';
import { X, MapPin, Clock, Users, Shield, CheckCircle, Navigation } from 'lucide-react';
import { Incident } from '../hooks/useIncidents';

interface IncidentDrawerProps {
    incident: Incident | null;
    onClose: () => void;
    onVerify: (response: 'yes' | 'no', hasPhoto: boolean) => void;
}

export default function IncidentDrawer({ incident, onClose, onVerify }: IncidentDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on click outside (optional logic if needed)

    if (!incident) return null;

    const isHighSeverity = incident.severity > 0.6;
    const severityColor = isHighSeverity ? 'text-red-400' : incident.severity > 0.3 ? 'text-orange-400' : 'text-yellow-400';
    const severityLabel = isHighSeverity ? 'CRITICAL' : incident.severity > 0.3 ? 'MODERATE' : 'MINOR';
    const borderColor = isHighSeverity ? 'border-red-500/30' : 'border-cyan-500/30';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`fixed bottom-0 left-0 right-0 z-[1000] bg-slate-900/95 backdrop-blur-xl border-t ${borderColor} rounded-t-3xl shadow-2xl transform transition-transform duration-300 slide-in-up`}
                style={{ maxHeight: '85vh' }}
            >
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

                <div className="p-6 pb-24 overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${isHighSeverity ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
                                    {severityLabel} Issue
                                </span>
                                <span className="text-xs text-slate-500 font-mono">#{incident.id.slice(-6)}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white capitalize">{incident.event_type} Reported</h2>
                            <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                                <MapPin size={14} /> Near Vadodara Central • <Clock size={14} className="ml-2" /> 5m ago
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
                                <Shield size={14} className="text-purple-400" /> Confidence
                            </div>
                            <p className="text-2xl font-bold text-white">{Math.round(incident.severity * 100)}%</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
                                <Users size={14} className="text-green-400" /> Verifications
                            </div>
                            <p className="text-2xl font-bold text-white">{incident.verified || 0}</p>
                        </div>
                    </div>

                    {/* Verification Action */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <h3 className="text-lg font-bold text-white mb-2 relative z-10">Is this happening now?</h3>
                        <p className="text-sm text-slate-400 mb-4 relative z-10">Help your community by verifying this report. You earn Trust Points.</p>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <button
                                onClick={() => onVerify('yes', false)}
                                className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition"
                            >
                                <CheckCircle size={18} /> Yes, Confirm
                            </button>
                            <button
                                onClick={() => onVerify('no', false)}
                                className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 transition"
                            >
                                <X size={18} /> No, Deny
                            </button>
                        </div>
                        <button className="w-full mt-3 py-3 border border-dashed border-slate-600 text-slate-400 hover:text-white rounded-xl text-sm font-medium hover:border-slate-400 transition flex items-center justify-center gap-2">
                            📷 Upload Photo Evidence (+0.50 Trust)
                        </button>
                    </div>

                    {/* Directions Button */}
                    <button className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-cyan-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-cyan-500/20 active:scale-95 transition">
                        <Navigation size={18} /> Get Safety Directions
                    </button>
                </div>
            </div>
        </>
    );
}
