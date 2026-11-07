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

## 0.5.0 (cont.) — DARK AGI design system, Command Center widgets, command autocomplete (unreleased)

- Design tokens move from an indigo/navy palette to graphite/near-black surfaces with neon green as the primary
  accent (doubling as the "good" status colour) and cyan as the secondary technical accent; red/amber stay
  reserved for critical/warning. Every page inherits this from the shared tokens (`globals.css`); the sparkline,
  the floating terminal's colour presets and the terminal's background — the few places with literal hex values —
  are updated to match explicitly.
- Command Center gains four status tiles (AI Agents, AI Providers, Tool Registry, Execution Queue) and a Recent
  Agent Activity panel, all from endpoints that already existed. The findings-summary line states plainly that
  persistence is not implemented yet (Phase 5) rather than showing an empty or fabricated widget.
- Terminal gains lightweight syntax highlighting for echoed commands, plus real autocomplete: as you type, a
  dropdown suggests the matching verb, then each operation's still-unused fields, then the closing `keng` —
  accepted with Tab, navigated with ↑/↓, dismissed with Esc (Enter always submits the line as typed, unaffected
  by the dropdown). A live hint line shows the resolved operation, its risk/approval badges, and which required
  fields are still missing — a running "execution preview" with no extra request to the server. The Command
  Reference's command bar gains the same hint line. Suggestion/preview logic is pure and unit-tested
  (`suggestCommand`, `commandHint` in `src/lib/commands.ts`).

## 0.5.0 (cont. 2) — Vulnerability Assessment page goes live (unreleased)

- Vulnerability Assessment is now live, rendering the backend's three new local dependency-scan operations
  (Trivy filesystem/image scan, Grype filesystem scan, OSV-Scanner lockfile scan) through the same
  `DomainOperations`/`OperationCard` components as every other domain page. Nuclei (network-target) and a
  persisted findings view remain planned.

## 0.6.0 — Security Findings page, Nuclei command alias (unreleased)

- New **Security Findings** page (`/findings`): severity tiles (open count + critical/high/medium/low/unknown),
  a filterable table (severity, status) of findings ingested from succeeded Trivy/Grype/OSV-Scanner/Nuclei jobs,
  and resolve/ignore/reopen actions for users with the new `findings:manage` permission. Vulnerability
  Assessment's domain page is unchanged — it runs scans; Security Findings shows what they found.
- Command language gains aliases for the 5 new vulnerability-assessment operations: `vuln:trivyfs`,
  `vuln:trivyimage`, `vuln:grype`, `vuln:osv`, `vuln:nuclei`.
- API types regenerated from the updated backend OpenAPI contract (`Finding`, `FindingPage`,
  `FindingUpdateRequest`, the `findings:read`/`findings:manage` permissions).

## 0.7.0 — Evidence and Threat Intelligence go live (unreleased)

- New **Evidence** page (`/evidence`): an expandable list of files registered by the file-hash operation, each
  with its full append-only chain-of-custody timeline, and an annotate/archive/restore form (requires
  `evidence:manage`) where every change requires a note.
- **Threat Intelligence** (`/threat-intel`) is now live, with a dedicated IOC console (not the generic
  per-category operation grid, since this category has no job-based operations yet) — record and triage
  indicators of compromise (hash/IP/domain/URL) with type/severity/status. This is the platform's own registry,
  not a live VirusTotal/MISP lookup (documented on the page as a deliberate, not accidental, scope limit).
- API types regenerated (`Evidence`, `EvidenceDetail`, `Ioc`, the new `evidence:*`/`iocs:*` permissions).

## 0.8.0 — Malware Analysis goes live (unreleased)

- Malware Analysis is now live, rendering the backend's three new static-analysis operations (capa capability
  report, FLOSS string extraction, ClamAV signature scan) through the same `DomainOperations`/`OperationCard`
  components as every other live domain page. None of the three execute the file they inspect. YARA matching and
  sandbox-report ingestion remain planned, shown honestly on the page rather than simulated.
- Command language gains aliases for the 3 new operations: `malware:capa`, `malware:floss`, `malware:clamav`.

