'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Visualization for iss-tracker:live-position results — a real-time latitude track (the ISS's actual
 * orbital inclination is 51.6°, a published, verifiable fact, not this platform's estimate, so the chart
 * draws ±51.6° reference lines and the real track genuinely stays inside them) plus ticking stat tiles and
 * a day/night status light.
 *
 * Form (dataviz skill): this is "change over time" for a single real entity, not a comparison across
 * several — a line, not bars; one hue, no categorical palette needed. The day/night status is a two-state
 * status encoding, icon + label, never color-alone, and neither state is "good" or "bad" so it does not
 * borrow the good/critical status colors — amber for sunlit, cyan for night, same as this app's existing
 * palette slots for those hues elsewhere.
 *
 * Unlike the DSN chart, wheretheiss.at has no shared-key rate limit (confirmed while building the backend
 * operation: 350 requests/5min, no API key), so this refreshes faster and starts Live automatically — it's
 * not pulling from a scarce shared resource the way the NASA DEMO_KEY operations are.
 */

export interface IssPosition {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: string;
  footprintKm: number;
  locationName: string | null;
  timestamp: number;
}

/** Detects an iss-tracker:live-position result shape without importing the backend's own type. */
export function isIssPositionList(items: readonly unknown[]): items is IssPosition[] {
  const first = items[0] as Record<string, unknown> | undefined;
  return first !== undefined && typeof first.latitude === 'number' && typeof first.longitude === 'number' && typeof first.altitudeKm === 'number' && typeof first.velocityKmh === 'number' && typeof first.visibility === 'string';
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);
/** wheretheiss.at's own generous limit is 350 req/5min — this cadence uses a small fraction of it. */
const REFRESH_MS = 8_000;
const MAX_HISTORY = 60;
/** The ISS's real, published orbital inclination — the latitude track genuinely never exceeds this. */
const INCLINATION_DEG = 51.6;

function StatusLight({ daylight }: { daylight: boolean }) {
  const Icon = daylight ? Sun : Moon;
  return (
    <span className={`flex items-center gap-1 ${daylight ? 'text-warning' : 'text-cyan'}`} title={daylight ? 'Sunlit side of the orbit' : "In Earth's shadow"}>
      <Icon className="size-3" aria-hidden />
      <span className="text-[10px] font-medium uppercase tracking-wide">{daylight ? 'Daylight' : 'Eclipsed'}</span>
    </span>
  );
}

function LatitudeTrack({ history }: { history: readonly IssPosition[] }) {
  const w = 300;
  const h = 72;
  const yFor = (lat: number) => h / 2 - (lat / INCLINATION_DEG) * (h / 2 - 4);
  const points = history.map((p, i) => {
    const x = history.length <= 1 ? w / 2 : (i / (history.length - 1)) * w;
    return `${x.toFixed(1)},${yFor(p.latitude).toFixed(1)}`;
  });
  const last = history[history.length - 1]!;
  const lastX = history.length <= 1 ? w / 2 : w;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-20 w-full" role="img" aria-label={`Latitude track, currently ${last.latitude.toFixed(2)} degrees, within the ISS's real ${INCLINATION_DEG} degree orbital inclination`}>
      <line x1={0} x2={w} y1={yFor(INCLINATION_DEG)} y2={yFor(INCLINATION_DEG)} stroke="var(--color-ink-3)" strokeWidth={1} strokeDasharray="2,3" />
      <text x={2} y={yFor(INCLINATION_DEG) - 2} fontSize={7} fill="var(--color-ink-3)">+{INCLINATION_DEG}°</text>
      <line x1={0} x2={w} y1={yFor(0)} y2={yFor(0)} stroke="var(--color-edge-strong)" strokeWidth={1} />
      <text x={2} y={yFor(0) - 2} fontSize={7} fill="var(--color-ink-3)">equator</text>
      <line x1={0} x2={w} y1={yFor(-INCLINATION_DEG)} y2={yFor(-INCLINATION_DEG)} stroke="var(--color-ink-3)" strokeWidth={1} strokeDasharray="2,3" />
      <text x={2} y={yFor(-INCLINATION_DEG) + 8} fontSize={7} fill="var(--color-ink-3)">-{INCLINATION_DEG}°</text>
      {points.length > 1 ? <polyline points={points.join(' ')} fill="none" stroke="var(--color-cyan)" strokeWidth={1.5} /> : null}
      <circle cx={lastX} cy={yFor(last.latitude)} r={3} fill={last.visibility === 'daylight' ? 'var(--color-warning)' : 'var(--color-cyan)'} stroke="var(--color-panel)" strokeWidth={1.5} />
    </svg>
  );
}

