# Changelog

## 0.1.0 — Phase 1 foundation (unreleased)

- Next.js 16 console shell (dark operations theme) with navigation for all 18 modules.
- Command Center: live host telemetry over Socket.IO, backend/database health, environment readiness, recent audit events.
- Execution Logs: paginated, filterable audit trail with hash-chain verification.
- System Settings: Windows environment inventory with on-demand (audited) re-probe.
- Planned modules show their delivery phase and planned capabilities — no simulated data.
- API types generated from the backend OpenAPI contract (`npm run api:types`).

## 0.2.0 — Model Registry (unreleased)

- Model Registry page: provider status, model discovery, model table, streaming test console with fallback.

## 0.3.0 — AI Agents (unreleased)

- AI Agents page: agent list, capabilities and tool permissions, telemetry, model/fallback assignment,
  instruction override, memory notes, run console with bounded delegation, delegation tree view with every
  structured request decision, and execution history.

## 0.4.0 — Sign-in, Tool Registry, Permissions (unreleased)

- Sign-in and first-run administrator setup screens; session cookie sent with every API and WebSocket request.
- User menu and Account page (profile, permissions, password change).
- Tool Registry page: status summary, filters, version and path, planned operations, administrator path pinning.
- Permissions page: users, roles, lock/unlock, disable, password reset, role permission matrix.
- Planned-module pages use static metadata plus a React <title> (Cache Components compatible behind the sign-in gate).

## 0.5.0 — Task Queue and Scope Management (unreleased)

- Task Queue: engine status and emergency stop, job submission from operation field definitions, approve/reject,
  cancel, retry, structured result views (Nmap hosts/ports, inventory tables), deep links (`/tasks?job=<id>`).
- Scope Management: create, edit targets, enable/disable, expiry.
- Engine-stopped badge in the top bar; agent run view links queued tool requests to their jobs.
