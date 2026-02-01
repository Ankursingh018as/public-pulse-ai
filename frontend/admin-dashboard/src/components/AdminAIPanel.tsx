'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, AlertTriangle, RefreshCw, Sparkles, X, TrendingUp, Shield } from 'lucide-react';
import { generateAdminNarration, generateDashboardSummary, Incident, NarrationResult } from '../services/groqAdminService';

interface AdminAIPanelProps {
  incidents: Incident[];
  onPriorityChange?: (incidentId: string, priority: string) => void;
}

export default function AdminAIPanel({ incidents, onPriorityChange }: AdminAIPanelProps) {
  const [narrations, setNarrations] = useState<NarrationResult[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Generate narration for critical/pending incidents
  const generateAnalysis = useCallback(async () => {
    if (incidents.length === 0) return;

    // Focus on pending approval incidents first, then high severity
    const priorityIncidents = [...incidents]
      .filter(i => i.status === 'pending' || i.severity >= 0.5)
      .sort((a, b) => {
        // Pending first, then by severity
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return (b.severity + b.citizenVotes.yes * 0.1) - (a.severity + a.citizenVotes.yes * 0.1);
      })
      .slice(0, 4);

    if (priorityIncidents.length === 0) return;

    setIsLoading(true);
    try {
      const pendingCount = incidents.filter(i => i.status === 'pending').length;
      
      const results: NarrationResult[] = [];
      for (const incident of priorityIncidents) {
        const { narration, recommendation, priority } = await generateAdminNarration(incident, {
          pendingApprovals: pendingCount,
          nearbyIncidents: incidents.filter(i => 
            Math.abs(i.lat - incident.lat) < 0.01 && 
            Math.abs(i.lng - incident.lng) < 0.01
          ).length
        });

        results.push({
          text: narration,
          incident,
          timestamp: Date.now(),
          recommendation,
          priority: priority as 'critical' | 'high' | 'medium' | 'low'
        });

        // Small delay between API calls
        await new Promise(r => setTimeout(r, 300));
      }

      setNarrations(results);
      setLastUpdate(new Date());

      // Also generate dashboard summary
      const summary = await generateDashboardSummary(incidents);
      setDashboardSummary(summary);
    } catch (error) {
      console.error('Analysis generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [incidents]);

  // Auto-generate on significant changes
  useEffect(() => {
    const timer = setTimeout(() => {
      generateAnalysis();
    }, 3000);
    return () => clearTimeout(timer);
  }, [incidents.length, generateAnalysis]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(generateAnalysis, 60000);
    return () => clearInterval(interval);
  }, [generateAnalysis]);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      default: return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'traffic': return '🚗';
      case 'garbage': return '🗑️';
      case 'water': return '💧';
      case 'light': return '💡';
      case 'road': return '🛣️';
      default: return '⚠️';
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Brain size={18} />
        <span className="text-sm font-bold">AI Command</span>
        {narrations.filter(n => n.priority === 'critical').length > 0 && (
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs animate-pulse">
            {narrations.filter(n => n.priority === 'critical').length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-96 max-h-[500px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Operations Command</h3>
            <p className="text-[10px] text-white/70">
              {lastUpdate ? `Analyzed ${lastUpdate.toLocaleTimeString()}` : 'Initializing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={generateAnalysis}
            disabled={isLoading}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Dashboard Summary */}
      {dashboardSummary && (
        <div className="px-4 py-3 bg-slate-800/50 border-b border-white/5">
          <div className="flex items-start gap-2">
            <TrendingUp size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">{dashboardSummary}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && narrations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="animate-pulse" size={24} />
              <span className="text-xs">Analyzing city status...</span>
            </div>
          </div>
        )}

        {narrations.length === 0 && !isLoading && (
          <div className="text-center py-6 text-slate-400">
            <Shield size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">No critical incidents requiring attention</p>
          </div>
        )}

        {narrations.map((narration, idx) => (
          <div
            key={narration.incident.id + '-' + idx}
            className={`p-3 rounded-xl border ${getPriorityStyles(narration.priority)} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getTypeIcon(narration.incident.event_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wide">
                      {narration.incident.event_type}
                    </span>
                    {narration.incident.status === 'pending' && (
                      <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-300 text-[9px] rounded font-bold">
                        PENDING
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    narration.priority === 'critical' ? 'bg-red-500/30 text-red-300' :
                    narration.priority === 'high' ? 'bg-orange-500/30 text-orange-300' :
                    'bg-slate-500/30 text-slate-300'
                  }`}>
                    {narration.priority}
                  </span>
                </div>
                
                <p className="text-xs leading-relaxed text-white/80 mb-2">{narration.text}</p>
                
                {narration.recommendation && (
                  <div className="bg-white/5 rounded-lg p-2 mt-2">
                    <p className="text-[10px] text-cyan-400 font-bold uppercase mb-1">AI Recommendation</p>
                    <p className="text-xs text-white/70">
                      {typeof narration.recommendation === 'string' 
                        ? narration.recommendation 
                        : (narration.recommendation as any)?.action || JSON.stringify(narration.recommendation)}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {narration.incident.citizenVotes.yes} yes
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {narration.incident.citizenVotes.no} no
                    </span>
                    {narration.incident.citizenVotes.photo > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {narration.incident.citizenVotes.photo} 📷
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {Math.round(narration.incident.severity * 100)}% sev
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 bg-slate-800/50">
        <p className="text-[10px] text-center text-slate-500">
          Powered by Groq AI • Admin Operations Analysis
        </p>
      </div>
    </div>
  );
}
