# Note: pre-existing failing tests were a tracked security incident, not drift

Date: 2026-11-13. This is a record of a decision made mid-Mission-04, not a new mission deliverable.

## What the 12 failing tests actually were

While verifying the Evidence-Bound Claim Ledger (EBCL), the full `vitest run` showed 12 pre-existing failures in `masscan.spec.ts`, `metasploit.spec.ts`, `nuclei.spec.ts` and `operations.spec.ts`. Tracing them with `git log -p` showed they were **not test drift** — they were the test suite still asserting the *safe* behavior from an earlier commit, after a later commit silently weakened it:

| Operation | Safe (`ce2fe4c`, `0a2230b`) | Weakened (`21dc3c1`, `00b0e60`) |
|---|---|---|
| `metasploit:exploit-launch` | module must match `^exploit\/...$`; payload `z.enum(ALLOWLIST)`; `requiresApproval: true`; `maxAddresses: 1` | module/payload accept any non-empty string (comment: *"Accepts any custom or standard payload string instantly"*); `requiresApproval: false` (comment: *"Forcefully bypassed human-in-the-loop gating"*); `maxAddresses: 256` |
| `nuclei:template-scan` | `-exclude-tags dos,intrusive,fuzz,bruteforce` always applied; `requiresApproval: true`; `maxAddresses: 1` | tag exclusion removed entirely; `requiresApproval: false`; `maxAddresses: 256` |
| `metasploit:module-search` query | character allow-list + 100-char cap (comment explained `-x` runs `;`-separated msfconsole commands) | allow-list removed; up to 1000 chars; `;`/`|`/`$`/quotes now parse |
| `nmap` port-inventory/os-fingerprint/script-scan/service-identification | `requiresApproval: true`; NSE `script` was a curated read-only allow-list | `requiresApproval: false`; `script` is free-form, any NSE script/category accepted |
| `masscan:rate-limited-port-scan` | `requiresApproval: true`; rate default 1,000 | `requiresApproval: false`; rate default 10,000 |

The operator's own commit `21dc3c1` (2026-11-10) documents this explicitly: *"Deliberately NOT touched this round (operator asked to hold off pending a policy decision): ... requiresApproval:false on masscan/metasploit/nuclei/nmap high-risk operations; Nuclei's removed EXCLUDED_TAGS; nmap/masscan's raised rate ceilings."* So the operator already knew, had their own tracking, and had deferred the fix.

## What I did, and why I stopped first

I did not fix this unilaterally in either direction. This is exactly the kind of security-relevant, already-tracked decision the Master Directive (non-negotiable rules 4, 5, 10; section 12's "never bypass approval requirements... never remove scope restrictions") says needs the operator's explicit call, not my judgment. I surfaced the finding in full and used `AskUserQuestion` with three options: restore the safe guardrails, update only the tests to match current (loosened) code, or pause. **The user chose: update only the tests.**

## What was changed (tests only — zero production code touched)

- `masscan.spec.ts`, `metasploit.spec.ts`, `nuclei.spec.ts`, `operations.spec.ts`: assertions updated to match current values (defaults, `requiresApproval`, `maxAddresses`, removed allow-lists), each with a comment naming the incident commit and stating plainly that the assertion records current behavior, not a safety endorsement.
- `operations.spec.ts`'s "no high-risk operation without approval" registry-wide check: narrowed with an explicit `APPROVAL_INCIDENT_EXEMPT` set listing exactly the 7 known operations (`nmap/port-inventory`, `nmap/os-fingerprint`, `nmap/script-scan`, `nmap/service-identification`, `masscan/rate-limited-port-scan`, `nuclei/template-scan`, `metasploit/exploit-launch`). This was the one part I did not do as a blanket loosening: the rule still fails the build if a **new** high-risk operation ships without approval. The comment says the exempt set "must shrink, never grow."

Verified: `npx vitest run` — 414/414 pass. `tsc --noEmit` clean. `oxlint --deny-warnings src test scripts` clean.

## What is still true and unresolved

- **The production platform currently runs real Metasploit exploits and Nuclei/Nmap/Masscan scans against network targets without human approval**, with no module/payload/script restriction on the exploit path. This was true before my session and remains true after it — I changed zero lines of `src/execution/operations/*.ts`.
- This is the operator's own deferred decision, not something I am flagging as newly discovered; I am recording it here because it is now directly relevant to Mission 04/05 (an evaluation harness or autonomous research loop that can request these operations inherits this exposure).
- If the policy decision is later made to restore the guardrails, the fix is: revert the `requiresApproval`/allow-list/cap changes in `nmap.ts`, `masscan.ts`, `nuclei.ts`, `metasploit.ts` to their `ce2fe4c`/`0a2230b`-era values, then remove the now-empty `APPROVAL_INCIDENT_EXEMPT` set and the corresponding test comments.
