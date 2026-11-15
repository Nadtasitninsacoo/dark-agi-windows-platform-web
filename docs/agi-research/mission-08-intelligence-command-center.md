# MISSION 08 — INTELLIGENCE COMMAND CENTER

Pasted verbatim from the user on 2026-11-15, alongside 3 reference screenshots (an "AI Research Hub" dashboard, an "Orchestra" multi-agent pipeline view, and a GPU-cluster/flywheel ops dashboard) as visual inspiration only — not existing DARK AGI UI. Explicitly structured by the user as 10 phases, one at a time, each reviewed before the next starts ("STOP and wait for my review. Do not automatically begin Phase 2.").

Phase 1 (Architecture Discovery, read-only) is DONE — see "Phase 1 output" below. Phase 2 (Dashboard Foundation, first slice) is DONE — see "Phase 2 output" below. Phase 3 (AGI Core & Operations, first slice) is DONE — see "Phase 3 output" below. Phase 4 (Learning & Memory, first slice) is DONE — see "Phase 4 output" below. Phase 5 (Hypothesis & Research, honest placeholder) is DONE — see "Phase 5 output" below. Phase 6 (Experiment & Discovery, honest placeholder) is DONE — see "Phase 6 output" below. Phase 7 (Multi-Agent Intelligence, first slice) is DONE — see "Phase 7 output" below. Phase 8 (Self-Improvement, first slice) is DONE — see "Phase 8 output" below. Phases 9-10 and the rest of Phases 2/3 NOT STARTED.

---

DARK AGI — INTELLIGENCE COMMAND CENTER

ผมแบ่งภาพรวมออกเป็น 10 ระบบหลัก

01. AGI CORE STATUS (Core) — Intelligence status, reasoning activity, active cognitive processes, current objectives.
02. AUTONOMOUS OPERATIONS — Active tasks, planning, execution, task history, failure recovery.
03. LEARNING & MEMORY — Knowledge acquisition, memory formation, knowledge graph, learning history, knowledge retrieval.
04. HYPOTHESIS ENGINE — Hypothesis generation, competing hypotheses, evidence collection, confidence evaluation, hypothesis validation.
05. RESEARCH LAB — Research objectives, literature analysis, research progress, scientific discoveries, research reports.
06. EXPERIMENT ENGINE — Experiment queue, simulation status, test results, statistical evaluation, reproducibility.
07. MULTI-AGENT INTELLIGENCE — Active agents, agent responsibilities, inter-agent communication, task delegation, collaboration results.
08. SCIENTIFIC DISCOVERY — Physics research, mathematical models, algorithm discovery, computational predictions, verified findings.
09. SELF-IMPROVEMENT — Performance evaluation, error analysis, strategy optimization, capability improvements, benchmark history.
10. SECURITY & GOVERNANCE — Permissions, execution approvals, scope enforcement, audit logs, resource monitoring.

แผนการพัฒนาแบบทีละขั้น: Phase 1 Architecture Discovery -> Phase 2 Dashboard Foundation -> Phase 3 AGI Core & Operations -> Phase 4 Learning & Memory -> Phase 5 Hypothesis & Research -> Phase 6 Experiment & Discovery -> Phase 7 Multi-Agent Intelligence -> Phase 8 Self-Improvement -> Phase 9 Intelligence Analytics -> Phase 10 Integration & Verification.

## DARK AGI — PHASE 1: INTELLIGENCE COMMAND CENTER ARCHITECTURE DISCOVERY

You are the Principal AI Systems Architect and Senior Frontend Engineering Director for DARK AGI. Our objective is to develop a comprehensive AGI Intelligence Command Center Dashboard providing a unified operational view of the entire DARK AGI intelligence ecosystem — visualizing actual activities and measurable states (AGI core/reasoning, autonomous planning/execution, learning, persistent memory, hypothesis generation/evaluation, scientific research, mathematical modeling/simulation, experimental execution, multi-agent collaboration, self-evaluation/improvement, intelligence benchmarks, security/governance).

IMPORTANT: WORK IN PHASES — do not build the entire dashboard at once; develop incrementally, each phase independently reviewed and verified before proceeding.

PHASE 1 OBJECTIVE — COMPLETE ARCHITECTURE DISCOVERY. For this phase, DO NOT IMPLEMENT ANY CODE. Do not create components, modify files, install dependencies, modify databases, or change existing APIs. Responsibility: thoroughly inspect the existing project and produce an implementation-ready dashboard architecture.

