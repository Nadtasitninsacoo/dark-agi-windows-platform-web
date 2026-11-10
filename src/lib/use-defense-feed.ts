'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, type DefenseEvent } from './api/client';

const MAX_EVENTS = 200;

export type DefenseFeedConnection = 'connecting' | 'live' | 'disconnected';

export interface DefenseFeedState {
  readonly connection: DefenseFeedConnection;
  readonly events: readonly DefenseEvent[];
  readonly latest: DefenseEvent | null;
}

/** Subscribes to the backend `/defense` Socket.IO namespace — the radar's live feed (same pattern as
 * useTelemetry / `/telemetry`). Requires `defense:read`; the backend disconnects the socket otherwise. */
export function useDefenseFeed(): DefenseFeedState {
  const [connection, setConnection] = useState<DefenseFeedConnection>('connecting');
  const [events, setEvents] = useState<DefenseEvent[]>([]);

  useEffect(() => {
    const socket = io(`${API_BASE_URL}/defense`, { transports: ['websocket'], reconnectionDelayMax: 5000, withCredentials: true });
    socket.on('connect', () => setConnection('live'));
    socket.on('disconnect', () => setConnection('disconnected'));
    socket.on('connect_error', () => setConnection('disconnected'));
    socket.on('defense.history', (history: DefenseEvent[]) => setEvents(history.slice(-MAX_EVENTS)));
    socket.on('defense.event', (event: DefenseEvent) => {
      setEvents((prev) => {
        const next = prev.length >= MAX_EVENTS ? prev.slice(prev.length - MAX_EVENTS + 1) : prev.slice();
        next.push(event);
        return next;
      });
    });
    return () => {
      socket.close();
    };
  }, []);

  return { connection, events, latest: events.at(-1) ?? null };
}
