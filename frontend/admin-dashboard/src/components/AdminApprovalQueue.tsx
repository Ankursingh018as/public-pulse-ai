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
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  }, [onApprove]);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      await onReject(id);
    } finally {
      setProcessingId(null);
    }
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
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold">Incident Approval Queue</h3>
            <p className="text-xs text-slate-500">
              {pendingIncidents.length} pending • {approvedIncidents.length} approved
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingIncidents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px]">
                  {pendingIncidents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 h-full flex flex-col items-center justify-center">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No {filter} incidents</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
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
                  <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    {/* Type Icon */}
                    <div className="text-2xl">{getTypeIcon(incident.event_type)}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900 font-semibold capitalize">{incident.event_type}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>
                          {Math.round(incident.severity * 100)}%
                        </span>
                        {incident.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {incident.status === 'approved' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
                            ✓ APPROVED
                          </span>
                        )}
                        {incident.status === 'rejected' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                            ✗ REJECTED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {incident.citizenVotes.yes + incident.citizenVotes.no} votes
                        </span>
                        {incident.citizenVotes.photo > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Camera className="w-3 h-3" />
                            {incident.citizenVotes.photo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trust Score */}
                    <div className="text-center px-3">
                      <div className={`text-lg font-bold ${trustScore >= 70 ? 'text-green-600' : trustScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {trustScore}%
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">Trust</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {incident.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(incident.id)}
                            disabled={isProcessing}
                            className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all disabled:opacity-50 border border-green-200"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(incident.id)}
                            disabled={isProcessing}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all disabled:opacity-50 border border-red-200"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onViewOnMap(incident)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all border border-slate-200"
                        title="View on Map"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all border border-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-green-600">{incident.citizenVotes.yes}</p>
                          <p className="text-[10px] uppercase text-green-700 font-bold">Confirmed</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-red-600">{incident.citizenVotes.no}</p>
                          <p className="text-[10px] uppercase text-red-700 font-bold">Denied</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                          <p className="text-xl font-bold text-blue-600">{incident.citizenVotes.photo}</p>
                          <p className="text-[10px] uppercase text-blue-700 font-bold">Photos</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Affected Radius</p>
                          <p className="text-slate-900 font-medium">~{Math.round(incident.radius)}m</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Reported</p>
                          <p className="text-slate-900 font-medium">{new Date(incident.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {incident.status === 'approved' && incident.approvedAt && (
                        <div className="mt-3 p-2 bg-green-50 text-center rounded-lg border border-green-200">
                          <p className="text-xs text-green-700">
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
