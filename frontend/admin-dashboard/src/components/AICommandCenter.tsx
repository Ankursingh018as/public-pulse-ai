'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Brain, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus,
    Shield, RefreshCw, Zap, MapPin, Clock, Users, ChevronDown, ChevronUp,
    Sparkles, Target
} from 'lucide-react';

interface AICommandCenterProps {
    incidents: any[];
    predictions: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const SUMMARY_REFRESH_INTERVAL_MS = 120000; // Refresh AI summary every 2 minutes

export default function AICommandCenter({ incidents, predictions }: AICommandCenterProps) {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>('overview');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/ai/summary?period=24`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSummary(data.data);
                    setLastRefresh(new Date());
                }
            }
        } catch (err) {
            console.error('Failed to fetch AI summary:', err);
            // Generate local summary as fallback
            generateLocalSummary();
        } finally {
            setLoading(false);
        }
    }, []);

    const generateLocalSummary = useCallback(() => {
        const active = incidents.filter(i => !i.resolved && i.status !== 'resolved');
        const critical = active.filter(i => (i.severity || 0) >= 0.7);
        const pending = active.filter(i => i.status === 'pending');

        const typeDist: Record<string, number> = {};
        active.forEach(i => {
            const t = i.event_type || i.type || 'other';
            typeDist[t] = (typeDist[t] || 0) + 1;
        });

        const areaCounts: Record<string, number> = {};
        active.forEach(i => {
            const a = i.area_name || 'Unknown';
            areaCounts[a] = (areaCounts[a] || 0) + 1;
        });
        const hotspots = Object.entries(areaCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([area, count]) => ({ area, incidents: count, severity: 0.5 }));

        let score = 100 - Math.min(30, active.length * 2) - Math.min(25, critical.length * 8);
        score = Math.max(0, Math.min(100, score));
        const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : score >= 40 ? 'Concerning' : 'Critical';

        let narrative = `📊 Tracking ${active.length} active incidents.`;
        if (critical.length > 0) narrative = `⚠️ ${critical.length} critical issues need attention. ` + narrative;
        if (pending.length > 0) narrative += ` ⏳ ${pending.length} awaiting review.`;

        setSummary({
            health_score: score,
            health_label: label,
            metrics: {
                total_active: active.length,
                critical: critical.length,
                pending_review: pending.length,
                predictions_active: predictions.length,
            },
            type_distribution: typeDist,
            hotspot_areas: hotspots,
            trend: { direction: 'stable', change_percent: 0 },
            narrative,
            recommendations: [],
            anomalies: [],
        });
        setLastRefresh(new Date());
    }, [incidents, predictions]);

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, SUMMARY_REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchSummary]);

    // Also update local summary when incidents change
    useEffect(() => {
        if (!summary && incidents.length > 0) {
            generateLocalSummary();
        }
    }, [incidents, summary, generateLocalSummary]);

    const getHealthColor = (score: number) => {
        if (score >= 85) return 'text-emerald-400';
        if (score >= 70) return 'text-green-400';
        if (score >= 55) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getHealthBg = (score: number) => {
        if (score >= 85) return 'from-emerald-500/20 to-emerald-600/10';
        if (score >= 70) return 'from-green-500/20 to-green-600/10';
        if (score >= 55) return 'from-yellow-500/20 to-yellow-600/10';
        if (score >= 40) return 'from-orange-500/20 to-orange-600/10';
        return 'from-red-500/20 to-red-600/10';
    };

    const TrendIcon = ({ direction }: { direction: string }) => {
        if (direction === 'increasing') return <TrendingUp className="w-4 h-4 text-red-400" />;
        if (direction === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-400" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    if (loading && !summary) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <Brain className="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 className="text-slate-900 font-bold">AI Command Center</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* Header */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-bold text-sm">AI Command Center</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Analyzing...'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchSummary}
                    disabled={loading}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-600"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Health Score */}
            {summary && (
                <div className={`p-5 bg-gradient-to-r ${getHealthBg(summary.health_score)} border-b border-slate-50`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">City Health Score</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className={`text-3xl font-black ${getHealthColor(summary.health_score)}`}>
                                    {summary.health_score}
                                </span>
                                <span className="text-sm text-slate-500 font-medium">/100</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${getHealthColor(summary.health_score)} bg-white/60 backdrop-blur-sm border border-white/20 shadow-sm`}>
                                    {summary.health_label}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-lg border border-white/20">
                            <TrendIcon direction={summary.trend?.direction || 'stable'} />
                            <span className="text-xs text-slate-600 font-bold">
                                {summary.trend?.direction === 'increasing' ? '↑' : summary.trend?.direction === 'decreasing' ? '↓' : '→'}
                                {Math.abs(summary.trend?.change_percent || 0)}%
                            </span>
                        </div>
                    </div>

