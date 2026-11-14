'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css';
import { AttributionControl, Map as MapLibreMap, Marker, NavigationControl, Popup, ScaleControl } from 'maplibre-gl';
import Compare from '@maplibre/maplibre-gl-compare';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { apiRequest, type Job } from '@/lib/api/client';

/**
 * Milestone 1 of the "Global Earth Observation Engine" (docs/agi-research/mission-07): a real, pannable,
 * zoomable map of actual NASA satellite imagery — not a static snapshot image like `sat:view`/`sat:viewhd`.
 * Tiles are fetched directly by the browser from NASA's public GIBS WMTS service (the same tile source
 * NASA's own Worldview website uses), never proxied through a job — there is nothing here for the job
 * queue/audit log to record, the same way loading any other public map tile isn't a "job."
 *
 * Verified live while building this (2026-11-14): fetched real tiles for both layers directly.
 * - Daily (MODIS Terra true color): tile matrix set `GoogleMapsCompatible_Level9`, format JPEG, real max
 *   zoom 9 (matches its ~250m/pixel native resolution) — zoom 10 returns HTTP 400.
 * - High-res (HLS: Sentinel-2/Landsat): tile matrix set `GoogleMapsCompatible_Level12` (NOT "Level13" —
 *   guessed wrong once, found the real name in GIBS's own GetCapabilities XML), format PNG, real max zoom
 *   12 (matches its ~10-30m/pixel native resolution).
 * Past each layer's native max zoom, MapLibre's default raster behavior is to upscale the last real tile —
 * this page says so visibly (`zoom > layer.maxZoom`) rather than letting a blurry enlarged tile pass as new
 * detail, per the mission brief's own rule against that.
 *
 * Search is forward-geocoding via OpenStreetMap's free Nominatim (no API key), called directly from the
 * browser — the same public service embedded in many map demos' search boxes. `resolvedPlace` shows
 * Nominatim's own matched name, not just the text the user typed.
 *
 * Optional "Cyber threats" overlay: real, currently-tracked botnet C2 server locations from the backend's
 * `threat-feed:active-c2-servers` operation (abuse.ch Feodo Tracker + IP geolocation) — a toggle, not
 * auto-refreshing, since the underlying feed changes slowly and geolocation has its own free-tier rate
 * limit. Deliberately NOT styled as a dramatic "live global cyberattack" globe: this is a small, real,
 * independently-verifiable list (Emotet/QakBot-family C2 IPs specifically), and the popup for each marker
 * says so plainly rather than implying it's a comprehensive real-time threat map.
 *
 * Milestone 3 (historical comparison): a "Compare dates" mode swaps the single map for two real MapLibre
 * maps wired together with the official `@maplibre/maplibre-gl-compare` plugin (camera-synced pan/zoom, a
 * drag-to-swipe clip divider) — each side independently date-pickable, same layer, same location. Both
 * sides fetch real tiles the same way the single map does; there is no synthetic "estimated change"
 * rendering here, just two real images side by side.
 *
 * Milestone 2 (a second provider): "Cloudless mosaic" (EOX's Sentinel-2 cloudless, s2maps.eu/cloudless.eox.at).
 * Investigated Copernicus Data Space's own STAC catalogue first (the blueprint's named Provider B): its
 * search API is free and public, and a real `sentinel-2-l2a` collection exists with real scenes — but the
 * actual full-resolution imagery (`TCI_10m` etc.) requires an OIDC OAuth2 credential to download, which
 * this platform has no secret-injection path for yet (the same gap already flagged for
 * VirusTotal/MISP/a real NASA API key). Only a tiny 343x343 "quicklook" thumbnail per scene is public — not
 * usable as map tiles. EOX's cloudless mosaic needed no such credential and gave real zoomable XYZ tiles,
 * confirmed by fetching GIBS's... no, EOX's own GetCapabilities XML directly (not guessed): real max zoom
 * 14 (tile size shrinks sharply past it — confirmed live, 200 OK at every zoom tested but the content
 * clearly stops carrying new detail past z14, matching its ~10m/pixel native resolution). License is CC
 * BY-NC-SA 4.0 (non-commercial) — attributed as such in the UI, per the mission brief's own "respect
 * provider terms and licensing" rule. It is an ANNUAL cloud-free composite (one layer per year, 2017-2025
 * confirmed live), not a specific acquisition date — so this layer swaps the day-date picker for a year
 * picker, and in Compare mode defaults to comparing 2017 vs. 2025: real, 8-year land-cover change, not an
 * estimate.
 */

