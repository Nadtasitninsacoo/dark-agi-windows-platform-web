'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Visualization for ligo-gwosc:recent-detections — a log-scale distance chart (187 Mpc to 3,100+ Mpc in
 * one dataset, so linear bars would flatten everything but the farthest event), same technique as
 * DsnLiveChart's distance bars, nearest event first.
 *
 * Encodings (dataviz skill): bar length = magnitude (distance, log scale, one hue — these events are not
 * competing identities, so no categorical palette); end-cap marker radius = total mass (area-proportional,
 * sqrt-scaled); SNR and p_astro (detection confidence) are shown as real numbers, never color-only.
 *
 * "Live" here means something different from the ISS/DSN charts: new confirmed detections are genuinely
 * rare (irregular, tied to LIGO/Virgo/KAGRA observing runs, not a continuous signal), so this polls
 * infrequently (90s) and the only motion is a one-shot "NEW" flash — gated on an event name this session
 * has not already seen — the moment GWOSC actually publishes one. No synthetic animation between real
 * detections, unlike the extrapolated ISS/DSN numbers: there is no honest way to predict when the next
 * merger will be announced.
 */

export interface GravitationalWaveEvent {
  name: string;
  detectedUtc: string;
  mergerType: string;
  mass1SolarMasses: number;
  mass2SolarMasses: number;
  distanceMpc: number | null;
  distanceMillionLightYears: number | null;
  redshift: number | null;
  signalToNoiseRatio: number | null;
  probabilityAstrophysical: number | null;
  catalog: string;
}

/** Detects a ligo-gwosc:recent-detections result shape without importing the backend's own type. */
export function isGwEventList(items: readonly unknown[]): items is GravitationalWaveEvent[] {
  const first = items[0] as Record<string, unknown> | undefined;
  return first !== undefined && typeof first.name === 'string' && typeof first.mergerType === 'string' && typeof first.mass1SolarMasses === 'number' && typeof first.detectedUtc === 'string';
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);
/** New confirmed detections are rare and the source feed is a ~1.3MB catalogue fetch — no need to poll often. */
const REFRESH_MS = 90_000;

function formatDistance(mly: number | null, mpc: number | null): string {
  if (mly !== null) return mly >= 1000 ? `${(mly / 1000).toFixed(2)}B ly` : `${mly.toFixed(1)}M ly`;
  if (mpc !== null) return `${mpc.toFixed(0)} Mpc`;
  return 'unknown distance';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function GwLiveChart({ items: initial, toolId, operationId }: { items: readonly GravitationalWaveEvent[]; toolId?: string; operationId?: string }) {
  const [items, setItems] = useState<readonly GravitationalWaveEvent[]>(initial);
  const [live, setLive] = useState(false);
  const [msUntilRefresh, setMsUntilRefresh] = useState(REFRESH_MS);
  const [newNames, setNewNames] = useState<ReadonlySet<string>>(new Set());
  const cancelledRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set(initial.map((e) => e.name)));

  const canLive = Boolean(toolId && operationId);

  useEffect(() => {
    if (!live || !toolId || !operationId) return undefined;
    cancelledRef.current = false;

    const tick = async () => {
      try {
        const job = await apiRequest<Job>('/jobs', post({ toolId, operationId, input: { count: Math.max(items.length, 5) } }));
        let current = job;
        for (let i = 0; i < 30 && !FINAL.has(current.status) && current.status !== 'AWAITING_APPROVAL'; i++) {
          await sleep(1000);
          if (cancelledRef.current) return;
          current = await apiRequest<Job>(`/jobs/${job.id}`);
        }
        const next = (current.result as { items?: unknown[] } | null)?.items;
        if (!cancelledRef.current && current.status === 'SUCCEEDED' && next && isGwEventList(next)) {
          const fresh = next.filter((e) => !seenRef.current.has(e.name)).map((e) => e.name);
          for (const name of fresh) seenRef.current.add(name);
          if (fresh.length > 0) {
            setNewNames(new Set(fresh));
            setTimeout(() => setNewNames(new Set()), 6000);
          }
          setItems(next);
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
  }, [live, toolId, operationId, items.length]);

  const distances = items.map((e) => e.distanceMillionLightYears ?? e.distanceMpc).filter((d): d is number => d !== null && d > 0);
  if (distances.length === 0) return null;
  const logMin = Math.log10(Math.min(...distances));
  const logMax = Math.log10(Math.max(...distances));
  const span = Math.max(logMax - logMin, 0.0001);
  const sorted = [...items].sort((a, b) => (a.distanceMillionLightYears ?? a.distanceMpc ?? 0) - (b.distanceMillionLightYears ?? b.distanceMpc ?? 0));
  const maxTotalMass = Math.max(...items.map((e) => e.mass1SolarMasses + e.mass2SolarMasses));

  return (
    <div className="rounded border border-edge bg-panel-2/40 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-2">Gravitational-wave detections — distance (log scale)</p>
          <p className="text-[10.5px] text-ink-3">{sorted.length} confirmed mergers, nearest first — real measured ripples in spacetime, not a simulation</p>
        </div>
        {canLive ? (
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${live ? 'border-accent-strong text-good' : 'border-edge-strong text-ink-2 hover:text-ink'}`}
          >
            <span className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-good' : 'bg-ink-3'}`} aria-hidden />
            {live ? `Watching for new detections — next check in ${Math.ceil(msUntilRefresh / 1000)}s` : 'Watch for new detections: off'}
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {sorted.map((e) => {
          const dMly = e.distanceMillionLightYears ?? e.distanceMpc;
          const pct = ((Math.log10(dMly ?? 1) - logMin) / span) * 100;
          const width = Math.max(pct, 3);
          const totalMass = e.mass1SolarMasses + e.mass2SolarMasses;
          const radius = 4 + 7 * Math.sqrt(totalMass / maxTotalMass);
          const isNew = newNames.has(e.name);

          return (
            <div key={e.name}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                  {e.name}
                  {isNew ? (
                    <span className="rounded bg-good/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-good" style={{ animation: 'dagi-ring-flash-good 1.6s ease-out 3' }}>
                      New
                    </span>
                  ) : null}
                </span>
                <span className="text-[10.5px] text-ink-3">{formatDate(e.detectedUtc)} · {e.mergerType}</span>
              </div>
              <div
                className="relative h-[6px] rounded-full bg-edge"
                title={`${e.name} · ${formatDistance(e.distanceMillionLightYears, e.distanceMpc)} · masses ${e.mass1SolarMasses}+${e.mass2SolarMasses} M☉ · SNR ${e.signalToNoiseRatio ?? '—'} · p(astro) ${e.probabilityAstrophysical ?? '—'} · redshift ${e.redshift ?? '—'} · catalog ${e.catalog}`}
              >
                <div className="h-full rounded-full bg-cyan" style={{ width: `${width}%` }} />
                <span className="absolute top-1/2 -translate-y-1/2 rounded-full bg-cyan ring-2 ring-panel" style={{ left: `calc(${width}% - ${radius}px)`, width: radius * 2, height: radius * 2 }} aria-hidden />
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-ink-3">
                <span>{formatDistance(e.distanceMillionLightYears, e.distanceMpc)} away · {e.mass1SolarMasses}+{e.mass2SolarMasses} M☉ (marker size = total mass)</span>
                <span className="font-mono">SNR {e.signalToNoiseRatio?.toFixed(1) ?? '—'}{e.probabilityAstrophysical !== null ? ` · p(astro) ${e.probabilityAstrophysical.toFixed(2)}` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
