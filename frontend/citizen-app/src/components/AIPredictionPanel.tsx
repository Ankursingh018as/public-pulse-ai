'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, 
  MapPin, ChevronRight, RefreshCw, Shield, Zap, CloudRain, Car,
  Trash2, Lightbulb, Droplets, X, Sparkles, Bell, Eye
} from 'lucide-react';
import { 
  generatePredictions, 
  generateAIAlerts, 
  Prediction, 
  AIAlert,
  getAreaSafetyScore 
} from '../services/predictionService';

interface AIPredictionPanelProps {
  incidents: { 
    id: string;
    event_type: string; 
    lat: number; 
    lng: number; 
    severity: number;
    createdAt: number;
  }[];
  onPredictionSelect?: (prediction: Prediction) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function AIPredictionPanel({ 
  incidents, 
  onPredictionSelect,
  userLocation 
}: AIPredictionPanelProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [safetyScore, setSafetyScore] = useState<{
    score: number;
    label: string;
    factors: { name: string; impact: number }[];
    recommendation: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'predictions' | 'alerts' | 'safety'>('predictions');
  const [expanded, setExpanded] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Fetch predictions
  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      const formattedIncidents = incidents.map(inc => ({
        type: inc.event_type,
        lat: inc.lat,
        lng: inc.lng,
        severity: inc.severity
      }));

      // Generate predictions
      const newPredictions = await generatePredictions(formattedIncidents);
      setPredictions(newPredictions);

      // Generate AI alerts
      const newAlerts = await generateAIAlerts(newPredictions, formattedIncidents);
      setAlerts(prev => {
        // Merge new alerts, avoiding duplicates
        const existingIds = new Set(prev.map(a => a.title));
        return [...prev.filter(a => !dismissedAlerts.has(a.id)), 
                ...newAlerts.filter(a => !existingIds.has(a.title))].slice(0, 5);
      });

      // Calculate safety score if user location available
      if (userLocation) {
        const safety = await getAreaSafetyScore(
          userLocation.lat, 
          userLocation.lng, 
          formattedIncidents.map(i => ({ ...i, severity: i.severity })),
          newPredictions
        );
        setSafetyScore(safety);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [incidents, userLocation, dismissedAlerts]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'traffic': return <Car className="w-4 h-4" />;
      case 'water': return <Droplets className="w-4 h-4" />;
      case 'garbage': return <Trash2 className="w-4 h-4" />;
      case 'light': return <Lightbulb className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'traffic': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'water': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'garbage': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'light': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-red-400" />;
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-green-400" />;
      default: return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/30 text-red-300 border-red-500/50',
      high: 'bg-orange-500/30 text-orange-300 border-orange-500/50',
      medium: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50',
      low: 'bg-green-500/30 text-green-300 border-green-500/50'
    };
    return styles[severity] || styles.medium;
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(alertId);
      return newSet;
    });
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Brain size={18} />
        <span className="text-sm font-bold">AI Predictions</span>
        {activeAlerts.length > 0 && (
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs animate-pulse">
            {activeAlerts.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-80 max-h-[70vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Brain size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Predictions</h3>
            <p className="text-[9px] text-white/70">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchPredictions}
            disabled={isLoading}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh predictions"
          >
            <RefreshCw size={14} className={`text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-800/50">
        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex-1 py-2 text-xs font-bold transition-all ${
            activeTab === 'predictions' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Zap size={12} /> Forecast
          </span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'alerts' 
              ? 'text-red-400 border-b-2 border-red-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Bell size={12} /> Alerts
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 right-2 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`flex-1 py-2 text-xs font-bold transition-all ${
            activeTab === 'safety' 
              ? 'text-green-400 border-b-2 border-green-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Shield size={12} /> Safety
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="p-3 space-y-2">
            {isLoading && predictions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Sparkles className="animate-pulse mb-2" size={24} />
                <span className="text-xs">Analyzing patterns...</span>
              </div>
            )}

            {predictions.length === 0 && !isLoading && (
              <div className="text-center py-6 text-slate-400">
                <Shield size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No significant predictions at this time</p>
              </div>
            )}

            {predictions.map((pred) => (
              <div
                key={pred.id}
                onClick={() => onPredictionSelect?.(pred)}
                className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${getTypeColor(pred.type)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getTypeIcon(pred.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs uppercase tracking-wide text-white">
                        {pred.type}
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(pred.trend)}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSeverityBadge(pred.severity)}`}>
                          {Math.round(pred.probability * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-white/70 flex items-center gap-1 mb-1">
                      <MapPin size={10} /> {pred.area_name}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <Clock size={10} /> Expected in {pred.timeframe}
                      </span>
                      <ChevronRight size={14} className="text-white/30" />
                    </div>

                    {/* Reasons preview */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[9px] text-white/40 mb-1">WHY:</p>
                      <p className="text-[10px] text-white/60">{pred.reasons[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Prediction Summary */}
            {predictions.length > 0 && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase">Summary</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-red-400">
                      {predictions.filter(p => p.type === 'traffic').length}
                    </p>
                    <p className="text-[8px] text-slate-500">Traffic</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-400">
                      {predictions.filter(p => p.type === 'water').length}
                    </p>
                    <p className="text-[8px] text-slate-500">Water</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-400">
                      {predictions.filter(p => p.type === 'garbage').length}
                    </p>
                    <p className="text-[8px] text-slate-500">Garbage</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-400">
                      {predictions.filter(p => p.type === 'light').length}
                    </p>
                    <p className="text-[8px] text-slate-500">Lights</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="p-3 space-y-2">
            {activeAlerts.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No active alerts</p>
                <p className="text-[10px] text-slate-500 mt-1">AI is monitoring for issues</p>
              </div>
            )}

            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border relative ${
                  alert.severity === 'critical' 
                    ? 'bg-red-500/20 border-red-500/30 animate-pulse' 
                    : alert.severity === 'warning'
                      ? 'bg-yellow-500/20 border-yellow-500/30'
                      : 'bg-blue-500/20 border-blue-500/30'
                }`}
              >
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="absolute top-2 right-2 text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>

                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-red-400' : 
                    alert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                  }`} />
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-xs text-white mb-1">{alert.title}</h4>
                    <p className="text-[10px] text-white/70 mb-2">{alert.message}</p>
                    
                    {alert.recommendations.length > 0 && (
                      <div className="bg-white/10 rounded-lg p-2 mt-2">
                        <p className="text-[9px] text-cyan-400 font-bold mb-1">RECOMMENDED:</p>
                        <p className="text-[10px] text-white/80">{alert.recommendations[0]}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-[9px] text-white/40">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {alert.affectedArea}
                      </span>
                      <span>•</span>
                      <span>{Math.round(alert.confidence * 100)}% confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Safety Tab */}
        {activeTab === 'safety' && (
          <div className="p-3">
            {!userLocation ? (
              <div className="text-center py-8 text-slate-400">
                <MapPin size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">Enable location for safety score</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  We'll analyze your current area
                </p>
              </div>
            ) : safetyScore ? (
              <div className="space-y-4">
                {/* Main Score */}
                <div className="text-center py-4">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${
                    safetyScore.score >= 80 ? 'border-green-500 text-green-400' :
                    safetyScore.score >= 60 ? 'border-yellow-500 text-yellow-400' :
                    safetyScore.score >= 40 ? 'border-orange-500 text-orange-400' :
                    'border-red-500 text-red-400'
                  }`}>
                    <div>
                      <p className="text-3xl font-bold">{safetyScore.score}</p>
                      <p className="text-[10px] uppercase tracking-wider">{safetyScore.label}</p>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">AI Assessment</p>
                  <p className="text-xs text-white/80">{safetyScore.recommendation}</p>
                </div>

                {/* Factors */}
                {safetyScore.factors.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Impact Factors</p>
                    <div className="space-y-1">
                      {safetyScore.factors.map((factor, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between text-xs py-1.5 px-2 bg-white/5 rounded-lg"
                        >
                          <span className="text-white/70">{factor.name}</span>
                          <span className={factor.impact < 0 ? 'text-red-400' : 'text-green-400'}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Info */}
                <div className="text-center text-[10px] text-slate-500">
                  <p className="flex items-center justify-center gap-1">
                    <MapPin size={10} />
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Sparkles className="animate-pulse" size={24} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 bg-slate-800/50">
        <p className="text-[9px] text-center text-slate-500">
          Powered by Groq AI • Real-time Analysis
        </p>
      </div>
    </div>
  );
}
