# Mission 02 acceptance test, run: DHL vs a naive confirmation-counting ranker

Date: 2026-11-13. File: `dark-agi-backend/src/hypotheses/dhl-acceptance.spec.ts`. The last unblocked item from Mission 02's DHL design and from Mission 04/05's backlog that needed neither the real-job-history decision nor a real model call.

## What this is, honestly

**No model was run.** "Naive ranker" is a 6-line deterministic function (net = consistent-count minus inconsistent-count, no diagnosticity weighting, ties broken by sort order and never reported). It stands in for the specific failure mode Heuer's method corrects — mistaking volume of confirming evidence for proof — not for any real LLM's behavior, which I have not measured here.

**The 6 scenarios are authored fixtures, not real case studies.** I wrote the hypotheses, evidence text and the cell matrix myself; "ground truth" is simply which hypothesis I built to survive refutation. They test whether the scoring *algorithm* behaves the way Heuer's method says it should, not whether any of the described incidents are realistic.

Construction rule used throughout (verifiable directly from `dhl.ts`'s scoring code, not from arithmetic I had to get right by hand): a hypothesis with **zero** `INCONSISTENT` cells always scores exactly `0`; one with at least one `INCONSISTENT` cell scores below `0` as long as some other hypothesis has a different rating for that same evidence item. So each scenario just needed: the intended-correct hypothesis marked `NEUTRAL`/unmentioned everywhere, and every other hypothesis given at least one `INCONSISTENT` mark the correct one doesn't share.

## Real results (computed, then verified by a throwaway debug run before being written up; not hand-estimated)

| Scenario | Domain | DHL top (score) | DHL tied? | Naive top (net) | Naive tied? | Outcome |
|---|---|---|---|---|---|---|
| net-outage | network | firewall (0) vs isp (−1) vs crash (−1) | no | — | **yes, 3-way (0,0,0)** | DHL decides cleanly; naive can't decide at all |
| win-host | windows | admin-task (0) vs malware (−1) vs misconfig (−2) | no | malware (net 3) | no | Naive confidently picks the wrong one |
| malware-c2 | malware | c2-callback (0) vs false-positive (−1) vs benign-tool (−1) | no | false-positive (net 2) | no | Naive confidently picks the wrong one |
| web-incident | web | sql-injection (0) vs header-misconfig (−1) vs ddos (−1) | no | ddos (net 2) | no | Naive confidently picks the wrong one |
| forensics-exfil-timing | forensics | before-close (0) vs after-close (0) | **yes** | before-close (net 2) | no | DHL honestly reports a tie; naive confidently (wrongly) resolves it |
| crypto-cert | crypto | expired-only (0) vs weak-cipher-too (0) | **yes** | weak-cipher-too (net 2) | no | DHL honestly reports a tie; naive confidently (wrongly) resolves it |

Summary test over all 6: DHL is correct-or-honestly-undetermined in **6/6**; the naive ranker never once matches DHL's answer in **6/6** — either picking the wrong hypothesis outright (4 scenarios) or, in `net-outage`, failing to discriminate at all where DHL found a clean answer.

## A finding I did not expect going in

My working narrative while designing the scenarios was "naive confidently picks the wrong answer, DHL correctly refuses or gets it right." `net-outage` broke that narrative in a different, equally real direction: naive's unweighted counting produced a flat 3-way tie (every hypothesis net 0), while DHL — by correctly discounting the shared, non-diagnostic "everyone lost contact" evidence and weighting the two genuinely diagnostic refutations — found a clean, unique winner. I'm reporting this as-is rather than editing the scenario to fit the pattern I expected, per this program's own rule against reporting a result that wasn't actually computed.

## Verified

- `npx vitest run src/hypotheses`: 21/21 (14 from `dhl.spec.ts` + 7 from `dhl-acceptance.spec.ts`).
- Full suite: **466/466** (was 459 before this).
- `tsc --noEmit`, `oxlint --deny-warnings`: both clean (lint caught 4 real `no-conditional-expect` violations in my first draft of the per-scenario test; fixed by computing an unconditional `dhlTop`/`naiveTop` value instead of branching inside the assertion).

## Process note: a debug script was written and fully removed

To get real computed scores for the table above (rather than estimate them by hand and risk being wrong), I temporarily exported `SCENARIOS`/`naiveRank` from the spec file, added a throwaway `__debug-print.spec.ts` that wrote the computed values to a file, read that file, then deleted the debug spec and its output file and reverted the exports. `git status` on `dark-agi-backend` after this work shows only the one new, intended file (`dhl-acceptance.spec.ts`) — no debug artifacts were left behind or committed.

## What this does and doesn't prove

- **Does show**: the DHL scoring algorithm implements the specific principle it was designed around (refutation over confirmation, diagnosticity-weighted) in a way a naive confirmation-counter does not, on constructed examples built to isolate exactly that difference.
- **Does not show**: that DHL would outperform a real LLM's self-ranking, or that these specific hypotheses/evidence resemble a real incident. Both would need the open decisions already on record (real data, or token spend on a real model) to test honestly.
