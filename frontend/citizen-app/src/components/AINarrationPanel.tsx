'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, AlertTriangle, RefreshCw, Sparkles, X } from 'lucide-react';
import { generateNarration, Incident, NarrationResult } from '../services/groqService';
import { fetchWeather } from '../services/weatherService';

interface AINarrationPanelProps {
  incidents: Incident[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function AINarrationPanel({ incidents, isMinimized = false, onToggleMinimize }: AINarrationPanelProps) {
  const [narrations, setNarrations] = useState<NarrationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(!isMinimized);

  // Generate narration for most critical incident
  const generateTopNarration = useCallback(async () => {
    if (incidents.length === 0) return;

    // Find the most critical incident (highest severity + verification weight)
    const sorted = [...incidents].sort((a, b) => {
      const scoreA = a.severity + (a.verified * 0.15);
      const scoreB = b.severity + (b.verified * 0.15);
      return scoreB - scoreA;
    });

    const topIncident = sorted[0];
    if (!topIncident || topIncident.severity < 0.3) return;

    // Avoid regenerating for same incident too frequently
    const existingNarration = narrations.find(n => n.incident.id === topIncident.id);
    if (existingNarration && Date.now() - existingNarration.timestamp < 30000) return;

    setIsLoading(true);
    try {
      // Fetch real weather data
      const weather = await fetchWeather();

      const text = await generateNarration(topIncident, {
        nearbyIncidents: incidents.filter(i =>
          Math.abs(i.lat - topIncident.lat) < 0.01 &&
          Math.abs(i.lng - topIncident.lng) < 0.01
        ).length,
        weatherRisk: Math.round(weather.rainProbability)
      });

      const newNarration: NarrationResult = {
        text,
        incident: topIncident,
        timestamp: Date.now()
      };

      setNarrations(prev => [newNarration, ...prev.filter(n => n.incident.id !== topIncident.id)].slice(0, 5));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Narration generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [incidents, narrations]);

  // Auto-generate narration when significant changes occur (ONLY if expanded)
  useEffect(() => {
    if (!expanded) return; // Skip API calls when collapsed

    const timer = setTimeout(() => {
      generateTopNarration();
    }, 2000); // Debounce

    return () => clearTimeout(timer);
  }, [incidents.length, expanded, generateTopNarration]);

  // Periodic refresh every 45 seconds (ONLY if expanded)
  useEffect(() => {
    if (!expanded) return; // Skip API calls when collapsed

    const interval = setInterval(() => {
      generateTopNarration();
    }, 45000);

    return () => clearInterval(interval);
  }, [expanded, generateTopNarration]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'traffic': return '🚗';
      case 'garbage': return '🗑️';
      case 'water': return '💧';
      case 'light': return '💡';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 0.7) return 'text-red-600 bg-red-50 border-red-200';
    if (severity >= 0.4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-white text-slate-700 p-3 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-slate-200"
      >
        <Brain size={20} className="text-emerald-600" />
        <span className="text-sm font-bold">AI Insights</span>
        {narrations.length > 0 && (
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-xs font-medium">{narrations.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-80 max-h-[400px] overflow-hidden flex flex-col ring-1 ring-black/5">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI City Analyst</h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Analyzing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={generateTopNarration}
            disabled={isLoading}
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-emerald-600"
          >
            <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30">
        {isLoading && narrations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="animate-pulse text-emerald-400" size={24} />
              <span className="text-xs text-slate-500 font-medium">Generating insights...</span>
            </div>
          </div>
        )}

        {narrations.length === 0 && !isLoading && (
          <div className="text-center py-6 text-slate-500">
            <AlertTriangle size={24} className="mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="text-xs font-medium">No significant incidents to analyze</p>
          </div>
        )}

        {narrations.map((narration, idx) => (
          <div
            key={narration.incident.id + '-' + idx}
            className={`p-3 rounded-xl border ${getSeverityColor(narration.incident.severity)} bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getTypeIcon(narration.incident.event_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-800">
                    {narration.incident.event_type}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {Math.round(narration.incident.severity * 100)}% severity
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 font-medium">{narration.text}</p>
                {narration.incident.verified > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Verified by {narration.incident.verified} citizen{narration.incident.verified > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <p className="text-[9px] text-center text-slate-400 font-medium">
          Powered by <span className="text-emerald-600 font-bold">Groq AI</span> • Real-time city analysis
        </p>
      </div>
    </div>
  );
}
