import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { setupWebhook } from './webhook';

dotenv.config();

const app = express();
app.use(express.json());

// ===========================================
// DATABASE CONNECTIONS
// ===========================================

// MongoDB for raw message storage
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/pulse_raw';
mongoose.connect(mongoUri)
    .then(() => console.log('✅ WA-Service: Connected to MongoDB'))
    .catch(err => console.error('❌ WA-Service: MongoDB Connection Error:', err));

// Redis for caching/queueing
export const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// ===========================================
// ROUTES
// ===========================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'wa-service', timestamp: new Date() });
});

setupWebhook(app);

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3010;

async function startServer() {
    try {
        await redisClient.connect();
        console.log('✅ WA-Service: Connected to Redis');

        app.listen(PORT, () => {
            console.log(`🚀 WA-Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start WA-Service:', error);
    }
}

startServer();
