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
    if (severity >= 0.7) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (severity >= 0.4) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all flex items-center gap-2 border border-cyan-500/30"
      >
        <Brain size={20} />
        <span className="text-sm font-bold">AI Insights</span>
        {narrations.length > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{narrations.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/20 w-80 max-h-[400px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI City Analyst</h3>
            <p className="text-[10px] text-white/70">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Analyzing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={generateTopNarration}
            disabled={isLoading}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && narrations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="animate-pulse text-cyan-400" size={24} />
              <span className="text-xs text-slate-500">Generating insights...</span>
            </div>
          </div>
        )}

        {narrations.length === 0 && !isLoading && (
          <div className="text-center py-6 text-slate-500">
            <AlertTriangle size={24} className="mx-auto mb-2 opacity-50 text-slate-600" />
            <p className="text-xs">No significant incidents to analyze</p>
          </div>
        )}

        {narrations.map((narration, idx) => (
          <div
            key={narration.incident.id + '-' + idx}
            className={`p-3 rounded-xl border ${getSeverityColor(narration.incident.severity)} transition-all hover:shadow-md hover:shadow-cyan-500/10`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getTypeIcon(narration.incident.event_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase tracking-wide text-white">
                    {narration.incident.event_type}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {Math.round(narration.incident.severity * 100)}% severity
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{narration.text}</p>
                {narration.incident.verified > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
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
      <div className="p-2 border-t border-cyan-500/10 bg-[#0a0a1a]/50">
        <p className="text-[10px] text-center text-slate-500">
          Powered by <span className="text-cyan-400">Groq AI</span> • Real-time city analysis
        </p>
      </div>
    </div>
  );
}
