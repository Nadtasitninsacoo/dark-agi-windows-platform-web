# MISSION 08 — INTELLIGENCE COMMAND CENTER

Pasted verbatim from the user on 2026-11-15, alongside 3 reference screenshots (an "AI Research Hub" dashboard, an "Orchestra" multi-agent pipeline view, and a GPU-cluster/flywheel ops dashboard) as visual inspiration only — not existing DARK AGI UI. Explicitly structured by the user as 10 phases, one at a time, each reviewed before the next starts ("STOP and wait for my review. Do not automatically begin Phase 2.").

Phase 1 (Architecture Discovery, read-only) is DONE — see "Phase 1 output" below. Phase 2 (Dashboard Foundation) is DONE — see "Phase 2 output" below. Phases 3-10 NOT STARTED.

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
- Not started: Phase 2's second half (Multi-Agent delegation-tree page) and Phases 3-10.
