'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
    onNewPrediction?: (prediction: any) => void;
    onNewIncident?: (incident: any) => void;
    onNewAlert?: (alert: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<any>(null);

    useEffect(() => {
        const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketInstance.on('connect', () => {
            console.log('[WS] Connected to server');
            setIsConnected(true);

            // Subscribe to all predictions
            socketInstance.emit('subscribe', 'predictions');
        });

        socketInstance.on('disconnect', () => {
            console.log('[WS] Disconnected from server');
            setIsConnected(false);
        });

        socketInstance.on('prediction:new', (data) => {
            console.log('[WS] New prediction:', data);
            setLastEvent({ type: 'prediction', data, timestamp: new Date() });
            options.onNewPrediction?.(data);
        });

        socketInstance.on('incident:new', (data) => {
            console.log('[WS] New incident:', data);
            setLastEvent({ type: 'incident', data, timestamp: new Date() });
            options.onNewIncident?.(data);
        });

        socketInstance.on('alert:new', (data) => {
            console.log('[WS] New alert:', data);
            setLastEvent({ type: 'alert', data, timestamp: new Date() });
            options.onNewAlert?.(data);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const subscribeToArea = useCallback((areaId: number) => {
        if (socket) {
            socket.emit('subscribe:area', areaId);
        }
    }, [socket]);

    return {
        socket,
        isConnected,
        lastEvent,
        subscribeToArea
    };
}
