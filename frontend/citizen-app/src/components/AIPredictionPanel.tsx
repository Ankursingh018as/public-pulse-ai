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
      case 'traffic': return 'text-red-600 bg-red-50 border-red-200';
      case 'water': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'garbage': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'light': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-purple-600 bg-purple-50 border-purple-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-emerald-500" />;
      default: return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
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
        className="bg-white text-slate-700 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-slate-200"
      >
        <div className="bg-emerald-600 text-white p-1 rounded-lg">
          <Brain size={16} />
        </div>
        <span className="text-sm font-bold">AI Predictions</span>
        {activeAlerts.length > 0 && (
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs text-white animate-pulse">
            {activeAlerts.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-80 h-96 overflow-hidden flex flex-col ring-1 ring-black/5">
      {/* Header */}
      <div className="bg-white p-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
            <Brain size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">AI Predictions</h3>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchPredictions}
            disabled={isLoading}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh predictions"
          >
            <RefreshCw size={14} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex-1 py-2 text-xs font-bold transition-all ${activeTab === 'predictions'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Zap size={12} /> Forecast
          </span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 text-xs font-bold transition-all relative ${activeTab === 'alerts'
              ? 'text-red-500 border-b-2 border-red-500 bg-white'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Bell size={12} /> Alerts
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center animate-pulse shadow-sm">
                {activeAlerts.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`flex-1 py-2 text-xs font-bold transition-all ${activeTab === 'safety'
              ? 'text-teal-600 border-b-2 border-teal-600 bg-white'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Shield size={12} /> Safety
          </span>
        </button>
      </div>

      {/* Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="p-3 space-y-2">
            {isLoading && predictions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Sparkles className="animate-pulse mb-2 text-emerald-400" size={24} />
                <span className="text-xs font-medium">Analyzing patterns...</span>
              </div>
            )}

            {predictions.length === 0 && !isLoading && (
              <div className="text-center py-6 text-slate-400">
                <Shield size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No significant predictions</p>
              </div>
            )}

            {predictions.map((pred) => (
              <div
                key={pred.id}
                onClick={() => onPredictionSelect?.(pred)}
                className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-white ${getTypeColor(pred.type)} border-opacity-50`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getTypeIcon(pred.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-700">
                        {pred.type}
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(pred.trend)}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getSeverityBadge(pred.severity)}`}>
                          {Math.round(pred.probability * 100)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1 font-medium">
                      <MapPin size={10} /> {pred.area_name}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> Expected in {pred.timeframe}
                      </span>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>

                    {/* Reasons preview */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[9px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Reason Checklist</p>
                      <p className="text-[10px] text-slate-600 leading-relaxed">{pred.reasons[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Prediction Summary */}
            {predictions.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-wider">Category Summary</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-red-500">
                      {predictions.filter(p => p.type === 'traffic').length}
                    </p>
                    <p className="text-[8px] text-slate-500 font-medium uppercase">Traffic</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-500">
                      {predictions.filter(p => p.type === 'water').length}
                    </p>
                    <p className="text-[8px] text-slate-500 font-medium uppercase">Water</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-500">
                      {predictions.filter(p => p.type === 'garbage').length}
                    </p>
                    <p className="text-[8px] text-slate-500 font-medium uppercase">Waste</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-500">
                      {predictions.filter(p => p.type === 'light').length}
                    </p>
                    <p className="text-[8px] text-slate-500 font-medium uppercase">Light</p>
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
                <p className="text-xs font-medium">No active alerts</p>
                <p className="text-[10px] text-slate-500 mt-1">AI is monitoring for issues</p>
              </div>
            )}

            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border relative bg-white shadow-sm ${alert.severity === 'critical'
                    ? 'border-red-200 ring-1 ring-red-100'
                    : alert.severity === 'warning'
                      ? 'border-yellow-200 ring-1 ring-yellow-100'
                      : 'border-blue-200 ring-1 ring-blue-100'
                  }`}
              >
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>

                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === 'critical' ? 'text-red-500' :
                      alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-xs text-slate-800 mb-1">{alert.title}</h4>
                    <p className="text-[10px] text-slate-600 mb-2 leading-relaxed">{alert.message}</p>

                    {alert.recommendations.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2 mt-2 border border-slate-100">
                        <p className="text-[9px] text-emerald-600 font-bold mb-1 uppercase tracking-wider">Recommendation</p>
                        <p className="text-[10px] text-slate-700">{alert.recommendations[0]}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400 font-medium">
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
                <p className="text-xs font-medium">Enable location for safety score</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  We'll analyze your current area
                </p>
              </div>
            ) : safetyScore ? (
              <div className="space-y-4">
                {/* Main Score */}
                <div className="text-center py-4">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-sm bg-white ${safetyScore.score >= 80 ? 'border-emerald-500 text-emerald-600' :
                      safetyScore.score >= 60 ? 'border-yellow-500 text-yellow-600' :
                        safetyScore.score >= 40 ? 'border-orange-500 text-orange-600' :
                          'border-red-500 text-red-600'
                    }`}>
                    <div>
                      <p className="text-3xl font-black">{safetyScore.score}</p>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Score</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-600">{safetyScore.label}</p>
                </div>

                {/* Recommendation */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">AI Assessment</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{safetyScore.recommendation}</p>
                </div>

                {/* Factors */}
                {safetyScore.factors.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">Impact Factors</p>
                    <div className="space-y-1">
                      {safetyScore.factors.map((factor, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-2 px-3 bg-white border border-slate-100 rounded-lg shadow-sm"
                        >
                          <span className="text-slate-600 font-medium">{factor.name}</span>
                          <span className={`font-bold ${factor.impact < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Info */}
                <div className="text-center text-[10px] text-slate-400 font-medium">
                  <p className="flex items-center justify-center gap-1">
                    <MapPin size={10} />
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Sparkles className="animate-pulse text-emerald-400" size={24} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0">
        <p className="text-[9px] text-center text-slate-400 font-medium">
          Powered by Public Pulse AI • Real-time Analysis
        </p>
      </div>
    </div>
  );
}
