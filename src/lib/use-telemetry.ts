'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, type HostMetricsHistory, type HostMetricsSample } from './api/client';

const MAX_SAMPLES = 150;

export type TelemetryConnection = 'connecting' | 'live' | 'disconnected';

export interface TelemetryState {
  readonly connection: TelemetryConnection;
  readonly samples: readonly HostMetricsSample[];
  readonly latest: HostMetricsSample | null;
  readonly intervalMs: number | null;
}

/** Subscribes to the backend `/telemetry` Socket.IO namespace (real measured host metrics). */
export function useTelemetry(): TelemetryState {
  const [connection, setConnection] = useState<TelemetryConnection>('connecting');
  const [samples, setSamples] = useState<HostMetricsSample[]>([]);
  const [intervalMs, setIntervalMs] = useState<number | null>(null);

  useEffect(() => {
    const socket = io(`${API_BASE_URL}/telemetry`, { transports: ['websocket'], reconnectionDelayMax: 5000, withCredentials: true });
    socket.on('connect', () => setConnection('live'));
    socket.on('disconnect', () => setConnection('disconnected'));
    socket.on('connect_error', () => setConnection('disconnected'));
    socket.on('host.history', (history: HostMetricsHistory) => {
      setIntervalMs(history.intervalMs);
      setSamples(history.samples.slice(-MAX_SAMPLES));
    });
    socket.on('host.metrics', (sample: HostMetricsSample) => {
      setSamples((prev) => {
        const next = prev.length >= MAX_SAMPLES ? prev.slice(prev.length - MAX_SAMPLES + 1) : prev.slice();
        next.push(sample);
        return next;
      });
    });
    return () => {
      socket.close();
    };
  }, []);

  return { connection, samples, latest: samples.at(-1) ?? null, intervalMs };
}
