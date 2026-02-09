'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, AlertTriangle, Clock, CheckCircle,
    Zap, Shield, MapPin, Users, Eye, Target, Flame, Droplets, Trash2, Lightbulb,
    ArrowUpRight, ArrowDownRight, MoreHorizontal, RefreshCw, Download, Filter
} from 'lucide-react';

const TYPE_COLORS = {
    traffic: '#ef4444',
    water: '#3b82f6',
    garbage: '#f97316',
    streetlight: '#eab308',
    light: '#eab308',
    road: '#a855f7',
    encroachment: '#8b5cf6',
    animals: '#10b981',
    flood: '#06b6d4',
    noise: '#ec4899',
    other: '#6366f1'
};

const GRADIENT_COLORS = {
    cyan: ['#06b6d4', '#0891b2'],
    purple: ['#a855f7', '#7c3aed'],
    emerald: ['#10b981', '#059669'],
    rose: ['#f43f5e', '#e11d48'],
    amber: ['#f59e0b', '#d97706'],
    blue: ['#3b82f6', '#2563eb']
};

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState('7d');
    const [stats, setStats] = useState<any>(null);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setRefreshing(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

            const [summaryRes, trendsRes, typeRes, perfRes] = await Promise.all([
                fetch(`${API_URL}/analytics/summary?days=${parseInt(timeRange)}`),
                fetch(`${API_URL}/analytics/trends?days=${parseInt(timeRange)}`),
                fetch(`${API_URL}/analytics/by-type`),
                fetch(`${API_URL}/analytics/performance`)
            ]);

            const summary = await summaryRes.json();
            const trends = await trendsRes.json();
            const types = await typeRes.json();
            const perf = await perfRes.json();

            // Process trends
            const trendMap = new Map<string, any>();
            const addToMap = (data: any[], key: string) => {
                data.forEach(item => {
                    const dateStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!trendMap.has(dateStr)) {
                        trendMap.set(dateStr, { date: dateStr, predictions: 0, incidents: 0, resolved: 0 });
                    }
                    const obj = trendMap.get(dateStr);
                    if (key === 'predictions') obj.predictions = parseInt(item.count || 0);
                    if (key === 'issues') obj.incidents = parseInt(item.count || 0);
                    if (key === 'alerts') obj.resolved = parseInt(item.resolved || 0);
                });
            };

            if (trends.data) {
                addToMap(trends.data.predictions || [], 'predictions');
                addToMap(trends.data.issues || [], 'issues');
                addToMap(trends.data.alerts || [], 'alerts');
            }

            const processedTrends = Array.from(trendMap.values())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setTrendData(processedTrends);

            const typeDistribution = (types.data || []).map((t: any) => ({
                name: t.event_type,
                value: parseInt(t.count),
                fill: TYPE_COLORS[t.event_type as keyof typeof TYPE_COLORS] || '#6366f1'
            }));

            setStats({
                totalPredictions: summary.data?.active_predictions || 0,
                highRisk: summary.data?.high_risk_count || 0,
                mediumRisk: summary.data?.medium_risk_count || 0,
                lowRisk: summary.data?.low_risk_count || 0,
                typeDistribution,
                avgResponseTime: Math.round(perf.data?.avg_resolution_time_mins || 0),
                resolutionRate: perf.data?.resolution_rate || 0,
                citizenReports: summary.data?.citizen_reports || 0,
                aiAccuracy: summary.data?.ai_accuracy || 0,
                alerts: {
                    pending: (parseInt(summary.data?.recent_alerts || 0) - parseInt(summary.data?.resolved_alerts || 0)),
                    last_24h: summary.data?.recent_alerts || 0,
                    resolved: summary.data?.resolved_alerts || 0,
                    critical: summary.data?.high_risk_count || 0
                }
            });

        } catch (e) {
            console.error('Failed to fetch analytics', e);
            // Set empty state - rely on real data only
            setStats({
                totalPredictions: 0,
                highRisk: 0,
                mediumRisk: 0,
                lowRisk: 0,
                typeDistribution: [],
                avgResponseTime: 0,
                resolutionRate: 0,
                citizenReports: 0,
                aiAccuracy: 0,
                alerts: { pending: 0, last_24h: 0, resolved: 0, critical: 0 }
            });
            setTrendData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const pieData = stats?.typeDistribution || [];
    const totalIncidents = pieData.reduce((sum: number, item: any) => sum + item.value, 0);

    // Radial data for AI accuracy
    const radialData = [
        { name: 'AI Accuracy', value: stats?.aiAccuracy || 0, fill: '#22d3ee' },
        { name: 'Resolution', value: stats?.resolutionRate || 0, fill: '#a855f7' }
    ];

    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        Analytics Dashboard
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Real-time civic intelligence insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
                        {['7d', '30d', '90d'].map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === range
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-colors shadow-sm">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* KPI Cards - Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <GlowCard
                    title="Active Predictions"
                    value={stats?.totalPredictions || 0}
                    change={12}
                    icon={<Zap className="w-5 h-5" />}
                    gradient="cyan"
                    suffix=""
                />
                <GlowCard
                    title="High Risk Zones"
                    value={stats?.highRisk || 0}
                    change={-5}
                    icon={<Flame className="w-5 h-5" />}
                    gradient="rose"
                    suffix=""
                />
                <GlowCard
                    title="Avg Response"
                    value={stats?.avgResponseTime || 0}
                    change={-8}
                    icon={<Clock className="w-5 h-5" />}
                    gradient="amber"
                    suffix="min"
                />
                <GlowCard
                    title="Resolution Rate"
                    value={stats?.resolutionRate || 0}
                    change={3}
                    icon={<CheckCircle className="w-5 h-5" />}
                    gradient="emerald"
                    suffix="%"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Trend Chart - Larger */}
                <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">Prediction & Incident Trends</h4>
                            <p className="text-slate-500 text-xs mt-1 font-medium">Tracking civic issues over time</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                                <span className="text-slate-500">Predictions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                <span className="text-slate-500">Incidents</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-slate-500">Resolved</span>
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="gradientCyan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientRose" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientEmerald" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="predictions" stroke="#22d3ee" strokeWidth={2} fill="url(#gradientCyan)" />
                            <Area type="monotone" dataKey="incidents" stroke="#f43f5e" strokeWidth={2} fill="url(#gradientRose)" />
                            <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#gradientEmerald)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* AI Performance Radial */}
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">AI Performance</h4>
                            <p className="text-slate-500 text-xs mt-1 font-medium">Model accuracy metrics</p>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="relative">
                        <ResponsiveContainer width="100%" height={200}>
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="90%"
                                data={radialData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    background={{ fill: '#f1f5f9' }}
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-900">{stats?.aiAccuracy}%</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Accuracy</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                <span className="text-xs font-bold text-slate-500 uppercase">Precision</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">92%</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                <span className="text-xs font-bold text-slate-500 uppercase">Recall</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">89%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Issue Type Distribution */}
                <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-900">Issue Types</h4>
                        <span className="text-xs font-bold text-slate-400">{totalIncidents} total</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {pieData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={2} stroke="#fff" />
                                ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                        {pieData.slice(0, 4).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                    <span className="text-slate-500 capitalize">{item.name}</span>
                                </div>
                                <span className="text-slate-800 font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk Levels */}
                <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-900">Risk Levels</h4>
                        <Shield className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="space-y-4">
                        <RiskBar label="Critical" value={stats?.highRisk || 0} max={50} color="rose" />
                        <RiskBar label="High" value={stats?.mediumRisk || 0} max={50} color="amber" />
                        <RiskBar label="Medium" value={25} max={50} color="yellow" />
                        <RiskBar label="Low" value={stats?.lowRisk || 0} max={100} color="emerald" />
                    </div>
                </div>

                {/* Alert Summary */}
                <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-900">Alerts</h4>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-amber-500">{stats?.alerts?.pending || 0} pending</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <AlertStat icon={<AlertTriangle />} label="Critical" value={stats?.alerts?.critical || 0} color="rose" />
                        <AlertStat icon={<Clock />} label="Pending" value={stats?.alerts?.pending || 0} color="amber" />
                        <AlertStat icon={<Eye />} label="Last 24h" value={stats?.alerts?.last_24h || 0} color="blue" />
                        <AlertStat icon={<CheckCircle />} label="Resolved" value={stats?.alerts?.resolved || 0} color="emerald" />
                    </div>
                </div>

                {/* Citizen Engagement */}
                <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-900">Citizen Engagement</h4>
                        <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-center py-4">
                        <div className="text-5xl font-black text-slate-900 mb-1 tracking-tight">{stats?.citizenReports || 0}</div>
                        <div className="text-sm font-medium text-slate-500">Reports this week</div>
                        <div className="flex items-center justify-center gap-1 mt-2 text-emerald-600 text-sm font-bold bg-emerald-50 py-1 px-2 rounded-full inline-flex mx-auto w-auto">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+23% vs last week</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                            <div className="text-lg font-bold text-slate-900">847</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Verifications</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                            <div className="text-lg font-bold text-slate-900">92%</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Trust Score</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hot Zones Section */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">🔥 Active Hot Zones</h4>
                        <p className="text-slate-500 text-xs mt-1 font-medium">Areas requiring immediate attention</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold hover:bg-rose-100 transition-colors border border-rose-100">
                        View All Zones
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <HotZoneCard zone="Alkapuri Circle" type="traffic" severity={92} reports={18} />
                    <HotZoneCard zone="Sayajigunj" type="water" severity={78} reports={12} />
                    <HotZoneCard zone="Gotri Road" type="garbage" severity={65} reports={9} />
                    <HotZoneCard zone="Manjalpur" type="light" severity={54} reports={6} />
                </div>
            </div>
        </div>
    );
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-slate-800">
            <p className="text-slate-900 font-bold mb-2 text-sm">{label}</p>
            {payload.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-medium mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke }}></div>
                    <span className="text-slate-500 capitalize">{item.dataKey}:</span>
                    <span className="text-slate-900 font-bold">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

function PieTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-slate-800">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }}></div>
                <span className="text-slate-900 font-bold capitalize text-sm">{data.name}</span>
            </div>
            <p className="text-slate-500 text-xs mt-1 font-medium">{data.value} incidents</p>
        </div>
    );
}

