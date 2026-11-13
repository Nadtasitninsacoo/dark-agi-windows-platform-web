# Mission 02 — Beyond Existing Technology: five buildable inventions

Date: 2026-11-13. Status: design only. **No code written for this mission, nothing benchmarked.**
Builds on [mission-01-agi-evolution-roadmap.md](mission-01-agi-evolution-roadmap.md) (read it first: it lists the verified gaps these inventions target) and the finished Agent Evaluation Harness (`dark-agi-backend/src/evals/`).

## 0. Honest framing: what "invention" means here

A prior-art search (4 web searches, standard mode, summaries only, not full papers) shows that the **core idea of each proposal already exists** somewhere. None of them is globally unprecedented, and I am not claiming otherwise. What is specific to DARK AGI is the **integration with its governed substrate**: a Postgres job/finding/evidence store, forced human approval for `AGENT` actors, scope enforcement and a hash-chained audit. That substrate lets some checks be *exact* (key lookup, value containment) where public tools must use semantic/LLM judging. That integration is the only novelty claim made below, and even that is unverified until built and measured.

Prior art found (search summaries, unverified beyond the snippets):

| Area | What already exists |
|---|---|
| Pause/resume agents for approval | LangGraph `interrupt()` plus a persistent checkpointer and `thread_id`; resume with a `Command`. Re-executes the node on resume, so pre-interrupt code must be idempotent. ([LangChain docs](https://docs.langchain.com/oss/javascript/langgraph/interrupts), [DEV article](https://dev.to/gabrielanhaia/human-in-the-loop-with-langgraphjs-pausing-a-graph-for-approval-2eee)) |
| LLM + Analysis of Competing Hypotheses | Scott Roberts' LLM ACH app ([writeup](https://mattdot.github.io/sats4llms/sources/roberts-llm-sats-ftw-2025)); open-source **ACH-Grounding**, where the LLM only fills matrix cells and deterministic code ranks hypotheses ([source page](https://mattdot.github.io/sats4llms/sources/suprathermal-ach-grounding-2024)); older PARC ACH0 and DECIDE. I found no source confirming any LLM ACH tool computes a diagnosticity matrix, but I did not read the repos. |
| Citation / claim verification | Citation precision and recall metrics, CiteCheck ([arXiv 2605.27700](https://arxiv.org/html/2605.27700)), "Cited but Not Verified" deterministic citation-claim extraction ([review](https://www.themoonlight.io/review/cited-but-not-verified-parsing-and-evaluating-source-attribution-in-llm-deep-research-agents)), quote-alignment work. Mostly target documents/papers, and the literature found favours retrieval plus structured LLM judging. |
| Record/replay agent testing | TraceOps, pytest-agentcontract, cendor-cassette, LLMReplay ([TraceOps](https://pypi.org/project/TraceOps/), [pytest-agentcontract](https://pypi.org/project/pytest-agentcontract), [cendor-cassette](https://pypi.org/project/cendor-cassette/1.1.1/)); a practitioner article says cassettes test your code, not the model ([article](https://tianpan.co/blog/2026/04/10/integration-testing-ai-agents-ci)). Mostly small/early-stage packages. |
| LLM-as-judge / verifier | Widely used; shares generator blind spots (general knowledge, not re-searched). |

## 1. Ranking

Scores 1–5 are **my judgment**, not measured. Overall order is by what should be built first.

| Rank | Invention | Innovation | Feasibility | Practical value | Token cost to build/test |
|---|---|---|---|---|---|
| 1 | Evidence-Bound Claim Ledger (EBCL) | 3 | 5 | 5 | ~0 (deterministic) |
| 2 | Attested Replay Lab (ARL) | 3 | 4 | 5 | ~0 (offline replay) |
| 3 | Approval-Suspendable Agent Run (ASAR) | 2 | 3 | 5 | low (uses ARL for tests) |
| 4 | Diagnostic Hypothesis Ledger (DHL) | 4 | 3 | 3 | low |
| 5 | Disagreement-Preserving Verifier Quorum (DPVQ) | 2 | 4 | 3 | **high** (extra model calls) |

Why this order: EBCL and ARL cost no tokens to build and test, which matches the stated constraint, and they are prerequisites for measuring ASAR, DHL and DPVQ honestly. DPVQ is last because it spends tokens and its value is unproven until EBCL shows which claims cannot be checked deterministically.

## 2. The five inventions

### 2.1 Evidence-Bound Claim Ledger (EBCL)

- **Different because:** an agent's factual claims must cite platform artifacts (`jobId`, `findingId`, `evidenceId`, `iocId`). A deterministic verifier checks that the artifact exists, was produced inside an authorised scope, and that the claimed value actually occurs in it. Public citation checkers judge document similarity; here the cited object is a governed record, so the check is a key lookup plus value containment, with no LLM judge.
- **Problem solved:** Mission 01 L1/L7: today `SUCCEEDED` means only that a model call returned; nothing checks a claim. The harness's grounding scorer is the offline cousin of this.
- **vs existing:** citation precision/recall and CiteCheck-style tools (above) are the closest. EBCL differs only in citing hash-chained, scope-bound records; it will not beat them on free-text paraphrase.
- **Architecture:** (1) extend the request protocol with a fenced `dark-agi-claims` block; (2) `ClaimVerifier` service, read-only on Prisma; (3) verdict per claim stored on the run; (4) verifier output is itself audited. The agent never sets a verdict.
- **Algorithms / data:**
  ```
  Claim   { id, text, kind: 'fact'|'inference', cites: Cite[], value?: {field, equals|contains} }
  Cite    { type: 'job'|'finding'|'evidence'|'ioc', id }
  Verdict { claimId, status: VERIFIED|UNSUPPORTED|MISSING_ARTIFACT|OUT_OF_SCOPE|UNCITED, detail }
  ```
  Rules: artifact must exist; for jobs, status must be SUCCEEDED; `value` must be found in `result` (JSON path or substring); `inference` claims need ≥1 cite but are only flagged `UNVERIFIABLE_BY_RULE` unless a rule applies. Metrics: citation precision, citation recall, hallucinated-artifact rate.
- **Needs:** a protocol change (backward compatible: absent block = `UNCITED`), a JSON column or reuse of existing JSON on `AgentRun` first, so likely **no migration**. Needs approval before any schema change.
- **Experiment:** extend the 38 eval cases with fixtures that include artifact ids; compare baseline free-text vs claim-protocol mode on hallucinated-artifact rate, with the harness's bootstrap CI and a minimum 30 cases.
- **Success criteria:** verifier is deterministic (identical input → identical verdicts); on seeded wrong claims, false-accept rate 0 on the rule-checkable class; model compliance with the protocol is measured, not assumed (a model that ignores the block scores `UNCITED`).
- **Risks:** models may emit uncited prose, which only lowers recall; value matching can false-reject paraphrases; claim format adds prompt tokens.

### 2.2 Attested Replay Lab (ARL)

- **Different because:** cassettes are built from DARK AGI's own audited job history, not raw HTTP or SDK traces, and the simulated engine reuses the real policy functions (`operationsFor`, scope rules), so a replay cannot permit something the real engine would deny.
- **Problem solved:** testing the closed loop (Mission 01 rank 3) needs tool results; running real scans in tests is slow, risky and out of scope. Also directly serves the token constraint: replays cost zero model tokens when the model side is also recorded.
- **vs existing:** record/replay tools (TraceOps, pytest-agentcontract, cendor-cassette) already do the pattern. ARL's contribution is only the source of cassettes and policy parity, not the technique.
- **Architecture:** `CassetteStore` (JSON files, content-addressed), `SimulatedEngine` implementing the same `submit/get` surface the agent loop needs, serving results keyed by `(toolId, operationId, normalizedInput)`; a scrubber (IPs → RFC 5737 ranges, hostnames, usernames, paths) run **before** a cassette is written; a "miss" returns a deterministic `NO_CASSETTE` error instead of falling through to a real scan.
- **Algorithms / data:** canonical JSON (sorted keys) → SHA-256 key; trajectory diff = ordered list of (operation, key) with added/removed/reordered detection.
- **Needs:** reading real `Job` rows (**privacy: sensitive data, needs your decision**); no DB writes.
- **Experiment:** record 10 real trajectories, replay each 3×; assert identical results, and assert that a changed prompt yields a measurable trajectory diff.
- **Success criteria:** replay is byte-identical; zero network/process calls during replay (asserted by a test that fails if `ProcessRunner` is touched); scrubber leaves no original IPv4 from a seeded set.
- **Risks:** scrubbing can be incomplete (a leak is worse than no feature); cassettes go stale when tool output formats change; cassettes test platform code, not the model (per the practitioner article).

### 2.3 Approval-Suspendable Agent Run (ASAR)

- **Different because:** the resume trigger is the platform's own approval queue in Postgres, and the agent actor is hard-barred from approving (`canApprove: false` exists today). Pause state lives in `AgentRun`/`Job` rows that survive a backend restart, rather than in an external graph checkpointer.
- **Problem solved:** Mission 01 rank 3: agents never see tool results, so they cannot act on evidence.
- **vs existing:** this is LangGraph-style interrupt/resume. It is the least novel of the five; the value is fit to this codebase, not invention.
- **Architecture:** new run states `AWAITING_APPROVAL` and `RESUMABLE`; a scheduler tick (like the existing sequence tick) finds runs whose awaited jobs reached a terminal status and resumes them with a result summary; hard budgets: max observe-act turns, max tokens, max wall-clock; any `REJECTED`/`FAILED` job is fed back as an observation, never retried silently.
- **Algorithms / data:** state machine `RUNNING → AWAITING_APPROVAL → RESUMABLE → RUNNING → SUCCEEDED|FAILED`; idempotency key per turn so a restart cannot double-submit a job (the LangGraph "node re-runs on resume" pitfall).
- **Needs:** **schema change (new enum values)**: requires your explicit approval, not done. Also `execute()` currently is synchronous and in-process, so this is a significant refactor: "significant architectural change" under the Master Directive, needs approval first.
- **Experiment:** use ARL to replay approvals; compare single-shot baseline vs loop on tasks that need a tool result to answer (e.g. "which port is open?"), measured by the eval harness coverage and grounding scores.
- **Success criteria:** crash-restart mid-wait resumes exactly once; no job is ever submitted twice; the agent never approves anything (negative test); turn budget enforced.
- **Risks:** cost grows with turns; a prompt-injected tool output could steer the next turn (tool output is untrusted data and must be framed as such); longer-lived runs enlarge the audit surface.

### 2.4 Diagnostic Hypothesis Ledger (DHL)

- **Different because:** competing hypotheses are first-class records whose evidence links must resolve through EBCL, and the **diagnosticity of each evidence item is computed by code**: evidence consistent with every hypothesis carries zero weight. The model may propose cell values but cannot rank hypotheses.
- **Problem solved:** Mission 01 L9 (scientific/investigative reasoning): the platform holds findings and evidence but has no structure for weighing explanations against each other. Also the bridge to Mission 05.
- **vs existing:** this is Heuer's ACH, already implemented with LLMs (Roberts; ACH-Grounding, which already keeps ranking deterministic). DHL's only addition would be EBCL-verified evidence links and a diagnosticity measure; I could not confirm whether other tools compute diagnosticity.
- **Architecture:** `Hypothesis`, `EvidenceRef`, `Cell{hypothesisId, evidenceId, relation: CONSISTENT|INCONSISTENT|NEUTRAL, setBy: 'human'|'agent'}`; scorer: ranks hypotheses by **inconsistency** count weighted by diagnosticity (Heuer's rule: refute rather than confirm).
- **Algorithms / data:** diagnosticity(e) = 0 if all cells equal, otherwise the spread of relations across hypotheses; hypothesis score = −Σ diagnosticity over INCONSISTENT cells; ties reported as ties, never broken by the model.
- **Needs:** new tables eventually (**approval needed**); can prototype as pure functions plus JSON files first.
- **Experiment:** 6–10 scripted investigations with a known ground-truth explanation (synthetic incident data) comparing: model-ranks-itself baseline vs DHL ranking; count how often the correct hypothesis is top-ranked.
- **Success criteria:** deterministic ranking; on cases where evidence is non-diagnostic, DHL reports "undetermined" while the baseline picks one (this is the measurable difference).
- **Risks:** synthetic ground truth is authored by us (bias); few hypotheses and few evidence items is ACH's known sweet spot, and it does not scale to messy data; cell labelling by a model may be wrong, which EBCL only partly mitigates.

### 2.5 Disagreement-Preserving Verifier Quorum (DPVQ)

- **Different because:** two models from **different providers** (the registry supports several) review only the claims EBCL marked `UNVERIFIABLE_BY_RULE`; on disagreement the platform records both verdicts and surfaces the conflict instead of voting it away; the generating model is never one of the reviewers.
- **Problem solved:** Mission 01 L7 for interpretive claims that have no artifact to check.
- **vs existing:** LLM-as-judge, debate and verifier models are standard. Nothing here is new; the design choice is only "preserve disagreement, exclude the generator, restrict to what rules cannot decide".
- **Architecture:** `VerifierQuorum` service taking claims plus cited artifact text; reviewers return `{verdict, rationale}`; output `AGREE | DISAGREE | UNSURE`; stored on the run, audited metadata-only.
- **Needs:** two configured providers (with free keys this may not be available); extra tokens per claim.
- **Experiment:** human-label ~40 claims (needs a human); compare verifier agreement with labels, and false-accept rate on deliberately wrong claims. Without human labels, no accuracy claim can be made.
- **Success criteria:** false-accept rate on seeded-wrong claims below that of a single same-model judge, with a CI over ≥30 claims; if not, drop it.
- **Risks:** correlated errors across providers (similar training data), cost, and judges favouring fluent answers.

## 3. Recommended build order (feeds Mission 04)

1. **EBCL**: zero tokens, no migration, directly strengthens the existing harness.
2. **ARL**: zero tokens, but **needs your decision on reading real job history and scrubbing**.
3. **ASAR**: only after 1–2, and only with your approval for the schema/architecture change.
4. DHL then DPVQ: after human labels exist.

## 4. Verification status

- Prior-art table: from search-result summaries only; not full papers; maturity/adoption of the cited packages is **not verified**.
- Feasibility notes about DARK AGI code (e.g. `canApprove: false`, synchronous `execute()`, sequence tick) come from the Mission 01 code read; `ExecutionService` and `GraphService` internals were **not** read.
- All scores and success criteria are proposals. Nothing was built or run for this mission.
