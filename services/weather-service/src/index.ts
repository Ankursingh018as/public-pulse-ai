import { Pool } from 'pg';
import { CronJob } from 'cron';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

// ===========================================
// CONFIG
// ===========================================
const POLL_INTERVAL = '0 */15 * * * *'; // Every 15 minutes
const API_KEY = process.env.OPENWEATHER_API_KEY;
// Default City: Surat
const LAT = 21.1702;
const LON = 72.8311;

// ===========================================
// DATABASE CONNECTIONS
// ===========================================
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'pulse',
    password: process.env.POSTGRES_PASSWORD || 'pulsedev123',
    database: process.env.POSTGRES_DB || 'pulse_db',
});

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// ===========================================
// LOGIC
// ===========================================

async function fetchWeather() {
    console.log('🌦️ Fetching weather data...');
    try {
        // 1. Fetch from OpenWeatherMap
        // Using OneCall API or standard Current Weather
        let weather = {
            temp: 30,
            humidity: 60,
            rain: 0,
            wind: 10,
            conditions: 'Clear'
        };

        if (API_KEY) {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`;
            const res = await axios.get(url);
            const data = res.data;

            weather = {
                temp: data.main.temp,
                humidity: data.main.humidity,
                rain: data.rain ? (data.rain['1h'] || 0) : 0,
                wind: data.wind.speed,
                conditions: data.weather[0].main
            };
        } else {
            console.log('⚠️ No API Key, using mock weather data');
            weather.temp = 32 + (Math.random() * 2);
            weather.rain = Math.random() > 0.8 ? 5 : 0; // Occasional rain
        }

        // 2. Determine rain probability (Simple heuristic for MVP)
        const rainProb = weather.conditions.toLowerCase().includes('rain') ? 0.9 : 0.1;

        // 3. Store in DB (Linked to main city area, or multiple if we had multiple lat/lons)
        // For MVP, we attach this reading to ALL tracked areas to simulate city-wide weather
        // or just store once linked to a "Surat" area.

        // Let's get the generic Surat area ID (assuming 1 for MVP or lookup)
        // Ideally we'd loop through all areas and fetch micro-weather if API supported it.
        const areaRes = await pool.query("SELECT id FROM areas WHERE city = 'Surat'");

        // For efficiency, just insert once per poll for the main city
        if (areaRes.rows.length > 0) {
            const areaId = areaRes.rows[0].id; // Just pick first one as representative or a specific "City" area

            await pool.query(`
                INSERT INTO weather_data (area_id, temperature_c, humidity_percent, rain_probability, rain_mm, wind_speed_kmh, conditions)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                areaId,
                weather.temp,
                weather.humidity,
                rainProb,
                weather.rain,
                weather.wind,
                weather.conditions
            ]);
        }

        console.log('✅ Weather data updated.');

    } catch (error) {
        console.error('❌ Weather Poll Error:', error);
    }
}

// ===========================================
// SCHEDULER
// ===========================================
const job = new CronJob(
    POLL_INTERVAL,
    fetchWeather,
    null,
    true,
    'Asia/Kolkata'
);

async function start() {
    await redisClient.connect();
    console.log('🚀 Weather-Service started');
    fetchWeather();
}

start();
