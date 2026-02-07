import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { router as apiRouter } from './routes';
import { setupWebSockets } from './websockets';
import { connectDatabase, connectRedis, redisClient } from './config/database';

dotenv.config();

export const app = express();
const server = http.createServer(app);
export { redisClient };

// ===========================================
// CONFIG & MIDDLEWARE
// ===========================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// ROUTES
// ===========================================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        database: 'MongoDB Atlas',
        cache: redisClient.isOpen ? 'connected' : 'disconnected'
    });
});

app.get('/api', (req, res) => {
    res.json({
        message: 'Public Pulse AI API Gateway',
        version: '1.0.0',
        endpoints: {
            incidents: '/api/v1/incidents',
            analytics: '/api/v1/analytics',
            predictions: '/api/v1/predictions',
            areas: '/api/v1/areas',
            alerts: '/api/v1/alerts'
        }
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

// Make io available globally for route handlers
(global as any).io = io;

setupWebSockets(io);

// ===========================================
// START SERVER
// ===========================================
// SERVER STARTUP
// ===========================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to MongoDB Atlas
        await connectDatabase();
        
        // Connect to Redis (optional)
        await connectRedis();

        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`🚀 API Gateway running on port ${PORT}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('👋 HTTP server closed');
    });
});

if (require.main === module) {
    startServer();
}

