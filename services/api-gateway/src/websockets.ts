import { Server, Socket } from 'socket.io';

let ioInstance: Server | null = null;

export function setupWebSockets(io: Server) {
    ioInstance = io;

    io.on('connection', (socket: Socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);

        // Join a room based on subscription
        socket.on('subscribe', (room: string) => {
            socket.join(room);
            console.log(`[WS] Client ${socket.id} joined room: ${room}`);
        });

        // Subscribe to specific areas
        socket.on('subscribe:area', (areaId: number) => {
            socket.join(`area:${areaId}`);
            console.log(`[WS] Client ${socket.id} subscribed to area: ${areaId}`);
        });

        // Unsubscribe from room
        socket.on('unsubscribe', (room: string) => {
            socket.leave(room);
            console.log(`[WS] Client ${socket.id} left room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`[WS] Client ${socket.id} disconnected`);
        });
    });
}

// Broadcast helper functions - can be called from anywhere
export function broadcastNewPrediction(prediction: any) {
    if (ioInstance) {
        console.log(`[WS] Broadcasting new prediction: ${prediction.event_type}`);
        ioInstance.emit('prediction:new', prediction);

        // Also emit to specific area room
        if (prediction.area_id) {
            ioInstance.to(`area:${prediction.area_id}`).emit('prediction:area', prediction);
        }
    }
}

export function broadcastNewIncident(incident: any) {
    if (ioInstance) {
        console.log(`[WS] Broadcasting new incident: ${incident.type}`);
        ioInstance.emit('incident:new', incident);
    }
}

export function broadcastAlert(alert: any) {
    if (ioInstance) {
        console.log(`[WS] Broadcasting alert: ${alert.severity}`);
        ioInstance.emit('alert:new', alert);
    }
}

export function broadcastVerification(verificationData: any) {
    if (ioInstance) {
        console.log(`[WS] Broadcasting verification: ${verificationData.id}`);
        ioInstance.emit('prediction:verified', verificationData);
    }
}

export function getIO(): Server | null {
    return ioInstance;
}
