# Mission 05 — EBCL wired into the research-cycle orchestrator

Date: 2026-11-13. Closes the gap flagged as "not done" in [mission-05-research-cycle-prototype.md](mission-05-research-cycle-prototype.md) §limits: *"EBCL is not wired in here... a model-backed `evidenceFromOutcome` should, in a real version, produce evidence that cites the actual job/experiment record and get that checked by EBCL before it reaches the matrix — not done."* Chosen as the next step because it needed neither of the two open decisions (real job history; real model tokens) and directly removes a documented limitation rather than adding a new one.

## What changed (`dark-agi-backend/src/research/cycle.ts`)

- `EvidenceFromOutcome` now returns `{ item: EvidenceItem; claim?: Claim }` instead of a bare `EvidenceItem`. Attaching a claim is optional — evidence with none simply contributes nothing to verification, never an error.
- A claim may only cite `{type: 'job', id: <planId>}`, checked against **this run's own outcomes** via a new in-memory `outcomeArtifactLookup()` — the same `ArtifactLookup` contract `src/claims/prisma-artifact-lookup.ts` satisfies against the real database, just backed by this run's data instead. Citing `finding`/`evidence`/`ioc` (which this prototype has none of) is honestly reported `MISSING_ARTIFACT`, never silently accepted.
- New stage `evidence-verification` (producer `'ebcl'`) runs between `simulation` and `result-analysis`, and `ResearchRun.evidenceVerdicts` holds one `Verdict` per claim actually attached.
- **Deliberately informational, not gating**: a `MISSING_ARTIFACT` or `UNSUPPORTED` verdict is recorded but never changes `cells` or `rank` — evidence is still judged by the deterministic evaluator exactly as before. The point is that a dishonestly-cited piece of evidence is now *visible* in `evidenceVerdicts`, not that it is blocked (blocking would need a policy decision about what "dishonest evidence" should do to a live investigation, which is out of scope for wiring).

## Tests added (`cycle.spec.ts`)

- An honest claim, citing the real outcome that produced it with the value actually present in that outcome → `VERIFIED`; ranking is identical with or without the claim attached (proves EBCL stays informational).
- A fabricated claim citing a plan id that never existed in the run → `MISSING_ARTIFACT` for every such claim — the exact failure mode EBCL exists to catch.
- Evidence with no claim at all → `evidenceVerdicts` is empty, not an error.
- Updated the existing provenance test for the new 6-stage list (was 5).

## Verified

- `npx vitest run src/research`: 8/8 (was 6; 2 new).
- Full suite: **468/468** (was 466 — 2 new tests, 0 regressions).
- `tsc --noEmit`, `oxlint --deny-warnings`, `npm run build`: all clean.

## Honest limits, unchanged from before

- Only `job`-typed cites (bound to this run's own experiment plans) are checkable; `finding`/`evidence`/`ioc` cites have nothing to resolve against in this synthetic prototype.
- Still no model anywhere in the pipeline — `evidenceWithHonestClaim`/`evidenceWithFabricatedClaim` in the tests are hand-written stubs, exactly like every other component tested so far.
- Still no persistence; still only 5 (now effectively 6, with evidence-verification) of the mission's 10 named stages modeled.
