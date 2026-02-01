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

  // Simulate citizen votes appearing over time
  useEffect(() => {
    if (incidents.length === 0) return;

    const generateVote = () => {
      // Pick a random incident with some probability weighting by severity
      const weightedIncidents = incidents.filter(i => i.severity > 0.3 && !i.resolved);
      if (weightedIncidents.length === 0) return;

      const incident = weightedIncidents[Math.floor(Math.random() * weightedIncidents.length)];
      
      // Generate vote type (60% yes, 25% no, 15% photo)
      const rand = Math.random();
      const type: 'yes' | 'no' | 'photo' = rand < 0.6 ? 'yes' : rand < 0.85 ? 'no' : 'photo';

      // Position vote slightly offset from incident center
      const offsetLat = (Math.random() - 0.5) * 0.003;
      const offsetLng = (Math.random() - 0.5) * 0.003;

      const newVote: Vote = {
        id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        incidentId: incident.id,
        type,
        lat: incident.lat + offsetLat,
        lng: incident.lng + offsetLng,
        timestamp: Date.now()
      };

      setVotes(prev => [...prev, newVote].slice(-100)); // Keep last 100 votes

      // Update incident verification count if it's a 'yes' vote
      if (type === 'yes' && incident.verified !== undefined) {
        incident.verified = (incident.verified || 0) + 1;
      }
    };

    // Generate votes periodically (every 5-15 seconds)
    const voteInterval = setInterval(() => {
      if (Math.random() < 0.7) { // 70% chance each tick
        generateVote();
      }
    }, 5000 + Math.random() * 10000);

    // Initial vote burst
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(generateVote, i * 500);
      }
    }, 2000);

    return () => clearInterval(voteInterval);
  }, [incidents]);

  // Calculate vote counts per incident
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

  // Notify parent of vote count changes
  useEffect(() => {
    if (onVoteCountChange) {
      Object.entries(voteCounts).forEach(([incidentId, counts]) => {
        onVoteCountChange(incidentId, counts);
      });
    }
  }, [voteCounts, onVoteCountChange]);

  // Remove old votes (fade out after 30 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 30000;
      setVotes(prev => prev.filter(v => v.timestamp > cutoff));
    }, 5000);

    return () => clearInterval(cleanup);
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
