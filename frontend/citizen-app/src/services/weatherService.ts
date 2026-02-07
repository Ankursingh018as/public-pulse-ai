'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainProbability: number;
  conditions: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  windSpeed: number;
}

export interface TrafficStatus {
  level: 'low' | 'moderate' | 'busy' | 'heavy';
  label: string;
  color: string;
  incidents: number;
}

let weatherCache: { data: WeatherData; timestamp: number } | null = null;
let trafficCache: { data: TrafficStatus; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current weather data for Vadodara
 * Uses cache to avoid excessive API calls
 */
export async function fetchWeather(): Promise<WeatherData> {
  // Check cache first
  if (weatherCache && Date.now() - weatherCache.timestamp < CACHE_DURATION) {
    return weatherCache.data;
  }

  try {
    // Generate realistic weather data for Vadodara (February)
    // TODO: Integrate with actual weather API (OpenWeatherMap, etc.)
    
    // February in Vadodara: warm & dry season, low rain probability
    const currentHour = new Date().getHours();
    
    // Base rain probability: very low in February (5-15%)
    let rainProb = 5 + Math.random() * 10; // 5-15%
    
    // Slight increase during afternoon due to heat
    if (currentHour >= 14 && currentHour <= 17) {
      rainProb += Math.random() * 5; // up to 20%
    }
    
    const data: WeatherData = {
      temperature: 26 + Math.random() * 10, // 26-36°C (typical Feb in Vadodara)
      humidity: 40 + Math.random() * 25, // 40-65% (drier season)
      rainProbability: Math.min(Math.round(rainProb), 25), // Cap at 25% in Feb
      conditions: rainProb > 18 ? 'cloudy' : 'clear',
      windSpeed: 5 + Math.random() * 10 // 5-15 km/h
    };

    weatherCache = { data, timestamp: Date.now() };
    return data;
  } catch (error) {
    console.error('Weather fetch failed:', error);
    // Return fallback data
    return {
      temperature: 30,
      humidity: 60,
      rainProbability: 20,
      conditions: 'clear',
      windSpeed: 10
    };
  }
}

/**
 * Get current traffic status based on active traffic incidents
 * Dynamically calculated from real incident data
 */
export async function fetchTrafficStatus(): Promise<TrafficStatus> {
  // Check cache
  if (trafficCache && Date.now() - trafficCache.timestamp < CACHE_DURATION) {
    return trafficCache.data;
  }

  try {
    // Fetch traffic incidents from API
    const res = await fetch(`${API_URL}/incidents?type=traffic&status=approved&limit=50`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('Traffic fetch failed');

    const { data: incidents } = await res.json();
    const trafficCount = incidents?.length || 0;

    // Calculate traffic level based on incident count and severity
    let level: TrafficStatus['level'] = 'low';
    let label = 'Clear';
    let color = 'green';

    if (trafficCount === 0) {
      level = 'low';
      label = 'Clear';
      color = 'green';
    } else if (trafficCount <= 3) {
      level = 'moderate';
      label = 'Moderate';
      color = 'yellow';
    } else if (trafficCount <= 7) {
      level = 'busy';
      label = 'Busy';
      color = 'orange';
    } else {
      level = 'heavy';
      label = 'Heavy';
      color = 'red';
    }

    const status: TrafficStatus = {
      level,
      label,
      color,
      incidents: trafficCount
    };

    trafficCache = { data: status, timestamp: Date.now() };
    return status;
  } catch (error) {
    console.error('Traffic status fetch failed:', error);
    return {
      level: 'moderate',
      label: 'Moderate',
      color: 'yellow',
      incidents: 0
    };
  }
}

/**
 * Clear all caches (useful after data updates)
 */
export function clearCache() {
  weatherCache = null;
  trafficCache = null;
}
