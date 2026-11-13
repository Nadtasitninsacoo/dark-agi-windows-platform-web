'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Visualization for nasa-dsn:live-status results — a log-scale distance chart (the data spans ~5 orders of
 * magnitude, Moon-distance to interstellar, so a linear bar would make everything but Voyager invisible),
 * a separate uplink/downlink light per spacecraft, and an optional "Live" toggle that re-submits this exact
 * operation on an interval and updates in place.
 *
 * Encodings, one job each (dataviz skill): bar length = magnitude (distance, log scale, one hue — no
 * categorical colors, since these spacecraft are not being compared as a competing identity); each light
 * = status (two states, both named, never color-alone).
 *
 * Motion is gated by real state, never decorative-by-default (same rule src/app/globals.css documents for
 * dagi-radar-sweep's blips): a ring only loops, and chase-light dots (dagi-chase — the technique
 * agent-console.tsx's StatusBar already uses) only run and only appear, while that specific link is
 * actually active — direction follows the real signal direction (uplink: Earth, left -> spacecraft, right;
 * downlink: the reverse; both run together, independently, when both links are active at once).
 *
 * The ticking distance number is the one place this chart predicts rather than only reports: once Live
 * mode has completed two real refreshes for a spacecraft, it has a REAL measured rate (the actual change
 * in that spacecraft's own reported distance over the actual elapsed time — never an assumed orbital
 * speed, which would be outright wrong for an orbiter whose Earth-distance oscillates with geometry, not a
 * steady recession) and extrapolates the display between refreshes at that rate, labelled "(extrapolated)"
 * so it's never mistaken for a third real reading. Before two real points exist, the number is static.
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
/** Local-only, no network cost: how often the extrapolated number and the chase-light phase repaint between real refreshes. */
const TICK_MS = 200;

function formatDistance(km: number): string {
  if (Math.abs(km) >= 1e9) return `${(km / 1e9).toFixed(3)}B km`;
  if (Math.abs(km) >= 1e6) return `${(km / 1e6).toFixed(3)}M km`;
  if (Math.abs(km) >= 1e3) return `${Math.round(km / 1e3).toLocaleString()}K km`;
  return `${Math.round(km)} km`;
}

function formatLightTime(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)} h`;
  if (sec >= 60) return `${(sec / 60).toFixed(1)} min`;
  return `${sec.toFixed(1)} s`;
}

const CHASE_DOTS: number = 5;

/** Positions for one direction's travelling chase-light dots along a bar's filled width, in signal-travel order. */
function chaseStyles(widthPct: number, direction: 'uplink' | 'downlink'): { style: CSSProperties; leftPct: number }[] {
  return Array.from({ length: CHASE_DOTS }, (_, i) => {
    const leftPct = CHASE_DOTS === 1 ? widthPct / 2 : (i / (CHASE_DOTS - 1)) * widthPct;
    const order = direction === 'uplink' ? i : CHASE_DOTS - 1 - i; // uplink: Earth (left) -> spacecraft (right); downlink: the reverse
    return { leftPct, style: { animation: 'dagi-chase 1.1s linear infinite', animationDelay: `${order * 0.12}s` } };
  });
}

/** A small status light with a label — never color-alone (dataviz accessibility rule). */
function StatusLight({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1" title={`${label}: ${on ? 'active' : 'idle'}`}>
      <span className={`size-1.5 rounded-full ${on ? 'bg-good' : 'bg-ink-3'}`} style={{ animation: on ? 'dagi-ring-flash-good 1.6s ease-out infinite' : undefined }} aria-hidden />
      <span className={`text-[9.5px] uppercase tracking-wide ${on ? 'text-good' : 'text-ink-3'}`}>{label}</span>
    </span>
  );
}

export function DsnLiveChart({ items: initial, toolId, operationId }: { items: readonly DsnTrack[]; toolId?: string; operationId?: string }) {
  const [items, setItems] = useState<readonly DsnTrack[]>(initial);
  const [live, setLive] = useState(false);
  const [updatedAtMs, setUpdatedAtMs] = useState<number | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [msUntilRefresh, setMsUntilRefresh] = useState(REFRESH_MS);
  const [rateKmPerSec, setRateKmPerSec] = useState<ReadonlyMap<string, number>>(new Map());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const cancelledRef = useRef(false);
  const prevRef = useRef<{ items: readonly DsnTrack[]; atMs: number } | null>(null);

  const canLive = Boolean(toolId && operationId);

  // Real-time refresh: re-submits the operation and polls it to completion every REFRESH_MS.
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
          const at = Date.now();
          const prev = prevRef.current;
          if (prev) {
            const dtSec = (at - prev.atMs) / 1000;
            const rates = new Map<string, number>();
            if (dtSec > 0) {
              for (const t of next) {
                const before = prev.items.find((p) => p.spacecraftCode === t.spacecraftCode);
                if (before) rates.set(t.spacecraftCode, (t.distanceKm - before.distanceKm) / dtSec);
              }
            }
            setRateKmPerSec(rates);
          }
          prevRef.current = { items: next, atMs: at };
          setItems(next);
          setUpdatedAtMs(at);
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 500);
        }
      } catch {
        // A transient network hiccup during a background refresh — the next tick tries again; no need to interrupt the operator with an error for this.
      }
      if (!cancelledRef.current) {
        setMsUntilRefresh(REFRESH_MS);
        handle = setTimeout(() => void tick(), REFRESH_MS);
      }
    };
    let handle = setTimeout(() => void tick(), 0);
    // A real (if coarse) countdown to the next refresh — not animated for its own sake, just ticking down the same REFRESH_MS the fetch above actually waits.
    const countdown = setInterval(() => setMsUntilRefresh((ms) => Math.max(0, ms - 1000)), 1000);
    return () => {
      cancelledRef.current = true;
      clearTimeout(handle);
      clearInterval(countdown);
    };
  }, [live, toolId, operationId]);

  // Local-only clock for the extrapolated numbers between real refreshes — no network call, just a repaint.
  useEffect(() => {
    if (!live || rateKmPerSec.size === 0) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [live, rateKmPerSec]);

  const distances = items.map((t) => t.distanceKm).filter((d) => d > 0);
  if (distances.length === 0) return null;
  const logMin = Math.log10(Math.min(...distances));
  const logMax = Math.log10(Math.max(...distances));
  const span = Math.max(logMax - logMin, 0.0001);
  const sorted = [...items].sort((a, b) => a.distanceKm - b.distanceKm);
  const activeCount = sorted.filter((t) => t.uplinkActive || t.downlinkActive).length;

  return (
    <div className="rounded border border-edge bg-panel-2/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-2">Deep Space Network — distance (log scale)</p>
          <p className="text-[10.5px] text-ink-3">
            {sorted.length} spacecraft tracked, {activeCount} with an active link{updatedAtMs ? ` · updated ${new Date(updatedAtMs).toLocaleTimeString()}` : ' · snapshot at job completion'}
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
            {live ? `Live — next refresh in ${Math.ceil(msUntilRefresh / 1000)}s` : 'Live refresh: off'}
          </button>
        ) : null}
      </div>

      {/* Summary strip: one light per tracked spacecraft, same order as the bars below — a glance-level status board before reading any individual bar. */}
      <div className="mb-3 flex items-center gap-2 rounded border border-edge/60 bg-canvas/40 px-2 py-1.5" role="img" aria-label={`${activeCount} of ${sorted.length} spacecraft have an active link right now`}>
        <div className="flex gap-[3px]">
          {sorted.map((t) => {
            const on = t.uplinkActive || t.downlinkActive;
            return <span key={`${t.dish}-${t.spacecraftCode}`} className={`size-1.5 rounded-full ${on ? 'bg-good' : 'bg-panel-2'}`} style={on ? { animation: 'dagi-chase 1.4s linear infinite' } : undefined} aria-hidden />;
          })}
        </div>
        <span className="text-[10px] text-ink-3">
          {activeCount} / {sorted.length} active now
        </span>
      </div>

      <div className="mb-3 flex items-center gap-4 text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-good" aria-hidden /> Active signal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink-3" aria-hidden /> Idle
        </span>
      </div>

      <div className={`space-y-3.5 transition-opacity duration-300 ${justUpdated ? 'opacity-60' : 'opacity-100'}`}>
        {sorted.map((t) => {
          const pct = ((Math.log10(t.distanceKm) - logMin) / span) * 100;
          const width = Math.max(pct, 3); // the nearest object still gets a visible sliver, not literally 0 width
          const anyActive = t.uplinkActive || t.downlinkActive;
          const label = t.spacecraftName ?? `Unidentified (${t.spacecraftCode})`;

          const rate = rateKmPerSec.get(t.spacecraftCode);
          const extrapolating = live && rate !== undefined && updatedAtMs !== null;
          const displayedKm = extrapolating ? t.distanceKm + rate * ((nowMs - updatedAtMs!) / 1000) : t.distanceKm;

          return (
            <div key={`${t.dish}-${t.spacecraftCode}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-ink">{label}</span>
                <span className="flex shrink-0 items-baseline gap-1">
                  <span className="font-mono text-[11px] tabular-nums text-ink-2">{formatDistance(displayedKm)}</span>
                  {extrapolating ? (
                    <span className="text-[9px] text-ink-3" title={`Extrapolated from a real measured rate of ${rate >= 0 ? '+' : ''}${rate.toFixed(2)} km/s, not a fresh reading`}>
                      ({rate >= 0 ? '↑' : '↓'} extrapolated)
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                className="relative h-[6px] rounded-full bg-edge"
                title={`${label} · ${formatDistance(t.distanceKm)} (last confirmed reading) · round-trip light time ${formatLightTime(t.roundTripLightTimeSec)} · uplink ${t.uplinkActive ? 'active' : 'idle'}, downlink ${t.downlinkActive ? 'active' : 'idle'} · dish ${t.dish}`}
              >
                <div className="h-full rounded-full bg-cyan" style={{ width: `${width}%` }} />
                {t.uplinkActive ? chaseStyles(width, 'uplink').map(({ leftPct, style }, i) => <span key={`up-${i}`} className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-good" style={{ left: `${leftPct}%`, ...style }} aria-hidden />) : null}
                {t.downlinkActive ? chaseStyles(width, 'downlink').map(({ leftPct, style }, i) => <span key={`down-${i}`} className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-good" style={{ left: `${leftPct}%`, ...style }} aria-hidden />) : null}
                <span
                  className={`absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2 ring-panel ${anyActive ? 'bg-good' : 'bg-ink-3'}`}
                  style={{ left: `calc(${width}% - 5px)`, animation: anyActive ? 'dagi-ring-flash-good 1.6s ease-out infinite' : undefined }}
                  aria-hidden
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[10px] text-ink-3">
                  {t.dish} · light time {formatLightTime(t.roundTripLightTimeSec)} round-trip
                </p>
                <div className="flex shrink-0 gap-2.5">
                  <StatusLight on={t.uplinkActive} label="Uplink" />
                  <StatusLight on={t.downlinkActive} label="Downlink" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