// Glow Card Component
function GlowCard({ title, value, change, icon, gradient, suffix }: any) {
    const gradients: Record<string, string> = {
        cyan: 'from-cyan-500 to-blue-600',
        rose: 'from-rose-500 to-pink-600',
        amber: 'from-amber-500 to-orange-600',
        emerald: 'from-emerald-500 to-green-600',
        purple: 'from-purple-500 to-violet-600'
    };

    const bgGlows: Record<string, string> = {
        cyan: 'bg-cyan-50 group-hover:bg-cyan-100/50',
        rose: 'bg-rose-50 group-hover:bg-rose-100/50',
        amber: 'bg-amber-50 group-hover:bg-amber-100/50',
        emerald: 'bg-emerald-50 group-hover:bg-emerald-100/50',
        purple: 'bg-purple-50 group-hover:bg-purple-100/50'
    };

    const isPositive = change >= 0;
    const isGood = (gradient === 'emerald' || gradient === 'cyan') ? isPositive : !isPositive;

    return (
        <div className={`bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md relative overflow-hidden group transition-all`}>
            {/* Subtle corner glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${gradients[gradient]} rounded-full opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`}></div>

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">{title}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">
                        {value}{suffix}
                    </p>
                </div>
                <div className={`p-2.5 rounded-xl ${bgGlows[gradient]} transition-colors`}>
                    {/* Clone icon to apply specific text color if needed, or rely on gradient prop */}
                    <span className={
                        gradient === 'cyan' ? 'text-cyan-600' :
                            gradient === 'rose' ? 'text-rose-600' :
                                gradient === 'amber' ? 'text-amber-600' :
                                    gradient === 'emerald' ? 'text-emerald-600' : 'text-purple-600'
                    }>
                        {icon}
                    </span>
                </div>
            </div>
            <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${isGood ? 'text-emerald-600' : 'text-rose-600'} bg-slate-50 w-fit px-2 py-0.5 rounded-md`}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{Math.abs(change)}% vs last period</span>
            </div>
        </div>
    );
}

// Risk Bar Component
function RiskBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const colors: Record<string, string> = {
        rose: 'bg-rose-500',
        amber: 'bg-amber-500',
        yellow: 'bg-yellow-500',
        emerald: 'bg-emerald-500'
    };
    const bgColors: Record<string, string> = {
        rose: 'bg-rose-50',
        amber: 'bg-amber-50',
        yellow: 'bg-yellow-50',
        emerald: 'bg-emerald-50'
    };
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
                <span className="text-xs font-bold text-slate-900">{value}</span>
            </div>
            <div className={`h-2 rounded-full ${bgColors[color]}`}>
                <div
                    className={`h-full rounded-full ${colors[color]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

// Alert Stat Component
function AlertStat({ icon, label, value, color }: any) {
    const colors: Record<string, string> = {
        rose: 'text-rose-600 bg-rose-50',
        amber: 'text-amber-600 bg-amber-50',
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50'
    };

    return (
        <div className="flex items-center justify-between group hover:bg-slate-50 p-2 rounded-xl transition-colors -mx-2">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
                <span className="text-sm font-medium text-slate-600">{label}</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{value}</span>
        </div>
    );
}

// Hot Zone Card Component
function HotZoneCard({ zone, type, severity, reports }: { zone: string; type: string; severity: number; reports: number }) {
    const typeIcons: Record<string, any> = {
        traffic: <Flame className="w-4 h-4" />,
        water: <Droplets className="w-4 h-4" />,
        garbage: <Trash2 className="w-4 h-4" />,
        light: <Lightbulb className="w-4 h-4" />
    };

    // Using softer gradients for light mode but keeping them distinct
    const typeStyles: Record<string, string> = {
        traffic: 'bg-rose-50 border-rose-100 hover:border-rose-200',
        water: 'bg-cyan-50 border-cyan-100 hover:border-cyan-200',
        garbage: 'bg-amber-50 border-amber-100 hover:border-amber-200',
        light: 'bg-yellow-50 border-yellow-100 hover:border-yellow-200'
    };

    const typeText: Record<string, string> = {
        traffic: 'text-rose-700',
        water: 'text-cyan-700',
        garbage: 'text-amber-700',
        light: 'text-yellow-700'
    };

    return (
        <div className={`${typeStyles[type]} p-4 rounded-2xl border transition-all hover:shadow-md group`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-xl bg-white shadow-sm ${typeText[type]}`}>
                    {typeIcons[type]}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${typeText[type]}`}>{type}</span>
            </div>
            <h5 className="font-bold text-slate-900 mb-1">{zone}</h5>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mt-3">
                <span>{severity}% severity</span>
                <span>{reports} reports</span>
            </div>
            {/* Severity bar */}
            <div className="w-full h-1 bg-white/50 rounded-full mt-2 overflow-hidden">
                <div
                    className={`h-full rounded-full ${type.replace('bg-', '') === 'traffic' ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    style={{ width: `${severity}%` }}
                />
            </div>
        </div>
    );
}
