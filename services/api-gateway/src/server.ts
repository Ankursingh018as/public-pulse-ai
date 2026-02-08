import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createClient } from 'redis';
import { Pool } from 'pg';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { router as apiRouter } from './routes';
import { setupWebSockets } from './websockets';

dotenv.config();

export const app = express();
const server = http.createServer(app);

// ===========================================
// CONFIG & MIDDLEWARE
// ===========================================
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================================
// DATABASE CONNECTIONS
// ===========================================

// PostgreSQL (TimescaleDB)
export const pgPool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'pulse',
    password: process.env.POSTGRES_PASSWORD || 'pulsedev123',
    database: process.env.POSTGRES_DB || 'pulse_db',
});

// Redis
export const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// MongoDB (Optional - only connect if MONGO_URI is explicitly set)
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
    console.log('ℹ️ MongoDB not configured (optional). Skipping...');
}

// ===========================================
// ROUTES
// ===========================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Public Pulse API Gateway',
        status: 'online',
        version: '1.0.0',
        documentation: '/api/v1',
        health_check: '/health'
    });
});

app.use('/api/v1', apiRouter);

// ===========================================
// WEBSOCKETS
// ===========================================
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        methods: ["GET", "POST"]
    }
});

setupWebSockets(io);

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        try {
            await redisClient.connect();
            console.log('✅ Connected to Redis');
        } catch (e) {
            console.warn('⚠️ Redis connection failed. Running without Redis (Caching/Sockets may be limited).');
        }

        // Test Postgres connection
        const pgClient = await pgPool.connect();
        pgClient.release();
        console.log('✅ Connected to PostgreSQL/TimescaleDB');

        server.listen(PORT, () => {
            console.log(`🚀 API Gateway running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}