interface DailyLayerDef {
  provider: 'gibs';
  temporal: 'daily';
  label: string;
  gibsId: string;
  format: 'jpg' | 'png';
  tileMatrixSet: string;
  maxZoom: number;
  resolution: string;
  source: string;
}

interface AnnualLayerDef {
  provider: 'eox';
  temporal: 'annual';
  label: string;
  years: string[];
  defaultYear: string;
  maxZoom: number;
  resolution: string;
  source: string;
  attribution: string;
}

type LayerDef = DailyLayerDef | AnnualLayerDef;
type LayerKey = 'daily' | 'highres' | 'cloudless';

const EOX_YEARS = ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

// `satisfies` instead of a `: Record<LayerKey, LayerDef>` annotation, so LAYERS.cloudless etc. keep their
// own specific (AnnualLayerDef) type for indexed access below, while still being checked against the union.
const LAYERS = {
  daily: {
    provider: 'gibs',
    temporal: 'daily',
    label: 'Daily (MODIS Terra, true color)',
    gibsId: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    resolution: '~250m/pixel',
    source: 'NASA GIBS / MODIS Terra',
  },
  highres: {
    provider: 'gibs',
    temporal: 'daily',
    label: 'High-res (HLS: Sentinel-2 / Landsat)',
    gibsId: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level12',
    maxZoom: 12,
    resolution: '~10-30m/pixel',
    source: 'NASA GIBS / Harmonized Landsat-Sentinel',
  },
  cloudless: {
    provider: 'eox',
    temporal: 'annual',
    label: 'Cloudless mosaic (EOX Sentinel-2, by year)',
    years: EOX_YEARS,
    defaultYear: EOX_YEARS[EOX_YEARS.length - 1]!,
    maxZoom: 14,
    resolution: '~10m/pixel (annual composite, not a specific date)',
    source: 'EOX IT Services GmbH / s2maps.eu — CC BY-NC-SA 4.0, non-commercial',
    attribution: 'Sentinel-2 cloudless by EOX IT Services GmbH (s2maps.eu) — contains modified Copernicus Sentinel data — CC BY-NC-SA 4.0',
  },
} satisfies Record<LayerKey, LayerDef>;

