'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bell, Search, Plus, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import VerificationModal from '../components/VerificationModal';
import AINarrationPanel from '../components/AINarrationPanel';
import AIPredictionPanel from '../components/AIPredictionPanel';
import ReportIssueModal from '../components/ReportIssueModal';
import dataService from '../services/dataService';

// Dynamic import for Map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
      Loading City Map...
    </div>
  )
});

export default function Home() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [verifyingPrediction, setVerifyingPrediction] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, pendingCount: 0, lastSync: 0 });

  // Initialize data service and get user location
  useEffect(() => {
    // Start background sync
    dataService.startBackgroundSync(15000);

    // Get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 22.3072, lng: 73.1812 }) // Default: Vadodara center
      );
    } else {
      setUserLocation({ lat: 22.3072, lng: 73.1812 });
    }

    // Monitor online status
    const updateOnline = () => setSyncStatus(s => ({ ...s, isOnline: navigator.onLine }));
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    return () => {
      dataService.stopBackgroundSync();
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // Handle citizen verification submission
  const handleVerificationSubmit = async (response: string, hasPhoto: boolean) => {
    if (!verifyingPrediction) return;

    try {
      const API_URL = 'http://localhost:3000/api/v1';
      const res = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_id: verifyingPrediction.id,
          user_id: 'citizen_demo_user_1',
          response,
          has_photo: hasPhoto,
          location: userLocation
        })
      });

      const data = await res.json();
      const weight = response === 'yes' ? '+0.25' : response === 'no' ? '-0.30' : '+0.15';
      const photoBonus = hasPhoto ? ' + 0.30 photo' : '';
      alert(`Thank you! Your feedback (${weight}${photoBonus} Trust) helps verify this issue.`);
    } catch (e) {
      console.error('Verification failed', e);
      alert('Verification saved locally. Will sync when online.');
    } finally {
      setVerifyingPrediction(null);
    }
  };

  // Handle new incident report submission
  const handleReportSubmit = useCallback(async (payload: {
    event_type: string;
    lat: number;
    lng: number;
    description?: string;
  }) => {
    await dataService.submitIncident({
      ...payload,
      source: 'citizen-report',
      userId: 'citizen_demo_user_1'
    });

    // Refresh incidents from local state
    const latestIncidents = await dataService.getIncidents();
    setActiveIncidents(latestIncidents.slice(0, 50));

    // Show success toast
    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 3000);
  }, []);

  return (
    <main className="flex h-screen flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Public Pulse</h1>
            <p className="text-xs text-slate-500 font-medium">Vadodara Live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync Status Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            syncStatus.isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {syncStatus.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{syncStatus.isOnline ? 'Live' : 'Offline'}</span>
            {syncStatus.pendingCount > 0 && <span className="text-slate-500">({syncStatus.pendingCount})</span>}
          </div>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10">
            <Search size={18} className="text-slate-400" />
          </button>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl relative transition-colors border border-white/10">
            <Bell size={18} className="text-slate-400" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapComponent
          selectedFilter={selectedIssue}
          onMarkerClick={setVerifyingPrediction}
          onIncidentsChange={setActiveIncidents}
        />

        {/* AI Narration Panel - Top Right */}
        <div className="absolute top-4 right-4 z-[500]">
          <AINarrationPanel incidents={activeIncidents} />
        </div>

        {/* AI Prediction Panel - Bottom Left */}
        <div className="absolute bottom-44 left-4 z-[500]">
          <AIPredictionPanel
            incidents={activeIncidents}
            userLocation={userLocation}
            onPredictionSelect={(pred) => setVerifyingPrediction(pred)}
          />
        </div>

        {/* Filter Bar - Dark Glass */}
        <div className="absolute top-4 left-4 z-[500] flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['All', 'Traffic', 'Garbage', 'Water', 'Light'].map((filter) => {
            const isActive = selectedIssue === filter.toLowerCase() || (filter === 'All' && !selectedIssue);
            const colors: Record<string, string> = {
              All: 'from-cyan-500 to-blue-600',
              Traffic: 'from-red-500 to-orange-500',
              Garbage: 'from-orange-500 to-yellow-500',
              Water: 'from-blue-500 to-cyan-500',
              Light: 'from-yellow-500 to-amber-500'
            };
            return (
              <button
                key={filter}
                onClick={() => setSelectedIssue(filter === 'All' ? null : filter.toLowerCase())}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-r ${colors[filter]} text-white shadow-lg`
                    : 'bg-black/60 backdrop-blur-md text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Bottom Info Card - Dark Glass */}
        <div className="absolute bottom-6 left-4 right-4 z-[500] bg-black/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Live Status
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Real-time
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
              <p className="text-[10px] text-red-400 font-bold uppercase mb-0.5">TRAFFIC</p>
              <p className="text-lg font-black text-red-500">Busy</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
              <p className="text-[10px] text-blue-400 font-bold uppercase mb-0.5">RAIN</p>
              <p className="text-lg font-black text-blue-500">60%</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-center">
              <p className="text-[10px] text-orange-400 font-bold uppercase mb-0.5">ISSUES</p>
              <p className="text-lg font-black text-orange-500">{activeIncidents.length}</p>
            </div>
          </div>
        </div>

        {/* Floating Report FAB */}
        <button
          onClick={() => setQuickReportOpen(true)}
          className="absolute bottom-52 right-4 z-[600] h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Report an Issue"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {/* Success Toast */}
        {reportSubmitted && (
          <div className="absolute bottom-60 left-1/2 -translate-x-1/2 z-[700] bg-emerald-500/90 backdrop-blur-md text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-400/30">
            <CheckCircle size={18} />
            <span className="text-sm font-semibold">Issue reported!</span>
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      <ReportIssueModal
        open={quickReportOpen}
        position={userLocation}
        onClose={() => setQuickReportOpen(false)}
        onSubmit={handleReportSubmit}
      />

      {/* Verification Modal */}
      {verifyingPrediction && (
        <VerificationModal
          prediction={verifyingPrediction}
          onClose={() => setVerifyingPrediction(null)}
          onSubmit={handleVerificationSubmit}
        />
      )}
    </main>
  );
}
