# Mission 04 — Diagnostic Hypothesis Ledger (DHL), core

Date: 2026-11-13. Selected tool: invention #4 from [mission-02-inventions.md](mission-02-inventions.md), done next because — like EBCL and ARL — its core is pure deterministic logic over in-memory data, needing neither the still-open real-job-history decision nor a real model call. Directly feeds Mission 05 (its "knowledge manager"/hypothesis-evaluation piece).

## What it is

An implementation of Heuer's Analysis of Competing Hypotheses: a matrix of hypotheses × evidence, each cell `CONSISTENT | INCONSISTENT | NEUTRAL`, ranked by **Heuer's own rule — refuting beats confirming**. Evidence that is consistent (or inconsistent) with every hypothesis equally has zero *diagnosticity*: it cannot tell the hypotheses apart, however reassuring or damning it looks in isolation, and contributes nothing to the ranking. A model may propose hypotheses, evidence or individual cell judgments; only the deterministic `rankHypotheses` function decides an order, and it reports a tie as a tie rather than ever picking a winner on its own.

## Files (all in `dark-agi-backend`, same branch)

- `src/hypotheses/dhl.ts`: `Hypothesis`, `EvidenceItem` (with an optional link to a real platform record via `claims.ts`'s `Cite` type — unused unless a caller wires it up), `Cell`, `diagnosticity()`, `rankHypotheses()`, `validateMatrix()`.
- `src/hypotheses/dhl.spec.ts`: 14 unit tests.

## Design choices worth flagging

- **Three-point scale** (`CONSISTENT`/`INCONSISTENT`/`NEUTRAL`), not Heuer's full five-point strength scale — a smaller, auditable first cut. Extending it later is additive, not a breaking change.
- **Missing cell = NEUTRAL**, never guessed in either direction.
- **Diagnosticity = spread** (max − min of a ±1/0 value across hypotheses for one evidence item), 0 to 2. Simple and explicit, but coarse: it cannot distinguish "mildly informative" from "very informative" beyond that 0–2 range — a limitation inherited from the three-point scale above.
- **Score is never positive.** `rankHypotheses` only subtracts diagnosticity-weighted refutations; consistency never adds anything. This is a direct, deliberate reading of Heuer's "you cannot prove a hypothesis, only fail to disprove it" — but it also means two hypotheses can tie at 0 (nothing refutes either) despite very different amounts of *confirming* evidence. `topTied`/`undetermined` exist specifically so a caller cannot mistake that silence for either hypothesis being favoured.
- `validateMatrix` is separate from `rankHypotheses` on purpose — a caller decides whether to refuse a bad matrix or rank it anyway with known problems flagged.

## Verified (all offline, zero tokens)

- `npx vitest run src/hypotheses`: 14/14.
- Full suite: **453/453** (was 439 before this — 14 new tests, 0 regressions).
- `tsc --noEmit`: clean. `oxlint --deny-warnings`: clean (one real warning, `Array#sort` mutating in place, fixed with `toSorted`, re-verified).

## What this is NOT yet

- **No persistence, no API, no console page.** This is the scoring core only. Mission 02's design called for `Hypothesis`/`EvidenceRef`/`Cell` as database tables eventually — that still needs your approval (schema change); nothing here assumes it, and the types work equally well backed by a JSON file or an in-memory array today.
- **Not wired to EBCL.** `EvidenceItem.cite` is defined but nothing currently verifies it — a caller would need to run it through `verifyClaims`-style checking itself before trusting that the evidence it's scoring actually exists.
- **No AI-assisted hypothesis/evidence generation.** Per the design, a model proposing hypotheses, evidence or cell judgments is future work; this core only scores whatever matrix it's handed, from any source.
- **Prior art is unresolved** (per Mission 02): I found existing LLM+ACH tools (Scott Roberts' app, ACH-Grounding) in a search-summary pass, not a full read of either; I could not confirm whether either computes a diagnosticity measure the way this does.

## Where this fits going forward

- Mission 05's "knowledge manager" / "hypothesis evaluation" component can use this directly once there's a real pipeline generating hypotheses and evidence to feed it (synthetic test data works today for building that pipeline's own tests, same pattern as ARL).
- Mission 02's acceptance test (6–10 scripted investigations with a known ground truth, comparing "model ranks itself" vs DHL) is still not run — it needs either hand-authored synthetic scenarios (no blocker, could do next) or real data (blocked on the same open decision as ARL).