/** `dateOrYear` is a yyyy-mm-dd date for the two GIBS layers, or a bare yyyy year for the EOX annual mosaic. */
function tileUrl(layer: LayerKey, dateOrYear: string): string {
  const l = LAYERS[layer];
  if (l.provider === 'eox') return `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${dateOrYear}_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg`;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.gibsId}/default/${dateOrYear}/${l.tileMatrixSet}/{z}/{y}/{x}.${l.format}`;
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBeforeTodayUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** How many whole days back (UTC) a yyyy-mm-dd date string is from today — the inverse of daysBeforeTodayUtc. */
function daysBackOf(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.round(ms / 86_400_000);
}

/** Standard Web Mercator lon/lat -> tile x/y at a given zoom (the same math every XYZ/WMTS map client uses). */
function lonLatToTile(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

const COVERAGE_PROBE_ZOOM = 10;
const COVERAGE_MAX_DAYS_BACK = 20;
/** A real High-res tile with imagery is ~150-900KB; NASA's own "no data for this date" response is a small 404 (~200 bytes) — confirmed live while building this. */
const MIN_REAL_TILE_BYTES = 5000;

/**
 * Finds the most recent date (within the last 20 days) that the High-res layer actually has a real tile
 * for, at the searched location — by really fetching each candidate date's tile and checking it, the same
 * day-by-day technique `earth-imagery:high-res-view` (backend) already uses, not a guess. Stops at the
 * first real hit. Returns null if none of the last 20 days had coverage for this exact spot.
 */
async function findRecentHighResDate(lon: number, lat: number, startDaysBack = 1): Promise<string | null> {
  const { x, y } = lonLatToTile(lon, lat, COVERAGE_PROBE_ZOOM);
  const l = LAYERS.highres;
  for (let i = startDaysBack; i <= COVERAGE_MAX_DAYS_BACK; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.gibsId}/default/${dateStr}/${l.tileMatrixSet}/${COVERAGE_PROBE_ZOOM}/${y}/${x}.${l.format}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const len = Number(res.headers.get('content-length') ?? '0');
        if (len === 0 || len >= MIN_REAL_TILE_BYTES) return dateStr;
      }
    } catch {
      // A transient network hiccup on one day's probe -- just try the next day back.
    }
  }
  return null;
}

const SOURCE_ID = 'dagi-satellite';
const LAYER_ID = 'dagi-satellite-layer';

/** Shared by the single map and both sides of the Compare view -- adds/replaces one map's satellite raster source+layer. */
function applySatelliteLayer(map: MapLibreMap, layer: LayerKey, dateOrYear: string, sourceId: string, layerId: string): void {
  const l = LAYERS[layer];
  const run = () => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    map.addSource(sourceId, {
      type: 'raster',
      tiles: [tileUrl(layer, dateOrYear)],
      tileSize: 256,
      maxzoom: l.maxZoom,
      attribution: l.provider === 'eox' ? l.attribution : l.source,
    });
    map.addLayer({ id: layerId, type: 'raster', source: sourceId });
  };
  if (map.isStyleLoaded()) run();
  else map.once('load', run);
}

/** Mirrors the backend's TrackedC2Server shape (threat-feed.ts) without importing the backend package. */
interface TrackedC2Server {
  ip: string;
  port: number;
  malwareFamily: string;
  status: 'online' | 'offline' | string;
  firstSeen: string;
  lastOnline: string;
  country: string;
  asName: string;
  lat: number | null;
  lon: number | null;
  city: string | null;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);

/** Submits threat-feed:active-c2-servers and polls it to completion, the same pattern every other live view in this app uses. */
async function fetchThreatFeed(): Promise<TrackedC2Server[]> {
  const job = await apiRequest<Job>('/jobs', post({ toolId: 'threat-feed', operationId: 'active-c2-servers', input: {} }));
  let current = job;
  for (let i = 0; i < 30 && !FINAL.has(current.status) && current.status !== 'AWAITING_APPROVAL'; i++) {
    await sleep(1000);
    current = await apiRequest<Job>(`/jobs/${job.id}`);
  }
  if (current.status !== 'SUCCEEDED') throw new Error(current.status === 'FAILED' ? (current.error ?? 'threat-feed job failed') : `threat-feed job did not complete (${current.status.toLowerCase()})`);
  const items = (current.result as { items?: unknown[] } | null)?.items;
  return Array.isArray(items) ? (items as TrackedC2Server[]) : [];
}

export function EarthMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const threatMarkersRef = useRef<Marker[]>([]);

  const [layer, setLayer] = useState<LayerKey>('daily');
  const [date, setDate] = useState(yesterdayUtc());
  const [zoom, setZoom] = useState(2);
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [coverageNote, setCoverageNote] = useState<string | null>(null);
  const [threatsOn, setThreatsOn] = useState(false);
  const [threatsLoading, setThreatsLoading] = useState(false);
  const [threatsError, setThreatsError] = useState<string | null>(null);
  const [threats, setThreats] = useState<TrackedC2Server[] | null>(null);

  // Milestone 3 — Compare dates (two real maps, synced pan/zoom, swipe divider).
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const mapAContainerRef = useRef<HTMLDivElement>(null);
  const mapBContainerRef = useRef<HTMLDivElement>(null);
  const mapARef = useRef<MapLibreMap | null>(null);
  const mapBRef = useRef<MapLibreMap | null>(null);
  const compareRef = useRef<Compare | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [dateA, setDateA] = useState(yesterdayUtc());
  const [dateB, setDateB] = useState(yesterdayUtc());

  // Create the map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [101.5, 13],
      zoom: 2,
      minZoom: 1.5,
      // One world, not repeated copies side by side when zoomed out -- the default (true) is what made a
      // zoomed-out view look like several duplicate Earths tiled next to each other, which reads as broken.
      renderWorldCopies: false,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(
      new AttributionControl({ customAttribution: 'Imagery © NASA EOSDIS GIBS · Search via OpenStreetMap Nominatim' }),
      'bottom-right',
    );
    map.on('zoom', () => setZoom(map.getZoom()));
    map.on('mousemove', (e) => setCursor({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuild the satellite raster source/layer whenever the chosen layer or date changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applySatelliteLayer(map, layer, date, SOURCE_ID, LAYER_ID);
  }, [layer, date]);

  // Plot (or clear) the real C2-server markers whenever the data or the toggle changes.
  useEffect(() => {
    for (const m of threatMarkersRef.current) m.remove();
    threatMarkersRef.current = [];
    const map = mapRef.current;
    if (!map || !threatsOn || !threats) return;
    for (const t of threats) {
      if (t.lat === null || t.lon === null) continue;
      const el = document.createElement('div');
      el.className = 'size-2.5 rounded-full border border-canvas';
      el.style.backgroundColor = t.status === 'online' ? '#ff3b5c' : '#6b7577';
      if (t.status === 'online') el.style.animation = 'dagi-ring-flash-critical 1.6s ease-out infinite';
      const popup = new Popup({ offset: 10, closeButton: true }).setHTML(
        `<div style="font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1.5;">
           <strong>${t.ip}</strong> (${t.status})<br/>
           Malware: ${t.malwareFamily} · port ${t.port}<br/>
           ${t.city ? t.city + ', ' : ''}${t.country}${t.asName ? ' · ' + t.asName : ''}<br/>
           First seen ${t.firstSeen} · last online ${t.lastOnline}<br/>
           <span style="opacity:0.7">Source: abuse.ch Feodo Tracker — a real, narrow feed (specific malware families), not a comprehensive attack map.</span>
         </div>`,
      );
      threatMarkersRef.current.push(new Marker({ element: el }).setLngLat([t.lon, t.lat]).setPopup(popup).addTo(map));
    }
  }, [threats, threatsOn]);

  const toggleThreats = async () => {
    if (threatsOn) {
      setThreatsOn(false);
      return;
    }
    setThreatsOn(true);
    if (threats) return; // Already loaded this session -- the feed doesn't change fast enough to need refetching just for re-showing it.
    setThreatsLoading(true);
    setThreatsError(null);
    try {
      setThreats(await fetchThreatFeed());
    } catch (err) {
      setThreatsError(err instanceof Error ? err.message : 'Failed to load the threat feed');
      setThreatsOn(false);
    } finally {
      setThreatsLoading(false);
    }
  };

  const refreshThreats = async () => {
    setThreatsLoading(true);
    setThreatsError(null);
    try {
      setThreats(await fetchThreatFeed());
    } catch (err) {
      setThreatsError(err instanceof Error ? err.message : 'Failed to load the threat feed');
    } finally {
      setThreatsLoading(false);
    }
  };

  // Enter/exit Compare mode: create (or tear down) the two synced maps + swipe divider.
  useEffect(() => {
    if (!compareOn) {
      compareRef.current?.remove();
      compareRef.current = null;
      mapARef.current?.remove();
      mapARef.current = null;
      mapBRef.current?.remove();
      mapBRef.current = null;
      return;
    }
    if (!mapAContainerRef.current || !mapBContainerRef.current || !compareContainerRef.current) return;
    const base = mapRef.current;
    const center = base ? base.getCenter() : { lng: 101.5, lat: 13 };
    const startZoom = base ? base.getZoom() : 2;
    const mapOptions = { center: [center.lng, center.lat] as [number, number], zoom: startZoom, minZoom: 1.5, renderWorldCopies: false, attributionControl: false as const, style: { version: 8 as const, sources: {}, layers: [] } };
    const mapA = new MapLibreMap({ container: mapAContainerRef.current, ...mapOptions });
    const mapB = new MapLibreMap({ container: mapBContainerRef.current, ...mapOptions });
    mapA.addControl(new AttributionControl({ customAttribution: 'Imagery © NASA EOSDIS GIBS' }), 'bottom-left');
    applySatelliteLayer(mapA, layer, dateA, 'dagi-compare-a', 'dagi-compare-a-layer');
    applySatelliteLayer(mapB, layer, dateB, 'dagi-compare-b', 'dagi-compare-b-layer');
    mapARef.current = mapA;
    mapBRef.current = mapB;
    compareRef.current = new Compare(mapA, mapB, compareContainerRef.current, {});
    return () => {
      compareRef.current?.remove();
      compareRef.current = null;
      mapA.remove();
      mapB.remove();
      mapARef.current = null;
      mapBRef.current = null;
    };
    // Only (re)create on entering/leaving Compare mode -- layer/date changes update the existing maps in place (below), not recreate them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareOn]);

  // Update each side's imagery in place when its date (or the shared layer) changes, without recreating the maps.
  useEffect(() => {
    if (!compareOn || !mapARef.current) return;
    applySatelliteLayer(mapARef.current, layer, dateA, 'dagi-compare-a', 'dagi-compare-a-layer');
  }, [compareOn, layer, dateA]);
  useEffect(() => {
    if (!compareOn || !mapBRef.current) return;
    applySatelliteLayer(mapBRef.current, layer, dateB, 'dagi-compare-b', 'dagi-compare-b-layer');
  }, [compareOn, layer, dateB]);

  const toggleCompare = async () => {
    if (compareOn) {
      setCompareOn(false);
      return;
    }
    setCompareOn(true);
    if (layer === 'cloudless') {
      // The most dramatic real comparison this layer can show: its oldest vs. its newest real annual mosaic.
      setDateA(EOX_YEARS[0]!);
      setDateB(LAYERS.cloudless.defaultYear);
    } else if (layer === 'highres') {
      const center = mapRef.current?.getCenter();
      if (center) {
        setCompareLoading(true);
        try {
          const newer = await findRecentHighResDate(center.lng, center.lat);
          if (newer) {
            setDateB(newer);
            const older = await findRecentHighResDate(center.lng, center.lat, daysBackOf(newer) + 1);
            setDateA(older ?? newer);
          }
        } finally {
          setCompareLoading(false);
        }
      }
    } else {
      setDateB(yesterdayUtc());
      setDateA(daysBeforeTodayUtc(30));
    }
  };

  /** Switches layers, resetting date/dateA/dateB to a sensible default only when crossing the daily<->annual boundary (a bare year isn't a valid date for the other two layers, and vice versa). */
  const selectLayer = (k: LayerKey) => {
    const wasAnnual = LAYERS[layer].temporal === 'annual';
    const willAnnual = LAYERS[k].temporal === 'annual';
    if (wasAnnual !== willAnnual) {
      if (willAnnual) {
        setDate(LAYERS.cloudless.defaultYear);
        setDateA(EOX_YEARS[0]!);
        setDateB(LAYERS.cloudless.defaultYear);
      } else {
        setDate(yesterdayUtc());
        setDateA(daysBeforeTodayUtc(30));
        setDateB(yesterdayUtc());
      }
    }
    setLayer(k);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
      if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      const hit = data[0];
      if (!hit) {
        setSearchError(`No location found for "${q}"`);
        setResolvedPlace(null);
        return;
      }
      const lat = Number(hit.lat);
      const lon = Number(hit.lon);
      setResolvedPlace(hit.display_name);
      markerRef.current?.remove();
      if (mapRef.current) markerRef.current = new Marker({ color: '#2ee88f' }).setLngLat([lon, lat]).addTo(mapRef.current);

      // A search is exactly when the sharpest real imagery available matters most -- check for it for
      // real (fetching candidate dates, not guessing) rather than landing on MODIS's much blurrier daily
      // composite by default.
      setCoverageNote(null);
      setCheckingCoverage(true);
      const coverageDate = await findRecentHighResDate(lon, lat);
      setCheckingCoverage(false);
      if (coverageDate) {
        setLayer('highres');
        setDate(coverageDate);
        mapRef.current?.flyTo({ center: [lon, lat], zoom: LAYERS.highres.maxZoom });
        setCoverageNote(`Showing real High-res imagery from ${coverageDate} — the most recent date with actual coverage here in the last ${COVERAGE_MAX_DAYS_BACK} days.`);
      } else {
        setLayer('daily');
        setDate(yesterdayUtc());
        mapRef.current?.flyTo({ center: [lon, lat], zoom: LAYERS.daily.maxZoom });
        setCoverageNote(`No real High-res tile found here in the last ${COVERAGE_MAX_DAYS_BACK} days — showing the Daily (MODIS) layer instead.`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setResolvedPlace(null);
    } finally {
      setSearching(false);
    }
  };

  const active = LAYERS[layer];
  const overZoomed = zoom > active.maxZoom + 0.3;

  return (
    <div>
      <title>Earth Observatory · DARK AGI</title>
      <PageHeader
        title="Earth Observatory"
        summary="A real, pannable/zoomable map of actual NASA satellite imagery (NASA EOSDIS GIBS — the same source NASA's own Worldview website uses). Not live video: a daily composite, like every public satellite map."
      />
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!compareOn ? (
            <form onSubmit={(e) => void handleSearch(e)} className="flex min-w-64 flex-1 items-center gap-1.5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any place (city, country, landmark)…"
                aria-label="Search for a place"
                className="w-full rounded border border-edge-strong bg-canvas px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-3"
              />
              <button type="submit" disabled={searching || !query.trim()} className="shrink-0 rounded border border-accent-strong bg-accent-strong/90 px-3 py-1.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>
          ) : null}
          <div className="flex items-center gap-1.5 text-[11px]">
            {(Object.keys(LAYERS) as LayerKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => selectLayer(k)}
                className={`rounded border px-2 py-1 font-medium ${layer === k ? 'border-accent-strong bg-accent-strong/20 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
              >
                {LAYERS[k].label}
              </button>
            ))}
          </div>
          {!compareOn ? (
            <>
              {LAYERS[layer].temporal === 'annual' ? (
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  Year
                  <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink">
                    {EOX_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  Date
                  <input
                    type="date"
                    value={date}
                    max={yesterdayUtc()}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => void toggleThreats()}
                disabled={threatsLoading}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${threatsOn ? 'border-critical/60 bg-critical/15 text-critical' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
                title="Real, currently-tracked botnet C2 server IPs (abuse.ch Feodo Tracker) — a narrow real feed, not a comprehensive attack map"
              >
                <span className={`size-1.5 rounded-full ${threatsOn ? 'bg-critical' : 'bg-ink-3'}`} style={threatsOn ? { animation: 'dagi-ring-flash-critical 1.6s ease-out infinite' } : undefined} aria-hidden />
                {threatsLoading ? 'Loading…' : threatsOn ? 'Cyber threats: on' : 'Cyber threats'}
              </button>
              {threatsOn && threats ? (
                <button type="button" onClick={() => void refreshThreats()} disabled={threatsLoading} className="rounded border border-edge-strong px-2 py-1 text-[11px] text-ink-2 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60">
                  Refresh
                </button>
              ) : null}
            </>
          ) : LAYERS[layer].temporal === 'annual' ? (
            <>
              <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                Left (older)
                <select value={dateA} onChange={(e) => setDateA(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink">
                  {EOX_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                Right (newer)
                <select value={dateB} onChange={(e) => setDateB(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink">
                  {EOX_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                Left (older)
                <input type="date" value={dateA} max={yesterdayUtc()} onChange={(e) => setDateA(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink" />
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                Right (newer)
                <input type="date" value={dateB} max={yesterdayUtc()} onChange={(e) => setDateB(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-1 text-[12px] text-ink" />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => void toggleCompare()}
            className={`ml-auto rounded border px-2 py-1 text-[11px] font-medium ${compareOn ? 'border-accent-strong bg-accent-strong/20 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
            title="Compare the same place at two different real dates, side by side with a swipe divider"
          >
            {compareOn ? 'Exit compare' : 'Compare dates'}
          </button>
        </div>

        {searchError ? <p className="mb-2 text-[11px] text-critical">{searchError}</p> : null}
        {resolvedPlace ? <p className="mb-2 text-[11px] text-ink-2">Found: <span className="text-violet">{resolvedPlace}</span></p> : null}
        {checkingCoverage ? <p className="mb-2 text-[11px] text-ink-2">Checking the last {COVERAGE_MAX_DAYS_BACK} days for real High-res coverage here…</p> : null}
        {coverageNote ? <p className="mb-2 text-[11px] text-good">{coverageNote}</p> : null}
        {threatsError ? <p className="mb-2 text-[11px] text-critical">{threatsError}</p> : null}
        {threatsOn && threats ? (
          <p className="mb-2 text-[11px] text-ink-3">
            {threats.length} real tracked C2 {threats.length === 1 ? 'server' : 'servers'} (abuse.ch Feodo Tracker — Emotet/QakBot-family only, not a comprehensive attack map) ·{' '}
            <span className="text-critical">●</span> online <span className="text-ink-3">●</span> offline
          </p>
        ) : null}
        {compareOn && compareLoading ? <p className="mb-2 text-[11px] text-ink-2">Checking for two distinct real High-res dates at this location…</p> : null}
        {compareOn && !compareLoading ? (
          <p className="mb-2 text-[11px] text-ink-3">Drag the divider to compare — both sides are real {LAYERS[layer].label} imagery, independently dated, panned/zoomed together.</p>
        ) : null}

        <div className="relative h-[70vh] min-h-96 overflow-hidden rounded-lg border border-edge-strong">
          <div ref={containerRef} className={`h-full w-full ${compareOn ? 'hidden' : ''}`} />
          <div ref={compareContainerRef} className={`relative h-full w-full ${compareOn ? '' : 'hidden'}`}>
            <div ref={mapAContainerRef} className="absolute inset-0 h-full w-full" />
            <div ref={mapBContainerRef} className="absolute inset-0 h-full w-full" />
          </div>
          {!compareOn ? (
            <>
              <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
                <span className="rounded bg-panel/90 px-2 py-1 text-[10.5px] text-ink-2">
                  {active.label} · native resolution {active.resolution} · native max zoom {active.maxZoom} · date {date}
                </span>
                {overZoomed ? (
                  <span className="rounded bg-warning/15 px-2 py-1 text-[10.5px] font-medium text-warning">
                    Zoomed past this layer&apos;s real resolution — the image is upscaled here, not sharper. Real detail stops at zoom {active.maxZoom}.
                  </span>
                ) : null}
              </div>
              <div className="pointer-events-none absolute bottom-8 left-2 rounded bg-panel/90 px-2 py-1 text-[10.5px] text-ink-3">
                zoom {zoom.toFixed(1)}
                {cursor ? ` · ${cursor.lat.toFixed(4)}, ${cursor.lon.toFixed(4)}` : null}
              </div>
            </>
          ) : (
            <>
              <span className="pointer-events-none absolute left-2 top-2 rounded bg-panel/90 px-2 py-1 text-[10.5px] text-ink-2">Left: {dateA}</span>
              <span className="pointer-events-none absolute right-2 top-2 rounded bg-panel/90 px-2 py-1 text-[10.5px] text-ink-2">Right: {dateB}</span>
            </>
          )}
        </div>

        <p className="mt-2 text-[10.5px] text-ink-3">
          A calendar date doesn&apos;t guarantee an image exists for every tile at every zoom — NASA&apos;s satellites don&apos;t re-image the whole planet instantly, and some tiles (especially High-res, which isn&apos;t daily) may render blank for a given date/location. That is a real, honest &quot;no imagery available,&quot; not a loading bug. The Cloudless mosaic layer is a different kind of real: one real composite per year (not a specific acquisition date), from EOX IT Services (s2maps.eu), licensed CC BY-NC-SA 4.0 — non-commercial use only.
        </p>
      </div>
    </div>
  );
}
