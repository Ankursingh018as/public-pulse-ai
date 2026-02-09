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
      case 'critical': return 'bg-red-50 border-red-100 text-red-700';
      case 'high': return 'bg-orange-50 border-orange-100 text-orange-700';
      case 'medium': return 'bg-amber-50 border-amber-100 text-amber-700';
      default: return 'bg-blue-50 border-blue-100 text-blue-700';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
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
        className="bg-white text-slate-700 border border-slate-200 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <div className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white p-1.5 rounded-lg">
          <Brain size={16} />
        </div>
        <span className="text-sm font-bold">AI Command</span>
        {narrations.filter(n => n.priority === 'critical').length > 0 && (
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs text-white animate-pulse shadow-sm">
            {narrations.filter(n => n.priority === 'critical').length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-200 w-96 max-h-[500px] overflow-hidden flex flex-col ring-1 ring-slate-900/5">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl text-white shadow-md shadow-purple-500/20">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">AI Operations</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              {lastUpdate ? `Analyzed ${lastUpdate.toLocaleTimeString()}` : 'Initializing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={generateAnalysis}
            disabled={isLoading}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-cyan-600"
          >
            <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Dashboard Summary */}
      {dashboardSummary && (
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-start gap-2">
            <TrendingUp size={14} className="text-cyan-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{dashboardSummary}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && narrations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="animate-pulse text-cyan-500" size={24} />
              <span className="text-xs font-medium">Analyzing city status...</span>
            </div>
          </div>
        )}

        {narrations.length === 0 && !isLoading && (
          <div className="text-center py-6 text-slate-400">
            <Shield size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium">No critical incidents requiring attention</p>
          </div>
        )}

        {narrations.map((narration, idx) => (
          <div
            key={narration.incident.id + '-' + idx}
            className={`p-3 rounded-xl border ${getPriorityStyles(narration.priority)} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg bg-white bg-opacity-50 rounded-lg p-1 shadow-sm">{getTypeIcon(narration.incident.event_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wide text-slate-700">
                      {narration.incident.event_type}
                    </span>
                    {narration.incident.status === 'pending' && (
                      <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200 text-[9px] rounded font-bold uppercase">
                        PENDING
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${getPriorityBadge(narration.priority)}`}>
                    {narration.priority}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 mb-2 font-medium">{narration.text}</p>

                {narration.recommendation && (
                  <div className="bg-white rounded-lg p-2 mt-2 border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-cyan-600 font-bold uppercase mb-1 flex items-center gap-1">
                      <Sparkles size={10} /> AI Recommendation
                    </p>
                    <p className="text-xs text-slate-700">
                      {typeof narration.recommendation === 'string'
                        ? narration.recommendation
                        : (narration.recommendation as any)?.action || JSON.stringify(narration.recommendation)}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      {narration.incident.citizenVotes.yes} yes
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      {narration.incident.citizenVotes.no} no
                    </span>
                    {narration.incident.citizenVotes.photo > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {narration.incident.citizenVotes.photo} 📷
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {Math.round(narration.incident.severity * 100)}% Sev
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-center text-slate-400 font-semibold">
          Powered by Public Pulse AI • Admin Operations
        </p>
      </div>
    </div>
  );
}
