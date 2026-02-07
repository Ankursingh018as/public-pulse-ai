'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

interface WebSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: { type: string; data: any } | null;
}

export function useWebSocket(): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen to all relevant events
    const events = [
      'incident:new',
      'incident:vote', 
      'incident:approved',
      'incident:resolved',
      'prediction:new',
      'alert:new'
    ];

    events.forEach(eventType => {
      socket.on(eventType, (data: any) => {
        setLastEvent({ type: eventType, data });
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    lastEvent
  };
}
