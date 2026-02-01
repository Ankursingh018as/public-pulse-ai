'use client';

import { useState, useCallback } from 'react';
import { Check, X, Eye, Clock, AlertTriangle, Camera, Users, MapPin, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Incident } from '../services/groqAdminService';

interface AdminApprovalQueueProps {
  incidents: Incident[];
  onApprove: (incidentId: string) => void;
  onReject: (incidentId: string) => void;
  onViewOnMap: (incident: Incident) => void;
}

export default function AdminApprovalQueue({ incidents, onApprove, onReject, onViewOnMap }: AdminApprovalQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const pendingIncidents = incidents.filter(i => i.status === 'pending');
  const approvedIncidents = incidents.filter(i => i.status === 'approved');
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected');

  const filteredIncidents = filter === 'all' ? incidents :
    filter === 'pending' ? pendingIncidents :
    filter === 'approved' ? approvedIncidents : rejectedIncidents;

  const handleApprove = useCallback(async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 500)); // Simulate network delay
    onApprove(id);
    setProcessingId(null);
  }, [onApprove]);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 500));
    onReject(id);
    setProcessingId(null);
  }, [onReject]);

  const getSeverityColor = (severity: number) => {
    if (severity >= 0.7) return 'text-red-400 bg-red-500/20';
    if (severity >= 0.4) return 'text-orange-400 bg-orange-500/20';
    return 'text-yellow-400 bg-yellow-500/20';
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

  const getTrustScore = (inc: Incident) => {
    const total = inc.citizenVotes.yes + inc.citizenVotes.no;
    if (total === 0) return 0;
    return Math.round((inc.citizenVotes.yes / total) * 100);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Incident Approval Queue</h3>
            <p className="text-xs text-slate-400">
              {pendingIncidents.length} pending • {approvedIncidents.length} approved
            </p>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filter === f 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingIncidents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/30 text-yellow-300 rounded text-[10px]">
                  {pendingIncidents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {filter} incidents</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredIncidents.map(incident => {
              const isExpanded = expandedId === incident.id;
              const isProcessing = processingId === incident.id;
              const trustScore = getTrustScore(incident);

              return (
                <div 
                  key={incident.id}
                  className={`transition-all ${isProcessing ? 'opacity-50' : ''}`}
                >
                  {/* Main Row */}
                  <div className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    {/* Type Icon */}
                    <div className="text-2xl">{getTypeIcon(incident.event_type)}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold capitalize">{incident.event_type}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>
                          {Math.round(incident.severity * 100)}%
                        </span>
                        {incident.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {incident.status === 'approved' && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-bold">
                            ✓ APPROVED
                          </span>
                        )}
                        {incident.status === 'rejected' && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold">
                            ✗ REJECTED
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {incident.citizenVotes.yes + incident.citizenVotes.no} votes
                        </span>
                        {incident.citizenVotes.photo > 0 && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Camera className="w-3 h-3" />
                            {incident.citizenVotes.photo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trust Score */}
                    <div className="text-center px-3">
                      <div className={`text-lg font-bold ${trustScore >= 70 ? 'text-green-400' : trustScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {trustScore}%
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Trust</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {incident.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(incident.id)}
                            disabled={isProcessing}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(incident.id)}
                            disabled={isProcessing}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onViewOnMap(incident)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                        title="View on Map"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-800/50 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-green-400">{incident.citizenVotes.yes}</p>
                          <p className="text-[10px] uppercase text-green-600 font-bold">Confirmed</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-red-400">{incident.citizenVotes.no}</p>
                          <p className="text-[10px] uppercase text-red-600 font-bold">Denied</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-blue-400">{incident.citizenVotes.photo}</p>
                          <p className="text-[10px] uppercase text-blue-600 font-bold">Photos</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Affected Radius</p>
                          <p className="text-white font-medium">~{Math.round(incident.radius)}m</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Reported</p>
                          <p className="text-white font-medium">{new Date(incident.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {incident.status === 'approved' && incident.approvedAt && (
                        <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
                          <p className="text-xs text-green-400">
                            Approved on {new Date(incident.approvedAt).toLocaleString()}
                            {incident.approvedBy && ` by ${incident.approvedBy}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
