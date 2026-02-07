import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
            const res = await fetch(`${API_URL}/predictions`);
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

    // Fetch incidents from API
    const fetchIncidentsFromAPI = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/incidents?limit=50`);
            const data = await res.json();
            if (data.data) {
                const mapped = data.data.map((inc: any) => ({
                    id: inc._id || inc.id,
                    event_type: inc.event_type,
                    lat: inc.lat,
                    lng: inc.lng,
                    severity: inc.severity / 10,
                    radius: inc.radius || 100,
                    verified: inc.verified_count || 0,
                    resolved: inc.resolved,
                    createdAt: new Date(inc.createdAt).getTime(),
                    description: inc.description,
                    source: 'api' as const
                }));
                setIncidents(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch incidents", e);
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
        // Fetch real data from API
        fetchPredictions();
        fetchIncidentsFromAPI();

        // Poll API for updates every 30 seconds
        const predInterval = setInterval(fetchPredictions, 30000);
        const incInterval = setInterval(fetchIncidentsFromAPI, 30000);
        intervalsRef.current.push(predInterval, incInterval);

        return () => {
            intervalsRef.current.forEach(clearInterval);
            intervalsRef.current = [];
        };
    }, [fetchPredictions, fetchIncidentsFromAPI]);

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