                    {/* Health bar */}
                    <div className="w-full bg-slate-200/50 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${summary.health_score >= 70 ? 'bg-emerald-500' :
                                summary.health_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                } shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                            style={{ width: `${summary.health_score}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            {summary?.metrics && (
                <div className="grid grid-cols-4 divide-x divide-slate-50 border-b border-slate-50">
                    <div className="p-4 text-center group hover:bg-slate-50/50 transition-colors">
                        <p className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{summary.metrics.total_active}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Active</p>
                    </div>
                    <div className="p-4 text-center group hover:bg-slate-50/50 transition-colors">
                        <p className="text-xl font-black text-rose-500">{summary.metrics.critical}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Critical</p>
                    </div>
                    <div className="p-4 text-center group hover:bg-slate-50/50 transition-colors">
                        <p className="text-xl font-black text-amber-500">{summary.metrics.pending_review}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Pending</p>
                    </div>
                    <div className="p-4 text-center group hover:bg-slate-50/50 transition-colors">
                        <p className="text-xl font-black text-violet-500">{summary.metrics.predictions_active}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Forecast</p>
                    </div>
                </div>
            )}

            {/* AI Narrative */}
            {summary?.narrative && (
                <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        <p className="text-[10px] text-violet-600 uppercase tracking-wider font-bold">AI Analysis</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{summary.narrative}</p>
                </div>
            )}

            {/* Hotspots */}
            {summary?.hotspot_areas && summary.hotspot_areas.length > 0 && (
                <div className="p-4 border-b border-slate-50">
                    <button
                        onClick={() => setExpanded(expanded === 'hotspots' ? null : 'hotspots')}
                        className="flex items-center justify-between w-full mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <p className="text-[10px] text-rose-600 uppercase tracking-wider font-bold group-hover:text-rose-700 transition-colors">Hotspot Areas</p>
                        </div>
                        {expanded === 'hotspots' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {expanded === 'hotspots' && (
                        <div className="space-y-2">
                            {summary.hotspot_areas.map((h: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-xs text-slate-700 font-semibold">{h.area}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-medium">{h.incidents} incidents</span>
                                        <div className={`w-2 h-2 rounded-full ${h.severity >= 0.7 ? 'bg-rose-500' : h.severity >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                            } ring-2 ring-white shadow-sm`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations */}
            {summary?.recommendations && summary.recommendations.length > 0 && (
                <div className="p-4 border-b border-slate-50">
                    <button
                        onClick={() => setExpanded(expanded === 'recs' ? null : 'recs')}
                        className="flex items-center justify-between w-full mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-cyan-600" />
                            <p className="text-[10px] text-cyan-600 uppercase tracking-wider font-bold group-hover:text-cyan-700 transition-colors">AI Recommendations</p>
                        </div>
                        {expanded === 'recs' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {expanded === 'recs' && (
                        <div className="space-y-2">
                            {summary.recommendations.map((rec: any, i: number) => (
                                <div key={i} className={`p-3 rounded-xl border ${rec.priority === 'high' ? 'bg-rose-50/50 border-rose-100' :
                                    'bg-cyan-50/50 border-cyan-100'
                                    }`}>
                                    <p className="text-xs text-slate-800 font-semibold">{rec.action}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 font-medium">{rec.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Anomalies */}
            {summary?.anomalies && summary.anomalies.length > 0 && (
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-[10px] text-amber-600 uppercase tracking-wider font-bold">Anomalies Detected</p>
                    </div>
                    <div className="space-y-2">
                        {summary.anomalies.map((a: any, i: number) => (
                            <div key={i} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <p className="text-xs text-amber-900 font-semibold">{a.description}</p>
                                <p className="text-[10px] text-slate-500 mt-1 font-medium">💡 {a.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
