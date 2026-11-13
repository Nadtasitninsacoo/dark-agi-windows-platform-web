'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { AttributionControl, Map as MapLibreMap, Marker, NavigationControl, ScaleControl } from 'maplibre-gl';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';

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
 */

interface LayerDef {
  label: string;
  gibsId: string;
  format: 'jpg' | 'png';
  tileMatrixSet: string;
  maxZoom: number;
  resolution: string;
  source: string;
}

type LayerKey = 'daily' | 'highres';

const LAYERS: Record<LayerKey, LayerDef> = {
  daily: {
    label: 'Daily (MODIS Terra, true color)',
    gibsId: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    resolution: '~250m/pixel',
    source: 'NASA GIBS / MODIS Terra',
  },
  highres: {
    label: 'High-res (HLS: Sentinel-2 / Landsat)',
    gibsId: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level12',
    maxZoom: 12,
    resolution: '~10-30m/pixel',
    source: 'NASA GIBS / Harmonized Landsat-Sentinel',
  },
};

function tileUrl(layer: LayerKey, date: string): string {
  const l = LAYERS[layer];
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.gibsId}/default/${date}/${l.tileMatrixSet}/{z}/{y}/{x}.${l.format}`;
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const SOURCE_ID = 'dagi-satellite';
const LAYER_ID = 'dagi-satellite-layer';

export function EarthMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const [layer, setLayer] = useState<LayerKey>('daily');
  const [date, setDate] = useState(yesterdayUtc());
  const [zoom, setZoom] = useState(2);
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null);

  // Create the map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [101.5, 13],
      zoom: 2,
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
    const apply = () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      map.addSource(SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl(layer, date)],
        tileSize: 256,
        maxzoom: LAYERS[layer].maxZoom,
        attribution: LAYERS[layer].source,
      });
      map.addLayer({ id: LAYER_ID, type: 'raster', source: SOURCE_ID });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [layer, date]);

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
      mapRef.current?.flyTo({ center: [lon, lat], zoom: 10 });
      markerRef.current?.remove();
      if (mapRef.current) markerRef.current = new Marker({ color: '#2ee88f' }).setLngLat([lon, lat]).addTo(mapRef.current);
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
          <div className="flex items-center gap-1.5 text-[11px]">
            {(Object.keys(LAYERS) as LayerKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setLayer(k)}
                className={`rounded border px-2 py-1 font-medium ${layer === k ? 'border-accent-strong bg-accent-strong/20 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
              >
                {LAYERS[k].label}
              </button>
            ))}
          </div>
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
        </div>

        {searchError ? <p className="mb-2 text-[11px] text-critical">{searchError}</p> : null}
        {resolvedPlace ? <p className="mb-2 text-[11px] text-ink-2">Found: <span className="text-violet">{resolvedPlace}</span></p> : null}

        <div className="relative h-[70vh] min-h-96 overflow-hidden rounded-lg border border-edge-strong">
          <div ref={containerRef} className="h-full w-full" />
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
        </div>

        <p className="mt-2 text-[10.5px] text-ink-3">
          A calendar date doesn&apos;t guarantee an image exists for every tile at every zoom — NASA&apos;s satellites don&apos;t re-image the whole planet instantly, and some tiles (especially High-res, which isn&apos;t daily) may render blank for a given date/location. That is a real, honest &quot;no imagery available,&quot; not a loading bug.
        </p>
      </div>
    </div>
  );
}
