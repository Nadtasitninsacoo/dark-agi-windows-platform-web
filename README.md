# dark-agi-frontend

Operations console for DARK AGI Windows. Next.js 16 (App Router, Turbopack, Cache Components),
React 19, Tailwind CSS 4, lucide-react, SWR, Socket.IO client.

All operational data comes from `dark-agi-backend`; this app holds no simulated state.

## Setup

```powershell
npm install
copy .env.example .env.local     # NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:7411
npm run dev                      # http://127.0.0.1:7410
```

Production: `npm run build && npm start`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js on 127.0.0.1:7410 |
| `typecheck`, `lint`, `test` | Static checks + Vitest (`check` runs all three) |
| `api:types` | Regenerates `src/lib/api/schema.d.ts` from `../dark-agi-backend/openapi.json` |

## API contract

Types for every backend payload come from the backend's OpenAPI document
(`src/lib/api/schema.d.ts`, generated — do not edit). When the backend contract changes,
run `npm run api:types` and fix any resulting type errors.

## Pages

| Route | Status |
|---|---|
| `/` Command Center | Live: telemetry stream, health, environment readiness, audit activity |
| `/logs` Execution Logs | Live: audit trail, pagination, filter, integrity verification |
| `/settings` System Settings | Live: Windows/runtime inventory, re-probe, DB and backend details |
| 15 module pages (`/agents`, `/models`, `/tools`, …) | Planned: show delivery phase and planned capabilities |

Module status and navigation are defined in `src/lib/modules.ts`.
