import { useState, useEffect, useCallback, useRef } from 'react';

export interface Incident {
    id: string;
    event_type: string;
    lat: number;
    lng: number;
    severity: number;
    radius: number;
    verified: number;
    resolved: boolean;
    createdAt: number;
    description?: string;
    source?: 'citizen' | 'simulation' | 'api';
    citizenVotes?: { yes: number; no: number; photo: number };
}

export interface Prediction {
    id: string;
    event_type: string;
    lat: number;
    lng: number;
    probability: number;
    severity?: number;
    location?: { lat: number; lng: number };
}

const VADODARA_CENTER = [22.3072, 73.1812];

export function useIncidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Refs for intervals to prevent memory leaks and race conditions
    const intervalsRef = useRef<NodeJS.Timeout[]>([]);

    // Fetch Predictions from API
    const fetchPredictions = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:3000/api/v1/predictions');
            const data = await res.json();
            if (data.data) {
                setPredictions(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch predictions", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Add a new incident (User reported or Simulated)
    const addIncident = useCallback((incident: Incident) => {
        setIncidents(prev => [incident, ...prev].slice(0, 50));
    }, []);

    // Generate Verification data for simulation
    const updateVerification = useCallback((incidentId: string, counts: { yes: number; no: number; photo: number }) => {
        setIncidents(prev => prev.map(inc =>
            inc.id === incidentId
                ? { ...inc, verified: counts.yes, citizenVotes: counts }
                : inc
        ));
    }, []);

    // Initialization Effect
    useEffect(() => {
        fetchPredictions();

        // Initial Mock Incidents
        const generateMockIncident = () => {
            const types = ['traffic', 'garbage', 'water', 'streetlamp'];
            const type = types[Math.floor(Math.random() * types.length)];
            const severity = Number((Math.random() * 0.6 + 0.2).toFixed(2));
            const lat = VADODARA_CENTER[0] + (Math.random() - 0.5) * 0.05;
            const lng = VADODARA_CENTER[1] + (Math.random() - 0.5) * 0.05;

            return {
                id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                event_type: type,
                lat,
                lng,
                severity,
                radius: 100 + severity * 300,
                verified: 0,
                resolved: false,
                createdAt: Date.now(),
                source: 'simulation' as const
            };
        };

        // Seed initial data
        setIncidents(Array(5).fill(null).map(generateMockIncident));

        // Poll API for predictions
        const predInterval = setInterval(fetchPredictions, 30000);
        intervalsRef.current.push(predInterval);

        // Simulation Loop - Add new incident occasionally
        const simInterval = setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance every 10s
                addIncident(generateMockIncident());
            }
        }, 10000);
        intervalsRef.current.push(simInterval);

        // Evolution Loop - Update severities (optimized frequency 5s instead of every frame)
        const evolutionInterval = setInterval(() => {
            setIncidents(prev => prev.map(inc => {
                let { severity, radius, verified, resolved } = inc;

                // Decay logic
                if (resolved) {
                    severity -= 0.1;
                } else if (verified > 0) {
                    severity = Math.min(1, severity + 0.01); // Slow rise
                    radius += 2;
                } else {
                    severity -= 0.005; // Very slow decay for unverified
                }

                if (severity <= 0.05) return null; // Filter out

                return { ...inc, severity, radius };
            }).filter(Boolean) as Incident[]);
        }, 5000);
        intervalsRef.current.push(evolutionInterval);

        return () => {
            intervalsRef.current.forEach(clearInterval);
            intervalsRef.current = [];
        };
    }, [fetchPredictions, addIncident]);

    return {
        incidents,
        predictions,
        activeIncidents: [...incidents, ...predictions], // Combined view if needed
        isLoading,
        addIncident,
        updateVerification,
        refreshPredictions: fetchPredictions
    };
}
