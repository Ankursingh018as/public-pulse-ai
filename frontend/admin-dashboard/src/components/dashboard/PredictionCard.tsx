import { AlertTriangle, Clock, MapPin, Search } from 'lucide-react';

interface Prediction {
    event_type: string;
    area_name: string;
    probability: number;
    eta_hours?: number;
    reasons?: string[];
    risk_breakdown?: any;
    id: string;
}

export default function PredictionCard({ prediction }: { prediction: Prediction }) {
    const isCritical = prediction.probability > 0.8;
    const isHigh = prediction.probability > 0.6;

    // Config based on type
    const typeConfig: any = {
        traffic: { color: 'text-red-400', bg: 'bg-red-500', label: 'Traffic Congestion' },
        water: { color: 'text-blue-400', bg: 'bg-blue-500', label: 'Waterlogging' },
        garbage: { color: 'text-orange-400', bg: 'bg-orange-500', label: 'Garbage Overflow' },
        light: { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Streetlight Failure' },
        general: { color: 'text-slate-400', bg: 'bg-slate-500', label: 'Civic Issue' }
    };

    const config = typeConfig[prediction.event_type.toLowerCase()] || typeConfig['general'];

    return (
        <div className={`glass-card p-4 rounded-xl border-l-4 relative group hover:scale-[1.02] transition-transform ${isCritical ? 'border-l-red-500 shadow-red-900/20' : isHigh ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/5 uppercase tracking-wider ${config.color}`}>
                            {config.label}
                        </span>
                        {prediction.eta_hours && prediction.eta_hours <= 2 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                <Clock className="w-3 h-3" /> ETA {prediction.eta_hours}h
                            </span>
                        )}
                    </div>

                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {prediction.area_name}
                    </h4>

                    <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>Vadodara City</span>
                    </div>

                    {/* Reasons - Micro */}
                    {prediction.reasons && prediction.reasons.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-1 italic">
                            "{prediction.reasons[0]}"
                        </p>
                    )}
                </div>

                {/* Probability Donut/Score */}
                <div className="text-right">
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                className={`${isCritical ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : config.color}`}
                                strokeDasharray={175}
                                strokeDashoffset={175 - (175 * prediction.probability)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                            <span className={`text-sm font-bold ${isCritical ? 'text-white' : 'text-slate-300'}`}>
                                {(prediction.probability * 100).toFixed(0)}%
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase">Risk</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover Action */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer z-10">
                <button className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg">
                    <Search className="w-4 h-4" /> View Analysis
                </button>
            </div>
        </div>
    );
}