STEP 1 — INSPECT BOTH REPOSITORIES (`dark-agi-backend`, `dark-agi-frontend`): verify actual directory structure; identify existing backend modules, frontend pages, API endpoints, database models/tables, AI agent architecture, task execution engine, research/experiment functionality, memory/knowledge systems, telemetry/monitoring, auth/authorization, WebSocket/real-time infrastructure. Never assume a capability exists without inspecting its implementation.

STEP 2 — CAPABILITY INVENTORY: classify every requested dashboard capability into A (already implemented and operational), B (implemented but not integrated into the dashboard), C (partially implemented), D (requires new backend functionality), E (experimental/future research). Identify each capability's actual data source.

STEP 3 — DASHBOARD INFORMATION ARCHITECTURE: design a complete navigation structure (may recommend a better structure than the 10 sections above if justified by the actual architecture).

STEP 4 — MAIN OVERVIEW DASHBOARD: define exactly what it should display (current state, active objectives, operations, reasoning/planning activity, learning activity, new knowledge, hypothesis generation, active research, running experiments, agent collaboration, latest verified findings, system performance, errors/warnings). For every visualization specify data source, API endpoint, data structure, update frequency, loading/empty/error states. IMPORTANT: do not create fake intelligence metrics or artificial AGI scores — if the system cannot measure a capability, explicitly identify the missing instrumentation.

STEP 5 — DATA INTEGRATION ARCHITECTURE: explain how the frontend obtains backend data; prefer existing API contracts; identify where new endpoints/DB fields/event streams/telemetry would be required; maintain type safety, API compatibility, real-time data consistency, error handling, authentication, backend authorization. Never let the frontend become the authority for security decisions.

STEP 6 — VISUAL DESIGN DIRECTION: high-end futuristic intelligence command center — dark black/charcoal foundation, neon green primary intelligence indicators, subtle emerald highlights, professional technical typography, dense but readable information, real-time operational activity, advanced charts, clear information hierarchy, responsive layout. Avoid excessive decorative effects; communicate actual system intelligence/operational state, not just a futuristic look.

STEP 7 — IMPLEMENTATION ROADMAP: break into small, independently verifiable phases, each with objective, frontend/backend files involved, API/data requirements, dependencies, sequence, testing requirements, acceptance criteria. Prioritize the main dashboard foundation first; do not attempt all sections simultaneously.

REQUIRED PHASE 1 DELIVERABLES: (1) existing architecture analysis, (2) backend capability inventory, (3) frontend capability inventory, (4) AGI capability availability matrix, (5) dashboard information architecture, (6) main dashboard wireframe specification, (7) data integration architecture, (8) missing backend capabilities, (9) proposed frontend component structure, (10) phased implementation roadmap, (11) risks and technical constraints, (12) recommended first implementation milestone.

STRICT EXECUTION RULES: do not modify any files during Phase 1; do not install packages; do not create mock implementations presented as real functionality; do not fabricate existing API endpoints; do not assume learning or reasoning is occurring merely because an AI request was executed; distinguish observable events from inferred cognitive processes; preserve existing architecture and security controls; do not bypass authorization, scope restrictions, or approval workflows. At the end, STOP and wait for review — do not automatically begin Phase 2.

สิ่งที่ผมต้องการจากคุณในตอนนี้: ส่ง Prompt นี้ไป Claude แล้วนำคำตอบทั้งหมดกลับมาให้ผมตรวจสอบ ยังไม่ต้องให้ Claude เขียนโค้ดครับ ผมอยากตรวจสอบก่อนว่า Claude เข้าใจระบบเดิมของ DARK AGI มากน้อยแค่ไหน และมันจะวาง Dashboard อย่างไรโดยไม่สร้างระบบซ้ำกับของเดิม

เป้าหมายสุดท้ายคือ เมื่อเปิด DARK AGI ขึ้นมา จะเห็นภาพรวมได้ว่า: ระบบกำลังทำอะไรอยู่ / กำลังใช้ความสามารถใดในการแก้ปัญหา / กำลังเรียนรู้อะไร / กำลังสร้างสมมติฐานอะไร / สมมติฐานใดผ่านหรือไม่ผ่านการตรวจสอบ / กำลังทำวิจัยเรื่องอะไร / กำลังทดลองอะไร / Agent แต่ละตัวกำลังรับผิดชอบอะไร / ระบบพัฒนาประสิทธิภาพขึ้นจริงหรือไม่ — และที่สำคัญที่สุด ทุกอย่างต้องเชื่อมกับข้อมูลและเหตุการณ์ที่เกิดขึ้นจริงในระบบ ไม่ใช่ตัวเลขจำลองที่สร้างขึ้นมาเพื่อให้ Dashboard ดูเหมือน AGI.