## 0.8.0 (cont.) — GnuPG signature and key inspection on Cryptographic Audit (unreleased)

- Cryptographic Audit gains two GnuPG operations (signature verification, key inspection — both read-only,
  neither touches a keyring) alongside the existing TLS/certificate inspection. OpenSSL's two catalogued
  operations are deliberately not built — they would duplicate existing native capability; the planned list is
  trimmed to only what is genuinely not yet built (cipher policy evaluation, restricted hash auditing).
- Command language gains `crypto:gpgverify`, `crypto:gpgkey` aliases.

## 0.9.0 — Reports (unreleased)

- New **Reports** page (`/reports`): a generate form (title, optional severity/finding-status/evidence-status
  filters) for users with `reports:manage`, and a list showing each report's severity-tile summary and an
  Export HTML link open to anyone with `reports:read`. Generating a report snapshots the matching findings and
  evidence as they are right now — later triage or relabelling never rewrites a report already read or shared.
- API types regenerated (`Report`, `ReportDetail`, `ReportPage`, `ReportCreateRequest`, the new
  `reports:read`/`reports:manage` permissions). This closes the last placeholder module (Vulnerability
  Assessment, Threat Intelligence, Malware Analysis and Reports were the four remaining); every module in
  navigation is now either live or a dedicated console.

## Unreleased — CI workflow reviewed (no code changes)

- Reviewed `.github/workflows/ci.yml` against current scripts: `next typegen`, typecheck, lint, unit tests and
  build all call real, current commands. Whether GitHub Actions has actually produced a green run is not
  verified from this environment; see the backend's `docs/architecture/roadmap.md` Known gaps.

## Unreleased — MCP panel on API Access

- API Access gains a "Connect another agent system (MCP)" panel: the backend's new `POST /mcp` endpoint lets
  any Model Context Protocol-compatible agent framework discover and call every operation as a tool, over the
  same API key, through the same scope/approval/audit path as every other job submission — not a second,
  looser door into the engine. Includes copyable `tools/list`/`tools/call` curl examples.

## Unreleased — Windows service live-verified; a real stop-command bug fixed

- `DarkAGI-Web` installed and started on the operator's machine via `scripts\service.ps1` (WinSW) — `Running`,
  `Automatic`, health-checked.
- Fixed a real bug in `dark-agi-web.ps1`'s `stop` command: it reported "frontend stopped." even when
  `taskkill` silently failed to kill the tracked process (an orphaned dev instance kept holding port 7410),
  because its output was piped to `Out-Null` and never checked. `stop` now re-verifies the process is
  actually gone before claiming success.

## Unreleased — Windows-service wrapper script (written, not installed)

- `scripts/service.ps1`: `install`/`uninstall`/`start`/`stop`/`status`, registering the production console
  (`next start`) as a Windows Service via WinSW (an external, operator-supplied binary). Requires an elevated
  PowerShell; nothing here registers a service unless the operator runs it. See the backend's
  `docs/architecture/roadmap.md` Phase 10 section for the full design and a real em-dash/PowerShell-encoding
  bug caught and fixed before it reached the operator.
- `service.ps1 install` gains `-BindHost` (default `127.0.0.1`, unchanged) so the registered service can be
  told to accept LAN/Tailscale connections (`-BindHost 0.0.0.0`) without editing the script.

## Unreleased — Sign-in screen redesign

- The sign-in/first-run setup screen gains a decorative dark-cyber background behind the existing card: a
  faint repeating "DARK AGI WINDOWS" watermark (tiled SVG `<pattern>`, rotated), a subtle accent-green grid,
  two slow-pulsing corner glows, and a thin scanline sweep — all `pointer-events-none`/`aria-hidden`, purely
  cosmetic chrome, never a stand-in for real system activity (consistent with the project's standing "no fake
  scanning animations" rule). The card itself gains a soft glow border and backdrop blur; the subtitle now
  renders in uppercase monospace for a more technical feel. No functional changes to sign-in/setup.

## Unreleased — Fix: API calls broke whenever the console was reached from a different address

- `API_BASE_URL` was a single value baked in at build time from `NEXT_PUBLIC_API_BASE_URL` — switching between
  loopback, the LAN IP and a Tailscale IP (all valid ways to reach the same machine) silently broke every
  address except the one last built for ("Backend unreachable" even though the backend was right there). Now
  derived from the page's own address in the browser (`window.location.hostname`, fixed port from
  `NEXT_PUBLIC_API_PORT`/default `7411`) instead of one fixed value — one build works from any address the
  operator reaches it by, with no rebuild needed to switch.
