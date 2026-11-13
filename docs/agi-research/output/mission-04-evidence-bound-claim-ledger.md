# Mission 04 — Build Extraordinary Tools: Evidence-Bound Claim Ledger (EBCL), core

Date: 2026-11-13. Selected tool: invention #1 from [mission-02-inventions.md](mission-02-inventions.md). Repo: `dark-agi-backend`, branch `feat/scope-enforcement-asset-authorization`, **all changes uncommitted, all new files**.

## What was built (verified working offline)

| File | What it is |
|---|---|
| `src/claims/claims.ts` | `dark-agi-claims` block parser (zod, never throws), `stripClaims`, deterministic verifier (`verifyResolved`, async `verifyClaims`), `resolvePath`, `claimMetrics` |
| `src/claims/prisma-artifact-lookup.ts` | Read-only `ArtifactLookup` over Prisma (`findUnique` only, fixed column list, rejects non-UUID ids without querying) |
| `src/claims/claims.spec.ts` | 19 unit tests |
| `src/evals/eval-harness.ts` (edited) | New scorer `claims_verified`; `EvalCase.artifacts`; reply is stripped of claims blocks before grounding |
| `src/evals/eval-cases.ts` (edited) | 3 new cases (`claims-1..3`), total now 41 |
| `src/evals/eval-harness.spec.ts` (edited) | scripted good/bad models extended; 2 new tests |

Verdicts: `VERIFIED`, `CITED_UNCHECKED`, `UNSUPPORTED`, `MISSING_ARTIFACT`, `ARTIFACT_NOT_SUCCESSFUL`, `OUT_OF_SCOPE`, `UNCITED`. Metrics: citation recall, citation precision, hallucinated-artifact rate (each `null`, not 1.0, when undefined).

Rules (all deterministic, no model judging): every cited record must exist; a cited job must be `SUCCEEDED`; if an allowed-target list is supplied, a cited record's targets must all be inside it (exact match); then the claimed value (`equals` or `contains`, optional dot path) must appear in at least one cited record.

## Verification actually run (all local, zero model tokens)

- `npx vitest run src/evals src/claims`: **41 passed / 41**
- `npx tsc -p tsconfig.json --noEmit`: clean
- `npx oxlint --deny-warnings src/evals src/claims scripts/eval-agents.mjs`: clean (after fixing my own style warnings)
- Not run: build, integration tests, any real model.

### Full unit suite: pre-existing failures, NOT from this work

`npx vitest run` (whole repo): **12 failed / 414**, in `masscan.spec.ts`, `metasploit.spec.ts`, `nuclei.spec.ts` and `operations.spec.ts` (examples: expected default rate `1000` got `100`; allow-list/high-risk expectations). My changes are only new untracked files, and `grep` finds no existing file importing `src/claims` or `src/evals`, so these fail on the committed code independent of this work. **Not investigated**; likely specs out of step with recent default/risk changes. Needs a separate look.

## Acceptance criteria (set in Mission 02) vs reality

| Criterion | Status |
|---|---|
| Verifier deterministic | Met: test asserts identical verdicts on rerun |
| Rule-checkable false-accept = 0 on seeded wrong claims | Met on the unit-test seeds only (invented id, absent value, failed job, out-of-scope, uncited); this is not an evaluation of any real model |
| Model protocol compliance measured, not assumed | Mechanism exists (`claims_verified`, 0 when no block on non-trap cases); **no real model measured** |
| Baseline comparison | Not done: needs a real-model run |

## What this is NOT (limits)

- **Not wired into agent runs.** `AgentsService` does not yet ask for, parse or store claims, and the agent system prompt does not mention the claims block (the 3 eval cases carry the instruction inside the task text instead). Wiring changes live prompts and the stored run shape, so I did not do it without your go-ahead.
- `claims_verified` uses only supplied fixtures; the Prisma lookup is tested with a fake DB, **never against a real PostgreSQL**.
- Value matching is substring/equality: paraphrases are `UNSUPPORTED`; a `contains` on a short string can match by accident (e.g. `"22"` inside a larger number).
- `kind: 'inference'` claims are never judged true, only `CITED_UNCHECKED`.
- Scope check is exact string match on target lists, not CIDR-aware.
- The 3 new cases are authored by the same team as the verifier (same bias caveat as before); 41 cases is above the 30 minimum but only 3 test claims.
- Prior-art: citation-verification tools already exist (see Mission 02); EBCL's only claimed difference is binding to platform records, unproven.

## Suggested next steps

1. **Decision needed:** wire EBCL into `AgentsService` (opt-in per run, store verdicts in the existing JSON on `AgentRun`, no migration)? Changes live prompt and run output.
2. Record the first real-model baseline with `scripts/eval-agents.mjs` (needs backend running, API key with `ai:use`, a free model, `EVAL_CONFIRM=yes`; defaults to 12 cases, 1 repeat, cap 40 calls).
3. Look at the 12 pre-existing failing unit tests.
4. Then Mission 04 continues with Attested Replay Lab (needs your decision on reading real job history).