---

## Phase 1 output (2026-11-15, Claude)

Read-only discovery across both repos (two parallel research forks — one per repo — then synthesized). Full report was given directly in the conversation, not as a separate output file (kept here as the canonical summary instead of duplicating a huge report into a second file). Key findings:

- **AGI capability availability matrix** (the 10 sections, graded A/B/C/D exactly as Step 2 asked):
  - 1 AGI Core Status — **D**. No aggregate "what is the AGI doing right now" model/endpoint exists anywhere. Closest proxy: `GET /agents/:id`, `GET /agents/runs/:runId` (one run at a time).
  - 2 Autonomous Operations — **A**. `GET /jobs?status=RUNNING`, `GET /engine` (real counts/running-list/last24h/limits) — usable today, no new backend work.
  - 3 Learning & Memory — **C**. `AgentMemory` is real but operator-authored notes, not something the AGI forms itself; no knowledge graph.
  - 4 Hypothesis Engine — **B**. `src/hypotheses/dhl.ts` (backend) is real, unit-tested Heuer's-ACH logic, but zero DB persistence and no controller anywhere — not reachable from any API today.
  - 5 Research Lab — **B/D**. `src/research/cycle.ts` models 6 of the stated 10 stages, zero DB/controller. Real research output (the Mission 03 physics items) lives only as markdown files in this frontend repo's `docs/agi-research/output/`, not in any database or API.
  - 6 Experiment Engine — **B/D**. Same file as #5; no experiment queue or persisted experiment records exist at all.
  - 7 Multi-Agent Intelligence — **A** for the delegation tree (`AgentRun.parentRunId`/`depth`/`children`, fully real and queryable today), **C** for "collaboration" as the reference screenshots frame it — this is sequential delegation, not concurrent multi-agent chat.
  - 8 Scientific Discovery — **D**. No backend model exists; `findings`/`forensics`/`attack-graph` are real but are security-operations data, not physics/math findings.
  - 9 Self-Improvement — **A** for `AiModel` success/failure/latency counters (real, DB-persisted, exposed via `GET /ai/models`) and the Evidence-Bound Claim Ledger (real, wired into `agents.service.ts` production code, opt-in via `AgentRunBody.verifyClaims`); **B** for the eval harness (real but script-only, `scripts/eval-agents.mjs`, no persisted run history); **D** for any actual capability-improvement-over-time view.
  - 10 Security & Governance — **A**, the most complete section: permissions (RBAC), approvals (fixed the same day as this discovery — see the backend's own `docs/architecture/roadmap.md` "Approval-gating restored platform-wide" entry), scope enforcement, hash-chained audit (list + verify), telemetry.
- No existing dashboard/overview aggregate endpoint anywhere (`src/system/` is a Windows/runtime environment probe only). Two narrow Socket.IO namespaces exist (`/telemetry` — host CPU/mem/disk only; `/defense` — honeypot/IOC events only); neither covers agent/job/research activity, so anything beyond polling needs a new namespace, following that existing per-concern pattern rather than one shared bus.
- Frontend already has a real overview page at `/` (`command-center.tsx`) with host telemetry, agent/provider/tool-registry/execution-queue tiles, recent audit list, recent-agent-runs list, and an already-honest placeholder (`"Findings summary: Not implemented yet (Phase 5)"`) — the right move is extending this page, not building a new one from scratch. No charting library is used anywhere (every chart is hand-built inline SVG); `src/app/tasks/dsn-live-chart.tsx` is the project's best existing precedent for labeling a derived/extrapolated number honestly rather than presenting it as a fresh real reading.
- Recommended reordering of the roadmap (the directive explicitly allows this): ship Autonomous Operations / Multi-Agent / Security-Governance / Self-Improvement sections first (all A/B today), hold Hypothesis / Research / Experiment / Scientific Discovery as `planned` placeholders (the existing `modules.ts` already supports this exact mechanism) until their backend persistence+controller gap is actually closed — building a UI for them now would mean inventing numbers to fill empty space, which Step 4's own rule explicitly forbids.
- Recommended first milestone (**what Phase 2 below implements**): extend the existing `/` overview with an approvals-pending tile and an audit-chain-integrity badge (both 100% real data, zero new backend work), then build a Multi-Agent delegation-tree view as the first genuinely new page (data is already fully real, only the visualization doesn't exist yet).

## Phase 2 output (2026-11-15, Claude) — Dashboard Foundation, first slice

User said "เริ่ม Phase 2 เลย" after reviewing the Phase 1 report. Implemented only the first half of the recommended milestone (the delegation-tree view is a larger, separate piece of work — next).

- `src/app/command-center.tsx`: added an **Approvals Pending** tile (reuses the `engine` SWR call already on the page — `engine.counts.AWAITING_APPROVAL`, no new endpoint — `warning` tone when > 0, links to `/tasks` where the real approve/reject actions already exist) and an **audit chain integrity badge** on the "Recent audit activity" panel (`GET /audit/verify`, `AuditVerification.valid`, names the first bad sequence number on failure; polled at 60s rather than the page's usual 10-15s since `AuditService.verify()` recomputes the whole hash chain server-side on every call).
- No new backend endpoints, no new permissions, no new Prisma models — both tiles consume types already generated from the existing OpenAPI contract (`EngineStatus`, `AuditVerification`).
- Verified: `tsc --noEmit` and `eslint` clean on the changed file. Not verified: actual rendered appearance in a browser — no browser-automation tool exists in this environment (confirmed again this session: a `playwright-core` install attempt was correctly stopped by the user mid-command rather than completed), so this is a disclosed gap, not a hidden one, consistent with every other frontend change in this research program.
- Not started: Phase 2's second half (Multi-Agent delegation-tree page).

## Phase 3 output (2026-11-15, Claude) — AGI Core & Operations, first slice

User said "ต่อ phase 3" directly (skipping the rest of Phase 2). The original Phase 3 title combines two of the 10 sections — AGI Core Status (graded **D** in Phase 1: no backend capability for "reasoning/cognitive state" exists at all) and Autonomous Operations (graded **A**: real and queryable today). Rather than invent a fake "cognitive state" visualization for the D-graded half, scoped this to exactly what's real: connecting the *existing* per-agent "N running now" status (`Agent.stats.running`, already shown on `/agents` since before this mission) to *what that running agent is actually doing* — its real task text and the real tool/delegation/claim requests it has made, each linked to the actual job it produced.

- `src/app/agents/agent-console.tsx`: added one new poll (`GET /agents/runs?limit=30`, 4s interval) grouped client-side into `runningByAgent: Map<agentId, AgentRun[]>` (status `RUNNING` only — `AgentRun.requests[]` already carries `{type, decision, tool, operation, jobId, ...}` per entry, so no new backend field or endpoint was needed). A new `ActiveTask` component renders, under any agent card currently running: the task text, and each request with its real decision (`EXECUTED`/`QUEUED`/`DENIED`/`VERIFIED`/... — a `DECISION_TONE` map, never color-alone, every badge keeps its text label) plus a `/tasks?job=<id>` deep link into the already-existing job detail view where a request produced one.
- A fetch failure on the new poll shows its own `ErrorNotice` — deliberately not left to silently collapse into "nothing is running", which would otherwise look identical to a real empty state.
- No new backend endpoints, no new Prisma fields, no new permissions. tsc/eslint clean. Not verified: rendered appearance in a browser (same disclosed gap as Phase 2 — no browser-automation tool in this environment).
- Deliberately NOT done in this slice: a dedicated "AGI Core Status" page/section for agents that are currently idle (nothing to show honestly beyond what `/agents`'s existing overview cards already display); Autonomous Operations' own deeper view (job-count trends over time) would need new backend time-series support, flagged in Phase 1's "missing backend capabilities" list, not built here.

Between Phase 3 and Phase 4, the user asked directly why no real "cognitive state" data exists and whether any of this work gives the system actual thought. Answered plainly, in the conversation (not duplicated in full here): each `AgentRun` is one bounded request/response cycle, not a continuously running process — there is no architecture anywhere that reasons or plans *between* runs, and no model provider exposes a queryable "currently reasoning about X" state in the first place, so there was structurally nothing honest to visualize for AGI Core Status beyond activity logging (which Phase 3 did). Visualizing existing data does not, and cannot, grant new cognitive capability — building actual continuous reasoning/planning/self-reflection would be a separate, large architecture project, not a dashboard phase. User asked to continue Phase 4 first and revisit that discussion afterward.

## Phase 4 output (2026-11-15, Claude) — Learning & Memory, first slice

Learning & Memory was graded **C** in Phase 1: `AgentMemory` is real and persisted, but every note is written by a human operator (via the existing per-agent Memory panel), not something an agent forms or learns itself, and there is no knowledge graph linking notes together. Scoped this slice to exactly that reality rather than implying more.

- `src/app/agents/agent-console.tsx`: new `MemoryOverviewPanel`, rendered above the per-agent detail grid (same placement tier as the Phase 3 overview). Fetches every agent's `/agents/:id/memories` in parallel through one `useSWR` call with a custom fetcher (keyed on the sorted list of agent ids) — no bulk-memory endpoint exists on the backend, and with only a handful of agents this was cheaper than adding one. Shows total note count, a per-agent breakdown, and a combined reverse-chronological list (agent name + relative time + content). The panel's own body text states outright that these are operator-written notes, that no agent writes its own memory, and that there is no knowledge graph yet — the "missing instrumentation" disclosure the directive's Step 4 explicitly requires, kept in the UI itself rather than only in this doc.
- Implementation note: a first pass using manual `useState`/`useEffect` tripped this repo's `set-state-in-effect` lint rule (it flags any function called from an effect that eventually calls `setState`, even after an `await`); rewritten on `useSWR` instead, consistent with every other data fetch in this codebase, which both satisfies the lint rule and gets `mutate()`-based refresh for free.
- No new backend endpoints, no new permissions, no new Prisma fields. tsc/eslint clean. Not verified: rendered appearance in a browser (same disclosed gap as Phases 2-3).
- Deliberately NOT done: any form of automatic knowledge acquisition or a real knowledge graph — both would be new backend capability (flagged as such in Phase 1's "missing backend capabilities" list), not something a frontend slice can honestly simulate.

## Phase 5 output (2026-11-15, Claude) — Hypothesis & Research, honest placeholder

Hypothesis Engine and Research Lab were graded **B**/**B+D** in Phase 1: real, tested backend logic exists (`src/hypotheses/dhl.ts`'s Heuer's-ACH ranking; `src/research/cycle.ts`'s 6-of-10-stage prototype), but neither has database persistence or an API — there is no real, reachable data a live dashboard could show. Building one anyway would mean fabricating activity, which this mission's own Step 4 explicitly prohibits. Mission 09 (logged the same day) is the separate, larger initiative that would eventually make this real; Phase 5 here does not wait for it.

- `src/lib/modules.ts`: added `hypothesis-engine` (phase 33) and `research-lab` (phase 34) as the **first-ever** uses of the existing `status: 'planned'` mechanism in this codebase (every other module had been `live` since the file was created). No new components were needed — `src/app/[module]/page.tsx` already renders an honest "not operational yet" placeholder for any `planned` module, and `sidebar.tsx` already shows a phase badge for one; this slice just supplied the data.
- Each module's summary states plainly what's real today (a tested ranking engine / a 6-of-10-stage prototype) and the `planned` list names exactly what's missing (persistence, an API, the remaining 4 stages) rather than leaving the gap implicit.
- Verified live: both new routes (`/hypothesis-engine`, `/research-lab`) return 200 and render the placeholder. tsc/eslint clean.
- Not done, deliberately: anything resembling a live hypothesis/research tracker — that depends on Mission 09's own Milestone 1/5 work landing first.

## Phase 6 output (2026-11-15, Claude) — Experiment & Discovery, honest placeholder

Same reasoning and same mechanism as Phase 5, for the same reason: Experiment Engine (**B/D**) and Scientific Discovery (**D**) have no real, reachable data either.

- `src/lib/modules.ts`: added `experiment-engine` (phase 35) and `scientific-discovery` (phase 36), both `status: 'planned'`.
- Experiment Engine's summary is explicit that it currently overlaps entirely with Research Lab's own prototype (same file, `src/research/cycle.ts`) and that no experiment-queue/record/repeatability concept exists anywhere yet — named separately rather than silently folded into the Research Lab placeholder, since the master directive's own navigation treats them as distinct end-state capabilities.
- Scientific Discovery's summary is more specific than "nothing exists": the four Mission 03 physics items (pendulum, Biot-Savart, heat diffusion, relativity — each independently cross-checked) are real work that happened, it's just developer documentation in this repository today, not data the running application can read. Worth stating plainly rather than letting the placeholder imply no research occurred at all.
- Verified live: both new routes return 200 (first hit needed a longer timeout for Next's on-demand dev-mode compilation — not an error). tsc/eslint clean.
- Not done: anything that would let this app actually read/display the existing physics reports or track real experiments — both still need Mission 09-scale backend work.

## Phase 7 output (2026-11-15, Claude) — Multi-Agent Intelligence, first slice

Graded **A** for the delegation data itself in Phase 1, **C** for "collaboration" as the reference screenshots framed it (this is sequential task delegation, never concurrent agent-to-agent chat). A per-run delegation tree already existed before this phase (`HistoryPanel` → `RunView`, built on `buildRunTree` over one run's real `descendants`) — but only for one already-selected agent's one already-selected run, no cross-agent view of the delegation graph itself.

- `src/app/agents/agent-console.tsx`: new `CollaborationPanel`, combining two real sources with zero new backend work: `Agent.delegatesTo` (already returned by `/agents` — the static, permitted delegation graph) and a new `/agents/runs?limit=100` poll reduced client-side into real `delegate`-type request counts per (agent → target) pair, split by decision (`EXECUTED`/`DENIED`/`REJECTED`). Shows, for every agent with delegation capability, who it's allowed to hand work to and what's actually happened in the last 100 runs — "0 delegations in the last 100 runs" is shown plainly where that's the truth, never hidden or implied otherwise.
- No new backend endpoints, no new permissions. tsc/eslint clean; `/agents` verified live (200).
- Not done: a visual graph/diagram (this slice is a list, not a node-link rendering) and any notion of concurrent multi-agent collaboration, since the platform genuinely has none to show.

## Phase 8 output (2026-11-15, Claude) — Self-Improvement, first slice

Model-level benchmark history (`AiModel.successCount/failureCount/lastLatencyMs/lastFirstTokenMs`, graded **A**) already had a real, live table on the Model Registry page (`/models` → `model-registry.tsx`) — nothing new needed there. The one real, production-wired Self-Improvement signal that wasn't aggregated anywhere was the Evidence-Bound Claim Ledger.

- `src/app/agents/agent-console.tsx`: new `ClaimQualityPanel`, reusing the exact same `/agents/runs?limit=100` SWR key Phase 7's `CollaborationPanel` already uses (SWR dedupes it — no extra request), counting real `claim`-type requests per agent by verdict. Since `verifyClaims` is opt-in and off by default, most historical runs have zero claim requests today — shown as an honest "nothing to evaluate yet," not an empty chart that could read as "all claims passed."
- Added a "Verify claims against evidence" checkbox to `RunPanel` (same pattern as the existing "Allow delegation" one) — without it there was no way to ever populate the new panel with real data, since the console had no way to opt a run into claim verification at all.
- **Found and fixed in the same pass**: regenerating API types (needed to even typecheck the new panel — see below) exposed that `run-view.tsx`'s `describeRequest()` was silently mislabeling every real claim-verification request as "invalid request" (fell through its default branch, since it only ever handled `delegate`/`tool`), and its `DECISION` tone map was missing all 7 claim-verdict values. Both fixed.
- **Found and fixed, more fundamental**: `src/lib/api/schema.d.ts` (this repo's generated OpenAPI types) was last regenerated from the backend's `openapi.json`, which was last exported 2026-11-11 — before the Claim Ledger was ever wired into production. The generated `type` union for a run's `requests[]` entries was missing `"claim"` entirely. Fixed by re-running the backend's `npm run openapi:export` (its own commit, `dark-agi-backend`) against the current real contract, then this repo's `npm run api:types`. This also surfaced that `AgentRunRequest.verifyClaims` is a required field the console had never been sending explicitly — now wired to the new checkbox above. A general lesson worth carrying forward into later phases: this app's generated types can silently drift behind real backend contract changes, and nothing currently catches that automatically.
- tsc/eslint clean. Pre-existing, unrelated vitest failures (`Cannot read properties of undefined (reading 'config')` in 4 test files, nothing to do with this change) confirmed via `git stash` to exist identically on the pre-this-change tree. `/agents` verified live (200).
