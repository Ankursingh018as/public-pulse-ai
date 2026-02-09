'use client';

import { useState, useEffect } from 'react';
import { History, Search, Filter, Download, RefreshCw, MapPin, User, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import adminDataService, { HistoryEntry } from '../services/adminDataService';

interface HistoryViewProps {
  onSelectIncident?: (incident: HistoryEntry) => void;
}

export default function HistoryView({ onSelectIncident }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: '',
    source: '',
    status: '',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    resolved: 0,
    citizenReports: 0,
    aiDetections: 0,
    last24h: 0
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await adminDataService.fetchHistory({
        type: filter.type || undefined,
        source: filter.source || undefined,
        limit: 500
      });
      
      // Apply client-side filtering for status and search
      let filtered = data;
      if (filter.status) {
        filtered = filtered.filter(h => h.status === filter.status);
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(h => 
          h.description?.toLowerCase().includes(searchLower) ||
          h.type?.toLowerCase().includes(searchLower) ||
          h.area_name?.toLowerCase().includes(searchLower) ||
          h.userId?.toLowerCase().includes(searchLower)
        );
      }
      
      setHistory(filtered);

      // Calculate stats
      const citizenReports = data.filter(h => h.source?.includes('citizen')).length;
      const aiDetections = data.filter(h => h.source === 'ai' || h.source?.includes('ai-')).length;
      const last24h = data.filter(h => (h._ts || h.createdAt || 0) > Date.now() - 24 * 60 * 60 * 1000).length;

      setStats({
        total: data.length,
        pending: data.filter(h => h.status === 'pending' || !h.status).length,
        approved: data.filter(h => h.status === 'approved').length,
        rejected: data.filter(h => h.status === 'rejected').length,
        resolved: data.filter(h => h.status === 'resolved').length,
        citizenReports,
        aiDetections,
        last24h
      });
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [filter.type, filter.source]);

  const handleExport = async () => {
    try {
      const exportData = await adminDataService.exportAllData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `public-pulse-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-500/20 text-red-400 flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400 flex items-center gap-1"><CheckCircle size={12} /> Resolved</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><AlertTriangle size={12} /> Pending</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'traffic': return '🚗';
      case 'garbage': return '🗑️';
      case 'water': return '💧';
      case 'light': return '💡';
      default: return '⚠️';
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Records</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-yellow-500/10 backdrop-blur-md rounded-2xl p-4 border border-yellow-500/20">
          <p className="text-yellow-400 text-xs uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-cyan-500/10 backdrop-blur-md rounded-2xl p-4 border border-cyan-500/20">
          <p className="text-cyan-400 text-xs uppercase tracking-wider mb-1">Citizen Reports</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.citizenReports}</p>
        </div>
        <div className="bg-purple-500/10 backdrop-blur-md rounded-2xl p-4 border border-purple-500/20">
          <p className="text-purple-400 text-xs uppercase tracking-wider mb-1">AI Detections</p>
          <p className="text-2xl font-bold text-purple-400">{stats.aiDetections}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-2xl flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search history..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            className="bg-white/5 text-sm text-white pl-10 pr-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500/50 w-full"
          />
        </div>

        <select
          value={filter.type}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value }))}
          className="bg-white/5 text-sm text-white px-4 py-2 rounded-xl border border-white/10 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="traffic">Traffic</option>
          <option value="garbage">Garbage</option>
          <option value="water">Water</option>
          <option value="light">Streetlight</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
          className="bg-white/5 text-sm text-white px-4 py-2 rounded-xl border border-white/10 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={filter.source}
          onChange={(e) => setFilter(f => ({ ...f, source: e.target.value }))}
          className="bg-white/5 text-sm text-white px-4 py-2 rounded-xl border border-white/10 focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="citizen">Citizen Reports</option>
          <option value="ai">AI Detection</option>
          <option value="sensor">Sensors</option>
        </select>

        <button
          onClick={fetchHistory}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl text-cyan-400 text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      {/* History Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <History size={20} />
            Incident History
          </h3>
          <span className="text-xs text-slate-400">{history.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-white/5">
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Location</th>
                <th className="p-4">Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Time</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No history records found
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => onSelectIncident?.(item)}
                  >
                    <td className="p-4">
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(item.type || item.event_type || '')}</span>
                        <span className="text-white capitalize">{item.type || item.event_type}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 max-w-[200px] truncate">
                      {item.description || '—'}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-400 text-sm">
                        <MapPin size={14} />
                        {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-400 text-sm">
                        <User size={14} />
                        {item.source || 'unknown'}
                      </span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(item.status || 'pending')}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-400 text-sm">
                        <Clock size={14} />
                        {formatTime(item._ts || item.createdAt || 0)}
                      </span>
                    </td>
                    <td className="p-4">
                      <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
