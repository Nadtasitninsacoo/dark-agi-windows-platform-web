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

## 0.5.0 (cont.) — Live security-domain pages, DARK AGI command language, API Access (unreleased)

- Network Intelligence, Windows Security, Web Security, Digital Forensics and Cryptographic Audit pages are now
  live, rendering real operations from `/operations` through a shared `OperationCard` component (also used by
  Command Reference). Vulnerability Assessment, Threat Intelligence, Malware Analysis and Reports remain honest
  placeholders — no simulated data, no inert controls.
- DARK AGI command language: `dagi <verb> key=value… keng`, mapped 1:1 to every real operation
  (`src/lib/commands.ts`). A command bar on Command Reference and a copyable command on every operation card
  parse and submit through the unchanged `POST /jobs` path — scope, approval and audit still apply.
- Terminal (`/terminal`): an interactive console for the command language — prompt, command history (↑/↓),
  inline structured results, `help`/`clear`. Also available as a draggable, resizable, collapsible floating
  window from the top bar; its text colour is customisable and the window stays mounted (hidden, not destroyed)
  so the session survives closing or collapsing it. An explicit Run button submits the current line alongside
  Enter, for when keyboard focus has slipped away (e.g. right after resizing the window).
- AI command mode: a toggle in the Terminal switches to natural-language input (any language, including Thai),
  sent to `POST /agents/command`, which maps it to one reviewed operation and submits it under the signed-in
  user's own permissions.
- API Access page (`/api-access`): create, list and revoke API keys (the secret is shown once), with ready-to-use
  curl samples, for external programs and AI agents to use the platform's tools over HTTP.
