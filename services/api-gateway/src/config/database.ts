import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { createClient } from 'redis';
import { Pool } from 'pg';

// ===========================================
// POSTGRESQL CONNECTION
// ===========================================
export const pgPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'pulse',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'pulse_db',
});

pgPool.on('connect', () => {
    console.log('✅ PostgreSQL connected successfully');
});

pgPool.on('error', (err) => {
    console.error('❌ PostgreSQL Error:', err);
});

// ===========================================
// MONGODB CONNECTION
// ===========================================
const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Atlas connected successfully');
        console.log(`📍 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️  Continuing without MongoDB (some features may be limited)');
        // Don't exit - MongoDB is optional for local development
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('👋 Mongoose connection closed through app termination');
    process.exit(0);
});

// ===========================================
// REDIS CONNECTION
// ===========================================
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                return new Error('Redis reconnection failed');
            }
            return retries * 500; // Exponential backoff
        }
    }
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

export async function connectRedis() {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Redis connection error:', error);
        console.log('⚠️  Continuing without Redis cache');
    }
}

// ===========================================
// DATABASE UTILITIES
// ===========================================
export async function isDbConnected(): Promise<boolean> {
    return mongoose.connection.readyState === 1;
}

export async function closeDatabase() {
    await mongoose.connection.close();
    await redisClient.quit();
    await pgPool.end();
}

