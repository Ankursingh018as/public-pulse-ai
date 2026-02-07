'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, Bell, Zap, Search, Calendar, Filter } from 'lucide-react';
import MapSimulation from '../components/MapSimulation';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/dashboard/StatCard';
import PredictionCard from '../components/dashboard/PredictionCard';
import HistoryView from '../components/HistoryView';
import { useWebSocket } from '../hooks/useWebSocket';
import adminDataService from '../services/adminDataService';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('Live Monitor');
    const [stats, setStats] = useState({ issues: 0, predictions: 0 });
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    // Real-time WebSocket updates
    const { isConnected, lastEvent } = useWebSocket({
        onNewPrediction: (prediction) => {
            setPredictions(prev => [prediction, ...prev].slice(0, 50));
            setStats(s => ({ ...s, predictions: s.predictions + 1 }));
            addNotification(`New ${prediction.event_type} prediction detected`, 'prediction');
        },
        onNewIncident: (incident) => {
            setStats(s => ({ ...s, issues: s.issues + 1 }));
            addNotification(`Incident Report: ${incident.type}`, 'incident');
        },
        onNewAlert: (alert) => {
            addNotification(`CRITICAL ALERT: ${alert.message}`, 'alert');
        }
    });

    const addNotification = useCallback((message: string, type: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
                
                // Fetch both, but handle each independently
                const [predRes, incRes] = await Promise.all([
                    fetch(`${API_URL}/predictions`).catch(() => null),
                    fetch(`${API_URL}/incidents?limit=100`).catch(() => null)
                ]);

                let predictions = [];
                let incidents = [];

                // Handle predictions response
                if (predRes && predRes.ok) {
                    const predData = await predRes.json();
                    predictions = predData.data || [];
                    setPredictions(predictions);
                }

                // Handle incidents response (this should work even if predictions fail)
                if (incRes && incRes.ok) {
                    const incData = await incRes.json();
                    incidents = incData.data || [];
                }

                setStats({
                    predictions: predictions.length,
                    issues: incidents.length
                });

            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen bg-[url('/bg-dark.jpg')] bg-cover bg-fixed">
            {/* Overlay if image missing, ensuring dark theme */}
            <div className="fixed inset-0 bg-[#0f172a]/90 -z-10"></div>

            {/* Notifications */}
            <div className="fixed top-8 right-8 z-[100] space-y-3 w-80">
                {notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 flex items-start gap-3 animate-slide-in
                        ${n.type === 'alert' ? 'bg-red-500/80 text-white shadow-red-500/20' :
                            n.type === 'prediction' ? 'bg-purple-600/80 text-white shadow-purple-500/20' :
                                'bg-slate-700/80 text-white'}`}>
                        <div className="mt-1"><Bell className="w-4 h-4" /></div>
                        <div>
                            <p className="text-sm font-semibold">{n.message}</p>
                            <p className="text-[10px] opacity-70 mt-1">Just now</p>
                        </div>
                    </div>
                ))}
            </div>

            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isConnected={isConnected} />

            <main className="flex-1 ml-72 p-8 overflow-y-auto h-screen relative">
                {/* Top Bar */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Vadodara Center</h2>
                        <p className="text-slate-400 text-sm mt-1">Real-time Semantic Urban Analysis</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search areas..."
                                className="bg-transparent text-sm text-white pl-10 pr-4 py-2 focus:outline-none w-64 placeholder:text-slate-600"
                            />
                        </div>
                        <div className="h-6 w-px bg-white/10"></div>
                        <button className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                            <Filter className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                            <Calendar className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {activeTab === 'Live Monitor' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-6">
                            <StatCard label="Active Issues" value={stats.issues.toString()} trend="12%" trendUp={false} icon={AlertTriangle} color="red" />
                            <StatCard label="Predictions" value={stats.predictions.toString()} trend="5%" trendUp={true} icon={Zap} color="purple" />
                            <StatCard label="Avg Response" value="12m" trend="2m" trendUp={true} icon={Activity} color="blue" />
                            <StatCard label="City Health" value="94%" trend="Stable" trendUp={true} icon={Activity} color="green" />
                        </div>

                        <div className="grid grid-cols-12 gap-8 h-[600px]">
                            {/* Map Section */}
                            <div className="col-span-8 bg-slate-800/50 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
                                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        LIVE FEED
                                    </span>
                                </div>
                                <div className="h-full w-full grayscale-[0.3]">
                                    <MapSimulation />
                                </div>
                            </div>

                            {/* Live Predictions Feed */}
                            <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-bold text-white">Risk Forecast</h3>
                                    <span className="text-xs text-slate-500">Real-time AI</span>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-2 h-full pb-20 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-40">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                                        </div>
                                    ) : predictions.length === 0 ? (
                                        <p className="text-slate-500 text-center py-10">No active risks detected.</p>
                                    ) : (
                                        predictions.map((pred: any, i: number) => (
                                            <PredictionCard key={i} prediction={pred} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Map Simulation' && (
                    <div className="h-[80vh] rounded-3xl overflow-hidden glass shadow-2xl border border-white/10">
                        <MapSimulation />
                    </div>
                )}

                {activeTab === 'Alerts' && <AlertsView />}
                {activeTab === 'Analytics' && <AnalyticsDashboard />}
                {activeTab === 'History' && <HistoryView />}

                {/* Fallback for other tabs */}
                {(activeTab !== 'Live Monitor' && activeTab !== 'Map Simulation' && activeTab !== 'Alerts' && activeTab !== 'Analytics' && activeTab !== 'History') && (
                    <div className="flex items-center justify-center h-[60vh] text-slate-500 flex-col gap-4">
                        <Activity className="w-16 h-16 opacity-20" />
                        <p>Module Under Development</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// Internal Components (simplified for length, usually separate)

function AlertsView() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
                const res = await fetch(`${API_URL}/alerts?limit=50`);
                if (res.ok) {
                    const data = await res.json();
                    setAlerts(data.data || []);
                } else {
                    setError('Failed to load alerts');
                }
            } catch (err) {
                console.error('Error fetching alerts:', err);
                setError('Unable to connect to server');
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Alert Center</h3>
                
                {loading && (
                    <div className="text-center py-8 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
                        Loading alerts...
                    </div>
                )}
                
                {error && !loading && (
                    <div className="text-center py-8 text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <Bell className="mx-auto mb-2" size={32} />
                        <p>{error}</p>
                        <p className="text-sm text-slate-400 mt-1">Alerts feature requires MongoDB connection</p>
                    </div>
                )}
                
                {!loading && !error && alerts.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <Bell className="mx-auto mb-2" size={32} />
                        <p>No active alerts</p>
                    </div>
                )}
                
                <div className="space-y-3">
                    {alerts.map((alert, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex justify-between items-center group">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>{alert.severity}</span>
                                    <span className="text-slate-400 text-sm">{new Date(alert.created_at).toLocaleTimeString()}</span>
                                </div>
                                <h4 className="font-semibold text-white mt-1 group-hover:text-cyan-400 transition-colors">{alert.title}</h4>
                                <p className="text-sm text-slate-400">{alert.message}</p>
                            </div>
                            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white font-medium transition-colors">
                                Actions
                            </button>
                        </div>
                    ))}
                    {alerts.length === 0 && <p className="text-slate-500 text-center">No alerts found.</p>}
                </div>
            </div>
        </div>
    )
}
