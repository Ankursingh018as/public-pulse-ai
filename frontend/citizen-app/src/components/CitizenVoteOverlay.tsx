'use client';

import { useEffect, useState, useMemo } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';

interface Vote {
  id: string;
  incidentId: string;
  type: 'yes' | 'no' | 'photo';
  lat: number;
  lng: number;
  timestamp: number;
}

interface CitizenVoteOverlayProps {
  incidents: any[];
  onVoteCountChange?: (incidentId: string, counts: { yes: number; no: number; photo: number }) => void;
}

const voteColors = {
  yes: '#22c55e',
  no: '#ef4444',
  photo: '#3b82f6'
};

export default function CitizenVoteOverlay({ incidents, onVoteCountChange }: CitizenVoteOverlayProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const map = useMap();

  // WebSocket vote listener placeholder
  // In production, connect to Socket.io 'incident:vote' events
  useEffect(() => {
    return () => { /* cleanup */ };
  }, []);

  // Aggregate vote counts per incident
  const voteCounts = useMemo(() => {
    const counts: Record<string, { yes: number; no: number; photo: number }> = {};
    votes.forEach(vote => {
      if (!counts[vote.incidentId]) {
        counts[vote.incidentId] = { yes: 0, no: 0, photo: 0 };
      }
      counts[vote.incidentId][vote.type]++;
    });
    return counts;
  }, [votes]);

  // Notify parent of count changes
  useEffect(() => {
    if (onVoteCountChange) {
      Object.entries(voteCounts).forEach(([incidentId, counts]) => {
        onVoteCountChange(incidentId, counts);
      });
    }
  }, [voteCounts, onVoteCountChange]);

  // Cleanup old votes (fade after 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 30000;
      setVotes(prev => prev.filter(v => v.timestamp > cutoff));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {votes.map(vote => {
        const age = Date.now() - vote.timestamp;
        const opacity = Math.max(0.3, 1 - (age / 30000)); // Fade over 30 seconds

        return (
          <CircleMarker
            key={vote.id}
            center={[vote.lat, vote.lng]}
            radius={6}
            pathOptions={{
              fillColor: voteColors[vote.type],
              color: 'white',
              weight: 2,
              fillOpacity: opacity,
              opacity: opacity
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span className="text-xs font-medium">
                {vote.type === 'yes' && '✓ Confirmed'}
                {vote.type === 'no' && '✗ Not Found'}
                {vote.type === 'photo' && '📷 Photo Added'}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Vote count badges for incidents with multiple verifications */}
      {incidents.filter(inc => voteCounts[inc.id]?.yes >= 2).map(inc => {
        const counts = voteCounts[inc.id];
        const total = counts.yes + counts.no + counts.photo;
        const trustScore = Math.round((counts.yes / total) * 100);

        return (
          <CircleMarker
            key={`badge-${inc.id}`}
            center={[inc.lat + 0.002, inc.lng + 0.002]}
            radius={12}
            pathOptions={{
              fillColor: trustScore >= 70 ? '#22c55e' : trustScore >= 40 ? '#f59e0b' : '#ef4444',
              color: 'white',
              weight: 2,
              fillOpacity: 0.9
            }}
          >
            <Tooltip direction="right" permanent opacity={1}>
              <div className="text-xs">
                <div className="font-bold">{counts.yes} verified</div>
                <div className="text-gray-500">{trustScore}% trust</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
