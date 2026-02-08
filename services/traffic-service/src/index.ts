import { Pool } from 'pg';
import { CronJob } from 'cron';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

// ===========================================
// CONFIG
// ===========================================
const POLL_INTERVAL = '*/10 * * * *'; // Every 10 minutes
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ===========================================
// DATABASE CONNECTIONS
// ===========================================
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'pulse',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'pulse_db',
});

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// ===========================================
// TRAFFIC LOGIC
// ===========================================

interface Area {
    id: number;
    name: string;
    center: { lat: number, lng: number }; // Simplified geometry
}

async function fetchTrafficData() {
    console.log('🚦 Fetching traffic data...');

    try {
        // 1. Get monitored areas
        const areasRes = await pool.query('SELECT id, name, center FROM areas');
        // Note: In real app, we'd parse PostGIS geometry. For MVP keeping simple.
        // Assuming we mock the center or extract nicely.

        // Mock areas for MVP loop if DB empty
        const areas = areasRes.rows.length > 0 ? areasRes.rows : [
            { id: 1, name: 'Adajan', center: { lat: 21.1959, lng: 72.7933 } },
            { id: 2, name: 'Vesu', center: { lat: 21.1500, lng: 72.7750 } }
        ];

        for (const area of areas) {
            // 2. Call Google Maps Traffic API (using Distance Matrix or Traffic Layer shim)
            // Real traffic API layer is complex, usually we poll "typical duration" vs "current duration"
            // for major routes in the area.

            // Simulating API call for Hackathon MVP unless key is provided
            let trafficData = {
                congestion: 0,
                speed: 40,
                delay: 0
            };

            if (GOOGLE_MAPS_API_KEY) {
                // Call real API logic here
            } else {
                // Simulation Mode
                trafficData = simulateTraffic(area.name);
            }

            // 3. Store in TimescaleDB
            await pool.query(`
                INSERT INTO traffic_data (area_id, location, speed_kmh, congestion_level, delay_seconds, is_anomaly)
                VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)
            `, [
                area.id,
                area.center.lng,
                area.center.lat,
                trafficData.speed,
                trafficData.congestion,
                trafficData.delay,
                trafficData.congestion > 0.7 // Audit rule
            ]);
        }
        console.log('✅ Traffic data updated for all areas');

    } catch (error) {
        console.error('❌ Traffic Poll Error:', error);
    }
}

function simulateTraffic(areaName: string) {
    const hour = new Date().getHours();
    const isPeak = (hour > 8 && hour < 11) || (hour > 17 && hour < 20);

    return {
        speed: isPeak ? 15 + Math.random() * 10 : 35 + Math.random() * 20,
        congestion: isPeak ? 0.6 + Math.random() * 0.4 : 0.1 + Math.random() * 0.3,
        delay: isPeak ? Math.floor(Math.random() * 600) : 0
    };
}

// ===========================================
// SCHEDULER
// ===========================================
const job = new CronJob(
    POLL_INTERVAL,
    fetchTrafficData,
    null,
    true,
    'Asia/Kolkata'
);

async function start() {
    await redisClient.connect();
    console.log('🚀 Traffic-Service started');
    fetchTrafficData();
}

start();
