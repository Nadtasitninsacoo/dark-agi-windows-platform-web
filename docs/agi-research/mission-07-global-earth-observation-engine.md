# MISSION 07 — GLOBAL EARTH OBSERVATION ENGINE

Pasted verbatim from the user on 2026-11-14. NOT STARTED — explicitly deferred by the user ("เสร็จงานนี้ก็พอก่อน ... เรื่อง AGI ที่เราทำค้างไว้ และตัวล่าสุดที่ผมส่งรายละเอียดให้ พรุ่งนี้ค่อยมาต่อกัน" — finish today's scoped task, continue this one tomorrow). Only one small, real slice of it was built today (see "What's already real" below) — everything else in this file is still just the blueprint.

Context this mission assumes but was written without seeing: `earth-imagery:daily-view` and `earth-imagery:high-res-view` (real, shipped, live-verified operations under `src/execution/operations/` in the backend) already do a meaningful slice of what this blueprint calls Milestone 1 — NASA GIBS imagery (MODIS daily + HLS/Sentinel-Landsat high-res), any lat/lon worldwide, honest no-data handling, real acquisition date reporting, real resolution disclosure. Phase 0 of this mission (per its own "FIRST DIRECTIVE") should start by inspecting that code, not assuming a blank slate.

---

# DARK AGI — GLOBAL EARTH OBSERVATION ENGINE
## Engineering Blueprint & Implementation Directive

You are the Principal Geospatial Architect, Satellite Data Engineer, Backend Architect, GIS Specialist, and Senior Full-Stack Engineer.

Your mission is to design and implement a real global satellite observation system inside the existing DARK AGI platform.

The primary objective:

**A user must be able to select ANY geographic location on Earth and discover, retrieve, display, and analyze the actual satellite imagery available for that location and date.**

This includes countries, cities, islands, oceans, forests, deserts, mountains, rural areas, and remote geographic regions.

This is a global observation platform, not a country-specific map.

---

# 1. CORE SYSTEM REQUIREMENTS

The system must support:

- Global geographic search.
- Arbitrary latitude and longitude.
- Interactive global map.
- Satellite imagery retrieval.
- Historical imagery discovery.
- Date-based imagery search.
- Multi-provider data aggregation.
- High-resolution imagery when available.
- Dynamic zoom and tile loading.
- Before/after comparison.
- AI-assisted geographical change analysis.
- Complete source provenance.

Do not simulate satellite imagery.

Do not use random images as satellite observations.

Do not claim that a map layer represents a specific acquisition date unless the provider confirms it.

# 2. GLOBAL GEOGRAPHIC SEARCH ENGINE

Allow users to search:

- Country.
- City.
- Region.
- Address.
- Island.
- Ocean.
- Forest.
- Mountain.
- Geographic coordinates.
- Latitude and longitude.
- Bounding box.
- Polygon area.

The system must convert the selected location into a standardized Area of Interest (AOI).

Recommended internal representation:

- Geometry: GeoJSON.
- Coordinate system: WGS84 (EPSG:4326).
- Spatial queries: Bounding Box and Polygon.
- Imagery footprint intersection.
- Date range filtering.

Do not limit searches to predefined geographic regions.

# 3. MULTI-PROVIDER SATELLITE DATA ENGINE

Implement a provider adapter architecture.

Required initial providers:

## Provider A — NASA GIBS / Worldview

Purpose:
- Global Earth imagery visualization.
- Daily observation layers.
- MODIS and VIIRS products.
- Environmental imagery.
- Cloud and atmospheric layers where available.
- Historical visualization.

Documentation:
https://nasa-gibs.github.io/gibs-api-docs/

https://worldview.earthdata.nasa.gov/

Implement provider-specific layer discovery, date handling, projection handling, and tile rendering.

## Provider B — Copernicus Data Space

Purpose:
- Sentinel-2 imagery discovery.
- Higher-resolution land observation.
- Historical imagery.
- Cloud coverage filtering.
- Image metadata and asset retrieval.

Use the current STAC endpoint:

https://stac.dataspace.copernicus.eu/v1/

Documentation:
https://documentation.dataspace.copernicus.eu/APIs/STAC.html

Search by:
- AOI geometry.
- Date interval.
- Collection.
- Cloud cover.
- Available assets.
- Acquisition timestamp.

Support Sentinel-2 L2A first.

## Provider C — USGS Landsat

Purpose:
- Historical land imagery.
- Surface monitoring.
- Long-term environmental analysis.
- Land-use change.

Investigate official catalog and access APIs.

## Provider D — Extensible Providers

Design the architecture to support future commercial providers and additional public satellite missions.

Do not hard-code a single provider into the application.

# 4. PROVIDER ADAPTER INTERFACE

Create a common typed interface.

Each provider must support capabilities appropriate to that provider:

- Search available observations.
- Retrieve observation metadata.
- Retrieve imagery or renderable assets.
- Return supported layers.
- Report spatial resolution.
- Report temporal coverage.
- Report cloud coverage when available.
- Report authentication requirements.
- Report usage and access restrictions.

Normalize results into one internal Observation model.

Every provider must report unsupported capabilities explicitly.

Never pretend that all providers offer the same imagery, resolution, or temporal coverage.

# 5. OBSERVATION DISCOVERY ENGINE

This is the most important backend component.

When a user selects a geographic location:

1. Receive the AOI.
2. Validate geographic coordinates.
3. Query all configured providers.
4. Search available imagery for the selected date range.
5. Match imagery footprints against the AOI.
6. Collect acquisition timestamps.
7. Collect spatial resolution.
8. Collect cloud coverage where available.
9. Collect processing level.
10. Rank usable observations.
11. Return a normalized result.

Provide search modes:

- Latest available.
- Today.
- Yesterday.
- Last 7 days.
- Last 30 days.
- Custom date range.
- Historical archive.

Important:

A selected calendar date does not guarantee that an image exists.

If no observation exists, return an explicit no-data result.

If the latest observation is older than the selected date, display its actual acquisition date.

Do not silently substitute imagery from another date.

# 6. GLOBAL IMAGERY RENDERING ENGINE

Use a proper geospatial map renderer.

Evaluate MapLibre GL JS for the frontend.

Documentation:
https://maplibre.org/maplibre-gl-js/docs/

Support:

- Raster tile sources.
- WMTS.
- WMS where appropriate.
- XYZ tiles.
- Provider-specific tile endpoints.
- GeoJSON overlays.
- Geographic footprints.
- Multiple map layers.
- Layer opacity.
- Dynamic tile loading.
- Tile caching.
- Error recovery.
- Attribution.

Use the projection and tile matrix supported by each provider.

Do not assume every provider uses the same projection or tile scheme.

Do not upscale a low-resolution tile and claim it provides new detail.

Display the real source resolution and maximum supported zoom.

# 7. DATE AND OBSERVATION TIMELINE

Build a real observation timeline.

The UI must show:

- Available observation dates.
- Satellite name.
- Instrument.
- Acquisition timestamp.
- Provider.
- Cloud coverage.
- Spatial resolution.
- Processing level.
- Observation quality.

Date controls:

TODAY
YESTERDAY
LAST 7 DAYS
LAST 30 DAYS
CUSTOM RANGE

Use timezone-aware timestamps.

Store acquisition time in UTC and convert it for display.

Clearly distinguish:
- Acquisition time.
- Processing time.
- Publication time.
- Retrieval time.

# 8. IMAGE QUALITY AND COVERAGE

Create a quality assessment service.

Consider:

- Spatial resolution.
- Cloud percentage.
- Cloud shadows.
- Missing pixels.
- Image footprint coverage.
- Acquisition date.
- Sensor quality.
- Processing level.

Allow users to filter observations by quality.

Do not compare images as if they were equivalent when they have incompatible spatial resolution, spectral bands, projections, or acquisition conditions.

# 9. HISTORICAL IMAGE COMPARISON

Implement:

- Side-by-side comparison.
- Before/after slider.
- Date selection.
- Image metadata comparison.
- Compatible spatial extent.
- Image alignment.
- Resolution information.

Preserve original observations.

Never overwrite original imagery with processed imagery.

# 10. AI GEOSPATIAL ANALYSIS

Implement AI-assisted analysis as a separate processing module.

Potential analysis:

- Vegetation change.
- Deforestation.
- Flood extent.
- Water body change.
- Urban expansion.
- Agricultural patterns.
- Coastal changes.
- Land surface changes.
- Thermal anomalies where supported.

Use appropriate geospatial and computer vision methods.

For every result provide:

- Input observation IDs.
- Analysis method.
- Model or algorithm version.
- Processing parameters.
- Confidence score.
- Geographic geometry.
- Original image references.
- Known limitations.

Distinguish:
- Observed changes.
- Possible explanations.
- AI hypotheses.
- Verified findings.

Do not infer human activity without adequate evidence.

# 11. BACKEND API DESIGN

Design typed API endpoints following the existing DARK AGI conventions.

Proposed endpoints:

GET /api/v1/earth/providers

GET /api/v1/earth/layers

POST /api/v1/earth/observations/search

GET /api/v1/earth/observations/:id

GET /api/v1/earth/observations/:id/assets

POST /api/v1/earth/imagery/render

POST /api/v1/earth/compare

POST /api/v1/earth/analysis/change-detection

GET /api/v1/earth/analysis/:id

These are proposed endpoints, not existing APIs.

Use typed request and response schemas.

Validate all AOI geometry, date ranges, provider filters, and asset requests.

Do not expose provider credentials in frontend responses.

# 12. DATABASE DESIGN

Design database entities for:

- satellite_providers
- satellite_collections
- satellite_observations
- satellite_assets
- observation_footprints
- imagery_layers
- imagery_cache
- earth_analysis_jobs
- earth_analysis_results
- earth_analysis_evidence

Store provider identifiers and provenance.

Use spatial data types only if supported by the existing database configuration.

Otherwise store validated GeoJSON and indexed geographic bounds.

Do not create a parallel database architecture unnecessarily.

Reuse existing DARK AGI database and job infrastructure where appropriate.

# 13. FRONTEND — EARTH OBSERVATORY

Create a premium dark scientific command-center interface.

Main layout:

LEFT SIDEBAR:
- Global search.
- Location details.
- Coordinates.
- AOI selection.
- Provider filters.
- Date filters.
- Layer selector.

CENTER:
- Interactive global map.
- Actual satellite imagery.
- Zoom and navigation.
- Imagery footprint overlays.
- Geographic selection.

BOTTOM:
- Observation timeline.
- Available dates.
- Satellite acquisition information.

RIGHT SIDEBAR:
- Observation metadata.
- Image quality.
- Spatial resolution.
- Cloud coverage.
- Provider information.
- AI analysis.

The UI must distinguish:
- Loading.
- Available.
- No imagery.
- Provider unavailable.
- Authentication required.
- Delayed imagery.
- Processing failed.

# 14. PERFORMANCE AND RELIABILITY

Implement:

- Provider request timeouts.
- Retry policies.
- Rate-limit handling.
- Request deduplication.
- Tile caching.
- Metadata caching.
- Pagination.
- Background processing.
- Job status tracking.
- Cancellation.
- Error reporting.

Do not download entire satellite archives to display a small map area.

Prefer provider tile services or processing APIs for viewport-based rendering.

For heavy processing, use the existing background job architecture.

# 15. SECURITY AND DATA GOVERNANCE

- Preserve existing authentication and authorization.
- Store provider secrets on the backend.
- Respect provider terms and licensing.
- Do not bypass authentication or usage limits.
- Maintain audit logs for analysis jobs.
- Record data source provenance.
- Do not access restricted imagery feeds.

# 16. IMPLEMENTATION STRATEGY

Do not attempt to implement all modules in one step.

Use these milestones:

MILESTONE 1 — GLOBAL MAP
- Interactive map.
- Global location search.
- Coordinate search.
- NASA GIBS imagery.
- Correct attribution.
- Zoom and pan.

MILESTONE 2 — OBSERVATION DISCOVERY
- Copernicus STAC.
- NASA layer discovery.
- Observation metadata.
- Search by AOI and date.
- Provider result normalization.

MILESTONE 3 — HISTORICAL IMAGERY
- Date selector.
- Observation timeline.
- Before/after comparison.
- Historical image metadata.

MILESTONE 4 — HIGHER-RESOLUTION IMAGERY
- Sentinel-2 asset retrieval.
- Appropriate image rendering.
- Resolution and cloud filtering.
- AOI-based processing.

MILESTONE 5 — AI ANALYSIS
- Image alignment.
- Change detection.
- Confidence and evidence.
- Analysis reports.

MILESTONE 6 — DARK AGI INTEGRATION
- Command registry.
- Earth observation commands.
- Agent tools.
- Job queue.
- Findings and reports.

# 17. DEFINITION OF DONE

The first production milestone is complete only when a user can:

1. Open DARK AGI.
2. Search for any country, city, or geographic coordinates.
3. Navigate to the selected location.
4. Display actual NASA imagery.
5. Select a supported imagery date.
6. See actual acquisition metadata.
7. Understand whether the displayed image is delayed or historical.
8. See the imagery provider and attribution.
9. Handle missing imagery without fabricated results.
10. Run automated tests successfully.

# FIRST DIRECTIVE

Start by inspecting the existing DARK AGI repositories.

Do not immediately rewrite existing modules.

Produce an implementation report containing:

1. Existing architecture.
2. Existing reusable modules.
3. Required dependencies.
4. Provider integration feasibility.
5. API design.
6. Database changes.
7. Frontend component structure.
8. Security considerations.
9. Exact implementation files.
10. Milestone 1 execution plan.

Then implement MILESTONE 1.

Do not proceed to the next milestone until the current milestone works and has been tested.

The final goal is a genuine global satellite observation system, capable of discovering and displaying actual available Earth imagery from multiple satellite providers for any geographic location on the planet.

---

## Addendum from the user (same day, follow-up message, own words)

Sent alongside reference screenshots (Planet.com Analysis BETA date-picker/layer-picker UI, a 3D globe dashboard with multiple real-time data-source toggles, a Sentinel Hub-style building-level zoom crop):

> ค้นหาพิกัดใดก็ได้บนโลก / ซูมจากระดับโลกลงถึงระดับอาคารตามภาพที่มี / เลือกวันที่ต้องการดู / แสดงภาพล่าสุดที่มีจริง / เปรียบเทียบภาพพื้นที่เดียวกันต่างวัน / แสดงความละเอียดและวันที่ถ่ายจริง / วิเคราะห์การเปลี่ยนแปลงของอาคาร ถนน พื้นที่ป่า และแหล่งน้ำ

(Search any coordinate on Earth / zoom from global down to building level like the reference images / pick a date / show the latest real image / compare the same area across different dates / show real resolution and real capture date / analyze changes in buildings, roads, forest, and water.)

This is restating/reinforcing Milestone 1 + 3 + 10 of the blueprint above with concrete reference UI, not a new separate request — the building-level zoom reference image in particular sets expectations for Milestone 4 (Sentinel-2/Landsat resolution, ~10m, NOT literally building-level/street-level — this will need the same honest resolution-limits conversation already had earlier in this session about `earth-imagery:high-res-view`, scoped into this mission's Phase 0/Milestone 1 report rather than skipped).

## What's already real (built earlier today, before this mission was logged — not part of this mission's own work yet)

- `earth-imagery:daily-view` (MODIS, ~250m-1km/pixel, any lat/lon or `place` name worldwide, defaults to Thailand) and `earth-imagery:high-res-view` (HLS/Sentinel-Landsat, ~10-30m/pixel, searches back up to 16 days for real coverage and reports which date it actually found) — both in `src/execution/operations/` (backend), both live-verified, both already doing single-provider (NASA GIBS), single-image "search any coordinate, get the real latest/best available image, honest about date and resolution" — i.e. a real but narrow slice of Milestone 1 + part of Milestone 4, with NO interactive pannable/zoomable map (MapLibre), no multi-provider STAC search, no before/after comparison UI, no AI change-detection, no new DB entities. `place` (today's deliverable) does global place-name search via Nominatim, satisfying the "ค้นหาพิกัดใดก็ได้บนโลก" line above in a command-line sense, not a map-click sense.
- Command aliases: `sat:view` (daily), `sat:viewhd` (high-res), both accepting `lat=`/`lon=`/`place=`.

## Status

NOT STARTED as a mission. User said explicitly: finish today's scoped place-search task, continue this one tomorrow. Start at the blueprint's own "FIRST DIRECTIVE" (repository inspection + implementation report) next session, inspecting `earth-imagery.ts`/`earth-imagery-highres.ts` first since they're real, relevant prior art, not a blank slate.
