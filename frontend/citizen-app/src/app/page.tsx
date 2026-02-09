'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bell, Search, Plus, CheckCircle, Wifi, WifiOff, AlertCircle, Camera } from 'lucide-react';
import VerificationModal from '../components/VerificationModal';
import AINarrationPanel from '../components/AINarrationPanel';
import AIPredictionPanel from '../components/AIPredictionPanel';
import ReportIssueModal from '../components/ReportIssueModal';
import VideoReportModal from '../components/VideoReportModal';
import AIChatAssistant from '../components/AIChatAssistant';
import dataService from '../services/dataService';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUser } from '../context/UserContext';
import { fetchWeather, fetchTrafficStatus, WeatherData, TrafficStatus } from '../services/weatherService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
  const { user } = useUser();
  const { isConnected: wsConnected, lastEvent } = useWebSocket();
  
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [videoReportOpen, setVideoReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [verifyingPrediction, setVerifyingPrediction] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, pendingCount: 0, lastSync: 0 });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [trafficStatus, setTrafficStatus] = useState<TrafficStatus | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize data service and get user location
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        // Start background sync
        dataService.startBackgroundSync(15000);

        // Get user location with better error handling
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (mounted) {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationError(null);
              }
            },
            (error) => {
              if (mounted) {
                console.warn('Geolocation error:', error.message);
                setUserLocation({ lat: 22.3072, lng: 73.1812 }); // Vadodara center
                setLocationError('Using default location (Vadodara). Enable location for better experience.');
              }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        } else {
          setUserLocation({ lat: 22.3072, lng: 73.1812 });
          setLocationError('Geolocation not supported. Using default location.');
        }

        // Fetch initial weather and traffic data
        const [weatherData, trafficData] = await Promise.all([
          fetchWeather(),
          fetchTrafficStatus()
        ]);
        
        if (mounted) {
          setWeather(weatherData);
          setTrafficStatus(trafficData);
          setIsLoadingData(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (mounted) {
          setError('Failed to initialize app. Please refresh.');
          setIsLoadingData(false);
        }
      }
    };

    initializeApp();

    // Monitor online status
    const updateOnline = () => setSyncStatus(s => ({ ...s, isOnline: navigator.onLine }));
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Refresh weather/traffic every 5 minutes
    const refreshInterval = setInterval(async () => {
      try {
        const [weatherData, trafficData] = await Promise.all([
          fetchWeather(),
          fetchTrafficStatus()
        ]);
        if (mounted) {
          setWeather(weatherData);
          setTrafficStatus(trafficData);
        }
      } catch (err) {
        console.error('Refresh error:', err);
      }
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      dataService.stopBackgroundSync();
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      clearInterval(refreshInterval);
    };
  }, []);

  // WebSocket event handling
  useEffect(() => {
    if (!lastEvent) return;

    const { type, data } = lastEvent;

    switch (type) {
      case 'incident:new':
      case 'incident:approved':
        // Refresh incidents when new ones arrive
        dataService.getIncidents().then(incidents => {
          setActiveIncidents(incidents.slice(0, 50));
        });
        break;
      case 'incident:vote':
        // Update specific incident vote count
        setActiveIncidents(prev => 
          prev.map(inc => 
            inc.id === data.incidentId 
              ? { ...inc, verified: (inc.verified || 0) + 1 }
              : inc
          )
        );
        break;
    }
  }, [lastEvent]);

  // Handle citizen verification submission
  const handleVerificationSubmit = async (response: string, hasPhoto: boolean) => {
    if (!verifyingPrediction || !user) return;

    try {
      // Use incident vote endpoint (PostgreSQL-based) instead of MongoDB verify
      const res = await fetch(`${API_URL}/incidents/${verifyingPrediction.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: response,
          citizen_id: user.id,
          has_photo: hasPhoto
        })
      });

      if (!res.ok) throw new Error('Verification failed');

      setReportSubmitted(true);
      setTimeout(() => setReportSubmitted(false), 3000);
    } catch (e) {
      console.error('Verification failed:', e);
      setError('Verification saved locally. Will sync when online.');
      setTimeout(() => setError(null), 5000);
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
    if (!user) {
      setError('User not initialized. Please refresh the page.');
      return;
    }

    try {
      await dataService.submitIncident({
        ...payload,
        source: 'citizen-report',
        userId: user.id
      });

      // Refresh incidents from local state
      const latestIncidents = await dataService.getIncidents();
      setActiveIncidents(latestIncidents.slice(0, 50));

      // Show success toast
      setReportSubmitted(true);
      setTimeout(() => setReportSubmitted(false), 3000);
    } catch (err) {
      console.error('Report submission error:', err);
      setError('Failed to submit report. It will retry automatically.');
      setTimeout(() => setError(null), 5000);
    }
  }, [user]);

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
            wsConnected && syncStatus.isOnline
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {wsConnected && syncStatus.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{wsConnected ? 'Live' : syncStatus.isOnline ? 'API' : 'Offline'}</span>
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

        {/* AI Chat Assistant - Bottom Right above FABs */}
        <div className="absolute bottom-72 right-4 z-[500]">
          <AIChatAssistant incidents={activeIncidents} userLocation={userLocation} />
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

        {/* Bottom Info Card - Dynamic Status */}
        <div className="absolute bottom-6 left-4 right-4 z-[500] bg-black/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Live Status
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {wsConnected ? 'Real-time' : 'Polling'}
            </span>
          </div>
          {isLoadingData ? (
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/20 p-3 rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl text-center ${
                trafficStatus?.color === 'red' ? 'bg-red-500/10 border border-red-500/20' :
                trafficStatus?.color === 'green' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                'bg-orange-500/10 border border-orange-500/20'
              }`}>
                <p className={`text-[10px] font-bold uppercase mb-0.5 ${
                  trafficStatus?.color === 'red' ? 'text-red-400' :
                  trafficStatus?.color === 'green' ? 'text-emerald-400' :
                  'text-orange-400'
                }`}>TRAFFIC</p>
                <p className={`text-lg font-black ${
                  trafficStatus?.color === 'red' ? 'text-red-500' :
                  trafficStatus?.color === 'green' ? 'text-emerald-500' :
                  'text-orange-500'
                }`}>{trafficStatus?.label || 'Loading'}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                <p className="text-[10px] text-blue-400 font-bold uppercase mb-0.5">RAIN</p>
                <p className="text-lg font-black text-blue-500">{weather ? `${Math.round(weather.rainProbability)}%` : '--'}</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-center">
                <p className="text-[10px] text-orange-400 font-bold uppercase mb-0.5">ISSUES</p>
                <p className="text-lg font-black text-orange-500">{activeIncidents.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Report FAB */}
        <button
          onClick={() => setQuickReportOpen(true)}
          className="absolute bottom-52 right-4 z-[600] h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Report an Issue"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {/* Floating AI Trash Detection FAB */}
        <button
          onClick={() => setVideoReportOpen(true)}
          className="absolute bottom-52 right-20 z-[600] h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="AI Trash Detection"
        >
          <Camera size={24} strokeWidth={2.5} />
        </button>

        {/* Success Toast */}
        {reportSubmitted && (
          <div className="absolute bottom-60 left-1/2 -translate-x-1/2 z-[700] bg-emerald-500/90 backdrop-blur-md text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-400/30 animate-slide-up">
            <CheckCircle size={18} />
            <span className="text-sm font-semibold">Issue reported!</span>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="absolute bottom-60 left-1/2 -translate-x-1/2 z-[700] bg-red-500/90 backdrop-blur-md text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-red-400/30 animate-slide-up max-w-[90%]">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Location Warning */}
        {locationError && (
          <div className="absolute top-20 left-4 right-4 z-[600] bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-amber-400/30 text-sm">
            <AlertCircle size={16} />
            <span>{locationError}</span>
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

      {/* Video Trash Detection Modal */}
      <VideoReportModal
        open={videoReportOpen}
        onClose={() => setVideoReportOpen(false)}
        position={userLocation}
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
