# Mission 04 — Attested Replay Lab (ARL), core

Date: 2026-11-13. Selected tool: invention #2 from [mission-02-inventions.md](mission-02-inventions.md). Repo: `dark-agi-backend`, same branch, built on synthetic data only.

## Why this scope, now

The user said "do what you think is best." Full ARL (per Mission 02 §2.2) needs reading real `Job` history to record cassettes, which is still an open privacy decision I have not been given. The core mechanism — cassette format, a content-addressed key, a scrubber, a `SimulatedEngine` that never falls through to anything real — needs no real data at all and is useful on its own (hand-written or future-recorded cassettes both work the same way). So I built exactly that slice, deferring the "read real job history" step untouched.

## What was built (verified offline, zero tokens)

| File | What it is |
|---|---|
| `src/replay/cassette.ts` | `Cassette` type, `cassetteKey()` (canonical, key-order-independent, SHA-256-based), `CassetteStore`, `SimulatedEngine.run()` (throws `NoCassetteError` on any miss — never executes anything real) |
| `src/replay/scrubber.ts` | `Scrubber` class + `scrub()`/`scrubDeep()`: replaces real IPv4 → RFC 5737 doc-range addresses, Windows `C:\Users\<name>\` segments, and `user=`/`account:` fields — same real value → same replacement, consistently, across an entire structure |
| `src/replay/cassette.spec.ts`, `scrubber.spec.ts` | 20 unit tests |

## A real bug found and fixed during this work

My first `scrubDeep` implementation called the pure, single-use `scrub()` function independently on every string in a structure. Each call started a fresh replacement map, so the *first* IP seen in any field — regardless of which real IP it actually was — always became `192.0.2.1`. Two different real hosts in different fields of the same object collided onto the identical synthetic address, which silently destroys the one thing a cassette scrubber exists to preserve: that the same real host stays recognizably the same host, and different hosts stay different. My own test (`scrubs every string in a nested structure...`) caught this immediately.

Fix: extracted a stateful `Scrubber` class whose three maps (IPs, user paths, accounts) are shared across every string processed in one `applyDeep()` call; `scrub()`/`scrubDeep()` are now thin wrappers that create one `Scrubber` per call. Added a dedicated regression test (`does not collide two different real IPs onto the same replacement across separate fields`) plus its positive counterpart (`still maps a repeated real IP ... to the one same replacement`) so this exact failure mode can't silently return.

## Verified

- `npx vitest run src/replay`: 20/20.
- Full suite `npx vitest run`: **439/439** (was 419 before this addition — 20 new tests, 0 regressions).
- `tsc --noEmit`: clean. `oxlint --deny-warnings`: clean.

## What this is NOT (limits, unchanged from the Mission 02 design)

- **No recording from real data.** Every cassette in this repo's tests is hand-written synthetic (RFC 5737/1918). Recording from real `Job` rows is still the open, undecided step.
- **The scrubber is narrow by design** — three patterns only (IPv4, Windows user paths, `user=`/`account:` fields). It is explicitly *not* a general PII scrubber; a cassette built from real data still needs human review before anyone trusts it, exactly as flagged in Mission 02.
- **No integration with AgentsService / ExecutionService yet.** `SimulatedEngine` is a standalone class; wiring an agent-loop test to use it instead of a real job is future work, and is lower priority now that the approval-gating incident (see [mission-04-approval-incident-is-platform-wide.md](output/mission-04-approval-incident-is-platform-wide.md)) means there's little real "wait for a tool result" behavior to test against yet.
- Array reordering inside `cassetteKey`'s canonicalization only normalizes object-key order, not array element order (an array of objects in a different order produces a different key) — documented in the code comment, not a bug, just a scope limit.

## Next steps (not done, need a decision or more time)

1. Decision needed: may I read real `Job` rows to record cassettes (through this scrubber, reviewed before trusting)?
2. Real-model baseline for the eval harness — still waiting on which free model/key to use.
3. Everything else in the roadmap (DHL, DPVQ, Mission 05) is behind those two.
