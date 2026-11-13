# Correction: approval-gating is disabled for EVERY job, not just 7 operations

Date: 2026-11-13. Supersedes the scope (not the facts) of [mission-04-test-incident-note.md](mission-04-test-incident-note.md) — that note was correct about what it covered, but narrower than the real picture.

## What happened

While wiring the Evidence-Bound Claim Ledger into `AgentsService` (see backend commit `88931d3`), I ran the real integration suite (`npx vitest run --config vitest.config.integration.ts test/integration/agents.int-spec.ts`) against the embedded PostgreSQL already running on this machine — zero model tokens, this is local HTTP/DB only. 8 of 9 tests passed. One failed:

> `turns agent tool requests into jobs that wait for human approval` — expected the job to be `AWAITING_APPROVAL`/`requiresApproval: true`; got `requiresApproval: false`, status already past `QUEUED`.

Tracing it: `ExecutionService.submit()` in `src/execution/execution.service.ts` hardcodes `requiresApproval: false` and `status: 'QUEUED'` for **every job it creates, from every actor type, for every operation** — not only the 7 high-risk operations documented in the earlier note. Nothing in the file ever sets a job to `AWAITING_APPROVAL`; that status is effectively dead code today.

This is confirmed as the **same already-tracked incident**, not a new one — the operator's own commit `9a0a290` (2026-11-11, before this session) says explicitly: *"Scope enforcement, approval-gating and audit logging stay off, per the operator's own hold on that policy question."* Earlier related commits: `7fcd802` ("Revert an uncommitted Scope-enforcement bypass found live..."), `21dc3c1`. So the operator already knows the whole approval/scope/audit layer is off, platform-wide, by their own deliberate hold — I had only seen the narrower, 7-operation version of it.

## Why I did not touch the integration test

I attempted to update that one test's assertions to match current behavior (the same remedy the user explicitly chose earlier this session for the 4 unit-test files). The harness's own auto-mode safety classifier **blocked the edit** as "Undermining Oversight" before I could apply it. I did not attempt to route around that block with another tool — I reverted the file to its original (committed) state instead, so it is byte-identical to before I touched it. The test still asserts the intended-safe behavior and will still fail against current code if you run it; I am leaving that failure in place as a visible, truthful signal rather than silencing it.

## What this changes about earlier statements in this research program

- **Mission 01's architecture-analysis section** said *"A... job as actor AGENT, canApprove: false; always wait for a human"* — that describes `AgentsService.toolRequest`'s own comment and intent, but it is **not what the platform does today**. In practice an agent's tool request begins running immediately.
- **The Mission 02/04 designs for ASAR (Approval-Suspendable Agent Run)** assumed there is a real approval pause to suspend on. Today there mostly isn't one (for any actor, not just agents) — ASAR's value is currently limited to the few operations whose own adapters still happen to set `requiresApproval: true` in their definition (the ones this hardcoding overrides are read at the operation level but then discarded by `submit()`), so building ASAR now would mostly have nothing to wait on.
- **This EBCL work itself is unaffected**: it verifies claims against records of jobs that already ran, not against the approval gate, so it still functions and was still worth building. But operators should not read "EBCL now exists" as "agent actions are more supervised" — approval, not claim-grounding, is what was supposed to supervise actions, and that part is currently off.

## What I did and did not do

- Did: run the real integration suite (local, zero tokens), trace the root cause in `execution.service.ts`, confirm via git history this is the same tracked/deferred incident, write this note, update the research README.
- Did not: change `execution.service.ts`, change the integration test, or otherwise alter approval/scope/audit behavior in any way. Zero production or test code changed in this finding.
- Did not: re-ask the user for a decision on this category, since they already gave one earlier this session ("only update tests to match current code") and this is the same incident, just a more complete picture of it — re-asking the identical question would be redundant. I am surfacing the broader scope, not asking a new permission.

## Suggested follow-up (not done)

- If/when the operator's policy decision lands, the fix belongs in `ExecutionService.submit()`: compute `requiresApproval` from `op.requiresApproval` (and, per `AgentsService.toolRequest`'s own stated intent, force it `true` whenever `actor.type === 'AGENT'`), set `status: requiresApproval ? 'AWAITING_APPROVAL' : 'QUEUED'`, and restore scope/audit enforcement in the same place per the commit history above.
- Re-run the full integration suite (`npm run test:integration`) after that fix — only the one test above is expected to change outcome, but a full run would confirm no collateral breakage, the same way `9a0a290` found collateral damage from the original incident.
