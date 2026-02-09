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
        const interval = setInterval(fetchSummary, 60000);
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
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl">
                        <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                    </div>
                    <h3 className="text-white font-bold">AI Command Center</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl">
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">AI Command Center</h3>
                        <p className="text-[10px] text-slate-500">
                            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Analyzing...'}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={fetchSummary}
                    disabled={loading}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Health Score */}
            {summary && (
                <div className={`p-4 bg-gradient-to-r ${getHealthBg(summary.health_score)} border-b border-white/5`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">City Health Score</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className={`text-3xl font-black ${getHealthColor(summary.health_score)}`}>
                                    {summary.health_score}
                                </span>
                                <span className="text-sm text-slate-400">/100</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getHealthColor(summary.health_score)} bg-white/5`}>
                                    {summary.health_label}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendIcon direction={summary.trend?.direction || 'stable'} />
                            <span className="text-xs text-slate-400">
                                {summary.trend?.direction === 'increasing' ? '↑' : summary.trend?.direction === 'decreasing' ? '↓' : '→'}
                                {Math.abs(summary.trend?.change_percent || 0)}%
                            </span>
                        </div>
                    </div>
                    
                    {/* Health bar */}
                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                                summary.health_score >= 70 ? 'bg-emerald-500' : 
                                summary.health_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${summary.health_score}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            {summary?.metrics && (
                <div className="grid grid-cols-4 divide-x divide-white/5 border-b border-white/5">
                    <div className="p-3 text-center">
                        <p className="text-lg font-black text-white">{summary.metrics.total_active}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Active</p>
                    </div>
                    <div className="p-3 text-center">
                        <p className="text-lg font-black text-red-400">{summary.metrics.critical}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Critical</p>
                    </div>
                    <div className="p-3 text-center">
                        <p className="text-lg font-black text-yellow-400">{summary.metrics.pending_review}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Pending</p>
                    </div>
                    <div className="p-3 text-center">
                        <p className="text-lg font-black text-purple-400">{summary.metrics.predictions_active}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Predictions</p>
                    </div>
                </div>
            )}

            {/* AI Narrative */}
            {summary?.narrative && (
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">AI Analysis</p>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{summary.narrative}</p>
                </div>
            )}

            {/* Hotspots */}
            {summary?.hotspot_areas && summary.hotspot_areas.length > 0 && (
                <div className="p-4 border-b border-white/5">
                    <button 
                        onClick={() => setExpanded(expanded === 'hotspots' ? null : 'hotspots')}
                        className="flex items-center justify-between w-full mb-2"
                    >
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-red-400" />
                            <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Hotspot Areas</p>
                        </div>
                        {expanded === 'hotspots' ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>
                    {expanded === 'hotspots' && (
                        <div className="space-y-2">
                            {summary.hotspot_areas.map((h: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                    <span className="text-xs text-white font-medium">{h.area}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">{h.incidents} incidents</span>
                                        <div className={`w-2 h-2 rounded-full ${
                                            h.severity >= 0.7 ? 'bg-red-500' : h.severity >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations */}
            {summary?.recommendations && summary.recommendations.length > 0 && (
                <div className="p-4 border-b border-white/5">
                    <button
                        onClick={() => setExpanded(expanded === 'recs' ? null : 'recs')}
                        className="flex items-center justify-between w-full mb-2"
                    >
                        <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-cyan-400" />
                            <p className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">AI Recommendations</p>
                        </div>
                        {expanded === 'recs' ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>
                    {expanded === 'recs' && (
                        <div className="space-y-2">
                            {summary.recommendations.map((rec: any, i: number) => (
                                <div key={i} className={`p-2.5 rounded-lg border ${
                                    rec.priority === 'high' ? 'bg-red-500/5 border-red-500/20' :
                                    'bg-cyan-500/5 border-cyan-500/20'
                                }`}>
                                    <p className="text-xs text-white font-medium">{rec.action}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{rec.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Anomalies */}
            {summary?.anomalies && summary.anomalies.length > 0 && (
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Anomalies Detected</p>
                    </div>
                    <div className="space-y-2">
                        {summary.anomalies.map((a: any, i: number) => (
                            <div key={i} className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                <p className="text-xs text-amber-300 font-medium">{a.description}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">💡 {a.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
