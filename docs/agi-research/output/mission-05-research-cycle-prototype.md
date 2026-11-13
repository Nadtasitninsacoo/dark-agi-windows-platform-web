# Mission 05 — Autonomous Scientific Discovery Engine: core orchestrator prototype

Date: 2026-11-13. Status: deterministic prototype, built and verified offline. **No code touches the database, calls a model, or executes anything real.** No claim of autonomous discovery is made — this wires together the deterministic building blocks already in this repo (EBCL, ARL, DHL) and proves the pipeline shape works end-to-end with toy, fully-synthetic data.

## Why this, now

Mission 05 asks for an architecture that separates a research planner, hypothesis generator, experiment designer, execution engine, evaluator and knowledge manager, running a 10-stage cycle, with the hard rule that "the same agent [is never] the sole judge of its own discovery." After building EBCL (evidence binding), ARL (simulated, cassette-backed execution) and DHL (deterministic hypothesis ranking) across Mission 04, the next genuinely useful, zero-token, zero-decision-pending step was to prove those three pieces actually compose into the cycle Mission 05 describes — not just coexist as separate modules.

## What was built

`src/research/cycle.ts` (`dark-agi-backend`, same branch):

- **Component contracts** (pluggable — a model-backed implementation can replace any of these later): `HypothesisGenerator`, `ExperimentDesigner`, `Evaluator`. `ExecutionEngine` is satisfied today only by ARL's `SimulatedEngine` — nothing here grants any new real-execution capability.
- **`ComponentIdentityError`**: thrown, not just documented, if the hypothesis generator and the evaluator share an id. This is Mission 05's "no agent judges its own discovery" rule enforced in code, not left to prompt discipline. `DHL`'s `rankHypotheses` is a ready-made deterministic evaluator — a model can never substitute for it by construction (it has no `id` field to collide, and nothing calls a model inside `evaluate`).
- **`runResearchCycle()`**: generates hypotheses → designs one experiment per hypothesis → runs each (simulated) → cross-judges every piece of evidence against **every** hypothesis, not only the one its own experiment targeted (this is Heuer's method, inherited from DHL) → evaluates. Every stage's output and producer id is kept in `ResearchRun.stages` for provenance.
- **Contradiction/reproducibility detection**: each experiment step is immediately re-run and compared to its first result. With a correctly built, cassette-backed `SimulatedEngine` this can never fire (replay is byte-identical by construction — see `cassette.spec.ts`), so any hit is a real signal that something lied about being deterministic.
- Per-step errors are caught and recorded (`StepOutcome.error`), never thrown out of the whole cycle.

`src/research/cycle.spec.ts`: 6 tests.

## Two real bugs found while building this, and the tests that caught them

1. **A leftover, nonsensical expression** `outcomeByHypothesisId.get(e.id === e.id ? h.id : h.id)` — a tautological ternary that always evaluated to `h.id`, written while I was mid-edit on how to look up which outcome produced a given piece of evidence. Found by re-reading my own code before writing the first test, not by a failing test — TypeScript did not catch it because the expression was type-valid nonsense, just logically wrong. Fixed by dropping the id-based lookup entirely in favor of index alignment (`hypotheses[i]`/`plans[i]`/`outcomes[i]` all correspond by position), which is correct regardless of what id a caller's `evidenceFromOutcome` happens to assign.
2. **A bogus type import**: `Evaluator as DhlEvaluatorShape` from `dhl.ts`, a module that exports no type named `Evaluator` — this would have failed `tsc` on the very first compile, so it was never a silent risk, but it shows the first draft wasn't type-checked before being written up as "built." Fixed by defining `Evaluator` locally.
3. **A test-fixture bug, not a `cycle.ts` bug**: my first version of the toy "flaky engine" test alternated `true`/`false` by call-count parity. With exactly 2 hypotheses × 1 step each, the original run and its immediate re-run happened to land on the same parity and never actually disagreed — the test asserted a contradiction would be found and it wasn't, so it failed loudly rather than passing for the wrong reason. Fixed by making the fake engine return a strictly unique value every call (`{ callNumber: ++calls }`), which can never coincidentally match on re-run.
4. Also hit two ordinary null-handling mistakes in the test's own toy `cellJudge` (assuming a step's `result` was always a parseable object with `.up`, which breaks once a step error makes it `null`) — straightforward fixes, mentioned for completeness.

## Verified (all offline, zero tokens)

- `npx vitest run src/research`: 6/6.
- Full suite: **459/459** (was 453 before this — 6 new tests, 0 regressions).
- `tsc --noEmit`: clean. `oxlint --deny-warnings`: clean. `npm run build`: succeeds.

## What this is NOT (honest limits)

- **Only 5 of the mission's 10 named stages are modeled as distinct stage records** (hypothesis-generation, experiment-design, simulation, result-analysis, hypothesis-evaluation). Knowledge retrieval, mathematical modeling (beyond DHL's own scoring), tool generation and knowledge integration are not represented — they would need real content (a knowledge store, a modeling layer) that doesn't exist yet, not just a renamed stage.
- **The hypothesis generator, experiment designer and cell-judge in the test are all toy, hand-written stubs, not models.** No model has been plugged into any of these component slots. That is deliberately the next piece of real work, and it is the one that costs tokens.
- **One experiment per hypothesis (1:1), not yet a flexible research plan.** A real investigation often runs one experiment that bears on several hypotheses, or several experiments per hypothesis; the current `runResearchCycle` signature doesn't support that shape yet.
- **EBCL is not wired in here.** `EvidenceItem` (from DHL) doesn't require a `cite`, and this module never calls `verifyClaims`. A model-backed `evidenceFromOutcome` should, in a real version, produce evidence that cites the actual job/experiment record and get that checked by EBCL before it reaches the matrix — not done.
- **No persistence.** `ResearchRun` is an in-memory value; nothing here saves it. Mission 02's "research history and provenance" requirement points at a future database table, which needs your approval like every other schema change in this program.
- Mission 01's required final piece — an independent verifier that is not the same model as the generator — is enforced only for the hypothesis-generator/evaluator pair here (`ComponentIdentityError`). The experiment designer has no such check yet; a designer that quietly favours its own generator's hypotheses would not currently be caught.

## Next steps (in rough order, none started)

1. Plug a real (stub, then model-backed) hypothesis generator and experiment designer in behind these interfaces — needs a token-spending decision, same as everywhere else in this program.
2. Wire EBCL into `evidenceFromOutcome` so evidence is checked, not just asserted.
3. Decide on persistence for `ResearchRun` (schema change, needs approval) versus keeping it file-based like the eval harness.
4. Revisit the acceptance test from Mission 02 (6–10 scripted investigations with known ground truth) using this orchestrator plus DHL, still entirely with synthetic data — this one is unblocked and could be done next without any new decision.
