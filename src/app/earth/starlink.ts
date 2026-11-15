import * as satellite from 'satellite.js';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Backend's `spacex:starlink-elements`/`spacex:starship-launches` (see spacex.ts there for the full story,
 * including why CelesTrak is queried via `NAME=STARLINK` instead of the documented `GROUP=starlink`, and
 * why OMM/json2satrec is used instead of classic TLE text). This module turns that job result into actual
 * live positions: satellite.js's `json2satrec` builds one `SatRec` per satellite (OMM is its own README's
 * "preferred" input, not `twoline2satrec` + hand-built TLE lines), then `computePositions` propagates every
 * entry to a given moment via real SGP4 — the same algorithm every satellite tracker uses, not a simulated
 * drift.
 */

export interface StarlinkOmmRecord {
  name: string;
  objectId: string;
  noradCatId: number;
  epoch: string;
  meanMotion: number;
  eccentricity: number;
  inclination: number;
  raOfAscNode: number;
  argOfPericenter: number;
  meanAnomaly: number;
  bstar: number;
  meanMotionDot: number;
  meanMotionDdot: number;
  elementSetNo: number;
}

export interface StarshipLaunch {
  name: string;
  net: string;
  status: string;
  statusAbbrev: string;
  provider: string;
  rocket: string;
  padName: string;
  locationName: string;
  lat: number | null;
  lon: number | null;
  webcastLive: boolean;
}

export interface StarlinkSatEntry {
  name: string;
  noradCatId: number;
  satrec: satellite.SatRec;
}

export interface StarlinkPosition {
  name: string;
  noradCatId: number;
  lat: number;
  lon: number;
  altKm: number;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);

/** Submits a spacex:* operation and polls it to completion — the same pattern every other live view in this app uses (see fetchThreatFeed in earth-map.tsx). */
async function runSpacexJob(operationId: 'starlink-elements' | 'starship-launches', label: string): Promise<unknown> {
  const job = await apiRequest<Job>('/jobs', post({ toolId: 'spacex', operationId, input: {} }));
  let current = job;
  for (let i = 0; i < 90 && !FINAL.has(current.status) && current.status !== 'AWAITING_APPROVAL'; i++) {
    await sleep(1000);
    current = await apiRequest<Job>(`/jobs/${job.id}`);
  }
  if (current.status !== 'SUCCEEDED') throw new Error(current.status === 'FAILED' ? (current.error ?? `${label} job failed`) : `${label} job did not complete (${current.status.toLowerCase()})`);
  return current.result;
}

export async function fetchStarlinkElements(): Promise<{ items: StarlinkOmmRecord[]; fetchedAt: string }> {
  const result = (await runSpacexJob('starlink-elements', 'Starlink orbital elements')) as { items?: unknown[]; fetchedAt?: string } | null;
  const items = Array.isArray(result?.items) ? (result.items as StarlinkOmmRecord[]) : [];
  return { items, fetchedAt: typeof result?.fetchedAt === 'string' ? result.fetchedAt : new Date().toISOString() };
}

export async function fetchStarshipLaunches(): Promise<StarshipLaunch[]> {
  const result = (await runSpacexJob('starship-launches', 'Starship launches')) as { items?: unknown[] } | null;
  return Array.isArray(result?.items) ? (result.items as StarshipLaunch[]) : [];
}

/**
 * Builds one satrec per record via `json2satrec` (OMM input — sidesteps classic TLE's 5-character
 * catalog-number field, which can't hold the 6-digit NORAD IDs CelesTrak has issued since 2026-07-11).
 * Skips (and counts) any record SGP4 itself flags invalid rather than failing the whole batch over one bad
 * element set.
 */
export function buildSatrecs(items: StarlinkOmmRecord[]): { entries: StarlinkSatEntry[]; skipped: number } {
  const entries: StarlinkSatEntry[] = [];
  let skipped = 0;
  for (const r of items) {
    const satrec = satellite.json2satrec({
      OBJECT_NAME: r.name,
      OBJECT_ID: r.objectId,
      NORAD_CAT_ID: r.noradCatId,
      EPOCH: r.epoch,
      MEAN_MOTION: r.meanMotion,
      ECCENTRICITY: r.eccentricity,
      INCLINATION: r.inclination,
      RA_OF_ASC_NODE: r.raOfAscNode,
      ARG_OF_PERICENTER: r.argOfPericenter,
      MEAN_ANOMALY: r.meanAnomaly,
      BSTAR: r.bstar,
      MEAN_MOTION_DOT: r.meanMotionDot,
      MEAN_MOTION_DDOT: r.meanMotionDdot,
      ELEMENT_SET_NO: r.elementSetNo,
    });
    if (satrec.error !== 0) {
      skipped++;
      continue;
    }
    entries.push({ name: r.name, noradCatId: r.noradCatId, satrec });
  }
  return { entries, skipped };
}

/** Propagates every entry to `at` via real SGP4 and converts to geodetic lat/lon/alt. Skips (and counts) any entry SGP4 can't propagate right now (e.g. decayed) rather than crashing the whole batch. */
export function computePositions(entries: StarlinkSatEntry[], at: Date): { positions: StarlinkPosition[]; skipped: number } {
  const gmst = satellite.gstime(at);
  const positions: StarlinkPosition[] = [];
  let skipped = 0;
  for (const e of entries) {
    const pv = satellite.propagate(e.satrec, at);
    const position = pv?.position;
    if (!position || typeof position !== 'object') {
      skipped++;
      continue;
    }
    const geo = satellite.eciToGeodetic(position, gmst);
    positions.push({
      name: e.name,
      noradCatId: e.noradCatId,
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      altKm: geo.height,
    });
  }
  return { positions, skipped };
}
