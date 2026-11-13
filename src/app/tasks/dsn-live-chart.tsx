'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Visualization for nasa-dsn:live-status results — a log-scale distance chart (the data spans ~5 orders of
 * magnitude, Moon-distance to interstellar, so a linear bar would make everything but Voyager invisible)
 * with a status dot per spacecraft (green = actively sending/receiving right now, gray = idle) and an
 * optional "Live" toggle that re-submits this exact operation on an interval and updates in place — the
 * only part of this chart that is genuinely real-time; the rest is one job's snapshot.
 *
 * Encodings, one job each (dataviz skill): bar length = magnitude (distance, log scale, one hue — no
 * categorical colors, since these spacecraft are not being compared as a competing identity); the end-dot
 * = status (two states, both named in a legend row, never color-alone).
 */

export interface DsnTrack {
  dish: string;
  spacecraftCode: string;
  spacecraftName: string | null;
  roundTripLightTimeSec: number;
  distanceKm: number;
  uplinkActive: boolean;
  downlinkActive: boolean;
}

/** Detects a nasa-dsn:live-status result shape without importing the backend's own type. */
export function isDsnTrackList(items: readonly unknown[]): items is DsnTrack[] {
  const first = items[0] as Record<string, unknown> | undefined;
  return first !== undefined && typeof first.spacecraftCode === 'string' && typeof first.distanceKm === 'number' && typeof first.roundTripLightTimeSec === 'number';
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);
/** Polite cadence: NASA's own feed and this platform's job queue are both shared resources — refreshing every 20s is enough to feel live without hammering either. */
const REFRESH_MS = 20_000;

function formatDistance(km: number): string {
  if (km >= 1e9) return `${(km / 1e9).toFixed(2)}B km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1e3) return `${Math.round(km / 1e3).toLocaleString()}K km`;
  return `${Math.round(km)} km`;
}

function formatLightTime(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)} h`;
  if (sec >= 60) return `${(sec / 60).toFixed(1)} min`;
  return `${sec.toFixed(1)} s`;
}

export function DsnLiveChart({ items: initial, toolId, operationId }: { items: readonly DsnTrack[]; toolId?: string; operationId?: string }) {
  const [items, setItems] = useState<readonly DsnTrack[]>(initial);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const cancelledRef = useRef(false);

  const canLive = Boolean(toolId && operationId);

  useEffect(() => {
    if (!live || !toolId || !operationId) return undefined;
    cancelledRef.current = false;

    const tick = async () => {
      try {
        const job = await apiRequest<Job>('/jobs', post({ toolId, operationId, input: {} }));
        let current = job;
        for (let i = 0; i < 30 && !FINAL.has(current.status) && current.status !== 'AWAITING_APPROVAL'; i++) {
          await sleep(1000);
          if (cancelledRef.current) return;
          current = await apiRequest<Job>(`/jobs/${job.id}`);
        }
        const next = (current.result as { items?: unknown[] } | null)?.items;
        if (!cancelledRef.current && current.status === 'SUCCEEDED' && next && isDsnTrackList(next)) {
          setItems(next);
          setUpdatedAt(new Date());
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 500);
        }
      } catch {
        // A transient network hiccup during a background refresh — the next tick tries again; no need to interrupt the operator with an error for this.
      }
      if (!cancelledRef.current) handle = setTimeout(() => void tick(), REFRESH_MS);
    };
    let handle = setTimeout(() => void tick(), 0);
    return () => {
      cancelledRef.current = true;
      clearTimeout(handle);
    };
  }, [live, toolId, operationId]);

  const distances = items.map((t) => t.distanceKm).filter((d) => d > 0);
  if (distances.length === 0) return null;
  const logMin = Math.log10(Math.min(...distances));
  const logMax = Math.log10(Math.max(...distances));
  const span = Math.max(logMax - logMin, 0.0001);
  const sorted = [...items].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="rounded border border-edge bg-panel-2/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-2">Deep Space Network — distance (log scale)</p>
          <p className="text-[10.5px] text-ink-3">
            {sorted.length} spacecraft tracked{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ' · snapshot at job completion'}
          </p>
        </div>
        {canLive ? (
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${live ? 'border-accent-strong text-good' : 'border-edge-strong text-ink-2 hover:text-ink'}`}
          >
            <span className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-good' : 'bg-ink-3'}`} aria-hidden />
            {live ? 'Live — refreshing every 20s' : 'Live refresh: off'}
          </button>
        ) : null}
      </div>

      <div className="mb-3 flex items-center gap-4 text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-good" aria-hidden /> Active signal now
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink-3" aria-hidden /> Idle
        </span>
      </div>

      <div className={`space-y-3 transition-opacity duration-300 ${justUpdated ? 'opacity-60' : 'opacity-100'}`}>
        {sorted.map((t) => {
          const pct = ((Math.log10(t.distanceKm) - logMin) / span) * 100;
          const width = Math.max(pct, 3); // the nearest object still gets a visible sliver, not literally 0 width
          const active = t.uplinkActive || t.downlinkActive;
          const label = t.spacecraftName ?? `Unidentified (${t.spacecraftCode})`;
          return (
            <div key={`${t.dish}-${t.spacecraftCode}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-ink">{label}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink-2">{formatDistance(t.distanceKm)}</span>
              </div>
              <div
                className="relative h-[6px] rounded-full bg-edge"
                title={`${label} · ${formatDistance(t.distanceKm)} · round-trip light time ${formatLightTime(t.roundTripLightTimeSec)} · uplink ${t.uplinkActive ? 'active' : 'idle'}, downlink ${t.downlinkActive ? 'active' : 'idle'} · dish ${t.dish}`}
              >
                <div className="h-full rounded-full bg-cyan" style={{ width: `${width}%` }} />
                <span className={`absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2 ring-panel ${active ? 'bg-good' : 'bg-ink-3'}`} style={{ left: `calc(${width}% - 5px)` }} aria-hidden />
              </div>
              <p className="mt-1 text-[10px] text-ink-3">
                {t.dish} · light time {formatLightTime(t.roundTripLightTimeSec)} round-trip
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
