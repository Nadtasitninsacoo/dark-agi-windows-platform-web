# MISSION 06 — COSMIC INTELLIGENCE ENGINE

Pasted verbatim from the user on 2026-11-13/14. Not started — logged for the next instance to pick up at FIRST TASK / PHASE 0 below. Do not skip Phase 0.

Context this mission assumes but was written without seeing: the real `nasa:dsn` (and sibling) commands referenced below are NOT research-program toys — they are real, live-verified production operations built in this same conversation under `src/execution/operations/` (backend) and wired into the frontend terminal (`dagi nasa:dsn keng`, etc.), part of the "External Intelligence" tool category (`src/tool-registry/tool-catalog.ts`). Phase 0 of this mission is to go inspect that real code, not to assume anything about it from this brief.

---

# DARK AGI — COSMIC INTELLIGENCE ENGINE
## Mission: Build an Advanced Autonomous Space Intelligence & Scientific Discovery Platform

You are the Principal AI Architect, Scientific Computing Engineer, Astrodynamics Researcher, Data Engineer, and Senior Full-Stack Developer responsible for extending the existing DARK AGI platform.

Your mission is to transform the existing NASA DSN command capability into an advanced space intelligence and scientific research system.

This is not a UI-only feature.

The system must retrieve real scientific data, analyze it, identify meaningful events, perform mathematical calculations, generate predictions with uncertainty estimates, and produce reproducible scientific reports.

## PHASE 0 — REPOSITORY INVESTIGATION

Before writing code:

1. Inspect the existing DARK AGI frontend and backend.
2. Locate the existing `nasa:dsn` command implementation.
3. Identify the actual NASA data source, response schema, adapters, execution flow, and storage.
4. Understand the existing job queue, audit, permissions, and AI gateway.
5. Identify reusable components and existing visualization capabilities.

Do not invent existing APIs, files, modules, or capabilities.

Do not rewrite working modules unnecessarily.

The backend remains the authoritative enforcement layer.

## PHASE 1 — COSMIC EVENT INTELLIGENCE

Build an event intelligence engine that combines:

- NASA DSN communication status
- Spacecraft identity and communication status
- Spacecraft position and ephemeris
- Orbital parameters
- Solar activity and space weather
- Asteroid close approaches
- Historical scientific observations

Capabilities:

1. Detect meaningful changes in incoming observations.
2. Identify unusual patterns.
3. Correlate observations from different scientific sources.
4. Create a chronological event timeline.
5. Classify events by significance and confidence.
6. Explain why an event was detected.
7. Preserve the original source and observation timestamp.

Example command language:

`dagi cosmic:monitor keng`
`dagi cosmic:events keng`
`dagi cosmic:anomalies keng`
`dagi cosmic:timeline target=Voyager1 keng`
`dagi cosmic:report keng`

These are proposed command names. Integrate them using the existing command registry and parser conventions.

## PHASE 2 — SOLAR SYSTEM DIGITAL TWIN

Develop a scientific visualization and simulation engine.

Requirements:

- 3D solar system visualization.
- Spacecraft trajectory visualization.
- Planetary positions.
- Historical trajectory reconstruction.
- Future trajectory propagation.
- Time controls.
- Orbital parameter inspection.
- Uncertainty visualization.

Use validated ephemeris data and appropriate mathematical models.

Never present an extrapolated trajectory as confirmed real-time spacecraft telemetry.

## PHASE 3 — SPACE WEATHER INTELLIGENCE

Integrate appropriate public scientific data sources.

Analyze:

- Solar wind.
- Magnetic field observations.
- Solar flares.
- Geomagnetic activity.
- Coronal mass ejection observations where available.
- Space weather alerts.

Produce:
- Event detection.
- Historical comparisons.
- Risk assessments.
- Scientific explanations.
- Confidence and uncertainty estimates.

Do not claim direct spacecraft damage without supporting evidence.

## PHASE 4 — ASTEROID AND ORBITAL INTELLIGENCE

Integrate NASA/JPL CNEOS and SBDB data.

Implement:

- Near-Earth object discovery tracking.
- Close-approach analysis.
- Orbital parameter inspection.
- Distance and relative velocity analysis.
- Uncertainty-aware future predictions.
- Historical comparison.

Clearly distinguish close approach from collision risk.

Use authoritative impact-risk information instead of inventing collision probabilities.

## PHASE 5 — DEEP SPACE SIGNAL ANALYTICS

Build a scientific signal analysis module for legitimately available datasets.

Implement:

- Signal visualization.
- Spectrogram generation.
- Frequency analysis.
- Noise characterization.
- Signal classification.
- Anomaly detection.

Do not claim extraterrestrial intelligence based solely on unusual signal patterns.

## PHASE 6 — AUTONOMOUS PHYSICS RESEARCH LAB

This is the most important research component.

Create a reproducible scientific discovery workflow:

Problem Identification
→ Literature and Dataset Retrieval
→ Hypothesis Generation
→ Mathematical Modeling
→ Simulation
→ Experiment Design
→ Validation
→ Statistical Evaluation
→ Scientific Report

The AI must:

1. Generate testable scientific hypotheses.
2. Explain the mathematical assumptions.
3. Write executable simulation code.
4. Compare predicted and observed results.
5. Detect contradictions and model errors.
6. Compare against established scientific models.
7. Record failed hypotheses.
8. Produce reproducible experiments.

Distinguish clearly between:
- Established scientific knowledge.
- Mathematical derivations.
- Model predictions.
- Simulated results.
- Empirical observations.
- Unverified hypotheses.

Never claim to have discovered new physics without reproducible evidence and independent validation.

## PHASE 7 — COSMIC DISCOVERY AGENT

Create a specialized research agent that can:

- Search scientific datasets.
- Identify interesting observations.
- Form research questions.
- Propose analysis methods.
- Execute approved computational experiments.
- Evaluate results.
- Generate research reports.

All external actions must remain within the existing authorization and approval architecture.

## DATA ENGINEERING REQUIREMENTS

Every observation must preserve:

- Source name.
- Source record identifier.
- Original observation timestamp.
- Retrieval timestamp.
- Units.
- Coordinate reference frame where applicable.
- Data quality.
- Uncertainty.
- Transformation history.
- Processing version.

Implement caching, rate limiting, retries with backoff, and source availability monitoring.

Never silently mix incompatible units, coordinate frames, or timestamps.

## USER EXPERIENCE

Create a high-end scientific command center consistent with the existing DARK AGI terminal design.

Suggested sections:

1. COSMIC OVERVIEW
2. LIVE DSN NETWORK
3. SPACECRAFT TRACKING
4. SOLAR SYSTEM DIGITAL TWIN
5. SPACE WEATHER
6. ASTEROID INTELLIGENCE
7. SIGNAL ANALYTICS
8. PHYSICS RESEARCH LAB
9. DISCOVERY AGENTS
10. SCIENTIFIC REPORTS

The interface must display actual backend data, not fabricated sample telemetry.

## ENGINEERING RULES

- Inspect before implementing.
- Reuse existing architecture.
- Strong TypeScript typing.
- No unnecessary dependencies.
- No fake integrations.
- No hardcoded scientific results.
- No fabricated real-time data.
- No arbitrary shell execution.
- Preserve existing security controls.
- Write tests for scientific calculations and data transformations.
- Validate source schemas.
- Document every external data source.
- Implement features incrementally.

## DEFINITION OF DONE

A feature is not complete merely because its UI renders.

It must have:

1. A working backend implementation.
2. A verified data source.
3. A validated data model.
4. A functioning execution path.
5. Error handling.
6. Automated tests.
7. Scientific provenance.
8. A reproducible demonstration.

## FIRST TASK

Do not implement all seven phases immediately.

First inspect the existing repository and produce:

A. Existing NASA DSN architecture analysis.
B. Verified external data source inventory.
C. Proposed integration architecture.
D. Database and data provenance design.
E. Cosmic Event Intelligence implementation plan.
F. Exact files that need modification or creation.
G. Risks, dependencies, and verification strategy.

Then implement Phase 1 in small, testable increments.

The objective is to build a real scientific intelligence platform, not merely simulate the appearance of one.

---

## Addendum from the user (same message, own words, not part of the pasted brief above)

A dashboard page is also wanted, separate from (but related to) this mission, showing self-knowledge about the AGI itself:

- What it has learned so far.
- How far it has developed/improved itself.
- What new things it proposes.
- What hypotheses/theories it currently holds — **must not be fabricated or guessed ("ไม่มั่ว")**: every hypothesis shown must trace to a real source (an EBCL claim, a DHL-ranked hypothesis, a Mission 03/06 experiment, etc.), never invented for the dashboard's own sake.
- What its vulnerabilities are.
- What its limitations are.
- What future tools could be built to break through those limitations.
- What defensive tools should exist to guard against those break-through tools (i.e. the dashboard should surface its own attack surface, not just its capabilities).
- A standing expectation that the system should keep getting more capable than what is written here today — a direction, not a one-time deliverable.

This dashboard is itself an EBCL-shaped problem (every claim it displays needs a real citation back to evidence) — likely belongs alongside, or reuses, the Evidence-Bound Claim Ledger core already built in Mission 04 (`src/claims/claims.ts`), rather than being a new ad hoc "what the AI thinks of itself" page. Not designed yet; needs its own small design pass before implementation (where does the data actually come from — job history? EBCL claims? DHL hypothesis ledgers? — none of that is wired to persist today per Mission 04/05's open blockers).

## Status

NOT STARTED. User said explicitly: do this much (save the brief) for now, continue tomorrow — do not start Phase 0 investigation or any implementation today.