- Sign-in/first-run setup password fields gain a show/hide toggle — a masked field hiding a typo was a real,
  confirmed source of "wrong password" reports tonight.
- `ErrorNotice` now renders the specific `issues` a 400 validation error returns (field + reason), not just the
  generic top-level message — the previous generic "Validation failed" gave no way to tell a real problem
  apart from the extra-field case fixed on the backend tonight.

## Unreleased — AI Agents: auto mode and a live operations overview

- New "Operations overview" panel: a grid of all 10 agents with a live status dot (pulses when a run is
  actually in progress), a per-agent Auto toggle, and a succeeded/failed/cancelled/running bar built only
  from each agent's own real counts — no fabricated activity. Page-level "Auto all ON/OFF" buttons flip every
  agent at once. Auto mode runs an agent on its own mission every 15 minutes with no prompting; any tool or
  delegation request it makes still waits for human approval, same as a manually started run.
  The agent list now polls every 4s (was 15s).
- New shared `Toggle` switch component in `src/components/ui.tsx`; `formatRelativeTime` added to
  `src/lib/format.ts` ("3m ago" style, deliberately coarse).

## Unreleased — `banner` command in the Terminal

- Terminal gains a `banner` local command (alongside `help`/`clear`) that prints the same skull-and-crossbones
  console art `scripts/banner.ps1` shows on the PowerShell launcher — a static copy, not regenerated, so it
  stays pixel-identical; verified character-for-character against a live capture of the real launcher output.
  Works in both the full-page Terminal and the floating one (they share the same component).

## Unreleased — DARK AGI WINDOWS logo

- The operator's own skull-and-axe artwork now appears in the console: a cut-out (`public/dark-agi-logo.png`,
  `-small.png`) with the background properly removed — the source was a flat JPEG with a baked-in transparency
  checkerboard (no real alpha channel), so this took a real flood-fill cutout (seeded from every background
  pixel, not just the border, so checker patches fully enclosed inside letters and between the skull and the
  axe handle came out too, with a minimum-component-size floor so a stray highlight pixel on the art was never
  mistaken for background), not a one-line "remove background" call.
- Sign-in/first-run setup: the full logo now sits above the card, replacing the small shield icon, with its
  own soft glow. Top bar: a small cut of the same logo replaces the generic shield icon next to "DARK AGI".
- Sign-in background simplified: dropped the repeating text watermark now that real artwork fills that role;
  kept the grid, one centred glow, and the scanline sweep.

## Unreleased — Terminal: no longer flags an auto-resolvable target as missing

- The backend can now fill in a network operation's `host`/`targets` from the operator's active scope (see the
  backend's Auto Target Resolution). `commandHint()` no longer lists that field in `missingRequiredFields` for
  a network operation, so the live "execution preview" correctly shows a command as ready even with no target
  typed — it used to say "not ready" for a command that would actually have succeeded.

## Unreleased — Copyable "auto target" commands on Command Reference and Tool Registry

- New `commandTemplateAuto()` builds the same command line as `commandTemplate()` but omits the `host`/
  `targets` field for a network operation, since the backend now fills it in from the one active scope.
- `OperationCard` (used by Command Reference and every security-domain page) now shows both forms for a
  network operation side by side, each with its own copy button — the explicit-target command as before, and
  a second line labelled "auto target".
- Tool Registry's expanded tool detail (previously just a bare operation list with no runnable command at
  all) now cross-references the full `/operations` list by `${toolId}:${operationId}` and shows the same two
  copyable command lines under every available operation.