export function IssLiveChart({ items: initial, toolId, operationId }: { items: readonly IssPosition[]; toolId?: string; operationId?: string }) {
  const [history, setHistory] = useState<readonly IssPosition[]>(initial.slice(0, 1));
  const [live, setLive] = useState(false);
  const [msUntilRefresh, setMsUntilRefresh] = useState(REFRESH_MS);
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
        if (!cancelledRef.current && current.status === 'SUCCEEDED' && next && isIssPositionList(next)) {
          setHistory((h) => [...h, next[0]!].slice(-MAX_HISTORY));
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 400);
        }
      } catch {
        // A transient network hiccup during a background refresh — the next tick tries again.
      }
      if (!cancelledRef.current) {
        setMsUntilRefresh(REFRESH_MS);
        handle = setTimeout(() => void tick(), REFRESH_MS);
      }
    };
    let handle = setTimeout(() => void tick(), 0);
    const countdown = setInterval(() => setMsUntilRefresh((ms) => Math.max(0, ms - 1000)), 1000);
    return () => {
      cancelledRef.current = true;
      clearTimeout(handle);
      clearInterval(countdown);
    };
  }, [live, toolId, operationId]);

  const latest = history[history.length - 1];
  if (!latest) return null;

  return (
    <div className="rounded border border-edge bg-panel-2/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-2">International Space Station — live track</p>
          <p className="text-[10.5px] text-ink-3">{new Date(latest.timestamp * 1000).toLocaleTimeString()} · {latest.locationName ?? 'over open ocean (no match)'}</p>
        </div>
        {canLive ? (
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${live ? 'border-accent-strong text-good' : 'border-edge-strong text-ink-2 hover:text-ink'}`}
          >
            <span className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-good' : 'bg-ink-3'}`} aria-hidden />
            {live ? `Live — next refresh in ${Math.ceil(msUntilRefresh / 1000)}s` : 'Live refresh: off'}
          </button>
        ) : null}
      </div>

      <div className={`mb-3 grid grid-cols-2 gap-2 transition-opacity duration-300 sm:grid-cols-4 ${justUpdated ? 'opacity-60' : 'opacity-100'}`}>
        <div className="rounded border border-edge/60 bg-canvas/40 px-2 py-1.5">
          <p className="text-[9.5px] uppercase tracking-wide text-ink-3">Altitude</p>
          <p className="font-mono text-[13px] tabular-nums text-ink">{latest.altitudeKm.toFixed(1)} km</p>
        </div>
        <div className="rounded border border-edge/60 bg-canvas/40 px-2 py-1.5">
          <p className="text-[9.5px] uppercase tracking-wide text-ink-3">Ground speed</p>
          <p className="font-mono text-[13px] tabular-nums text-ink">{Math.round(latest.velocityKmh).toLocaleString()} km/h</p>
        </div>
        <div className="rounded border border-edge/60 bg-canvas/40 px-2 py-1.5">
          <p className="text-[9.5px] uppercase tracking-wide text-ink-3">Position</p>
          <p className="font-mono text-[12px] tabular-nums text-ink">
            {latest.latitude.toFixed(2)}°, {latest.longitude.toFixed(2)}°
          </p>
        </div>
        <div className="flex items-center justify-between rounded border border-edge/60 bg-canvas/40 px-2 py-1.5">
          <div>
            <p className="text-[9.5px] uppercase tracking-wide text-ink-3">Visibility</p>
            <StatusLight daylight={latest.visibility === 'daylight'} />
          </div>
        </div>
      </div>

      <LatitudeTrack history={history} />
      <p className="mt-1 text-[10px] text-ink-3">
        Latitude over the last {history.length} reading{history.length === 1 ? '' : 's'} — real orbital motion, bounded by the ISS&apos;s actual {INCLINATION_DEG}° inclination.
      </p>
    </div>
  );
}
