'use client';

import { Play, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import type { Operation, OperationList, ToolList } from '@/lib/api/client';

const RISK: Record<string, StatusTone> = { low: 'neutral', moderate: 'warning', high: 'critical' };
const CATEGORY_LABEL: Record<string, string> = {
  'network-intelligence': 'Network Intelligence',
  'vulnerability-assessment': 'Vulnerability Assessment',
  'web-security': 'Web Security',
  'windows-security': 'Windows Security',
  'digital-forensics': 'Digital Forensics',
  'threat-intelligence': 'Threat Intelligence',
  'malware-analysis': 'Malware Analysis',
  'cryptographic-audit': 'Cryptographic Audit',
};

const LAUNCHER: { repo: string; script: string; command: string; description: string }[] = [
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'setup', description: 'First install: npm install, create the database, migrate and build' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'start', description: 'Start PostgreSQL and the API (7411); prints the setup token on first run' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'stop', description: 'Stop the API and PostgreSQL' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'status', description: 'Show whether the API and PostgreSQL are running' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'setup', description: 'First install: npm install, create .env.local and build' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'start', description: 'Start this console (7410) and open the browser' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'stop', description: 'Stop this console' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'status', description: 'Show whether the console runs and the API is reachable' },
];

function OperationCard({ op, canSubmit }: { op: Operation; canSubmit: boolean }) {
  return (
    <div className="rounded-md border border-edge bg-canvas/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{op.title}</h3>
          <p className="font-mono text-[11px] text-ink-3">
            {op.toolId} / {op.operationId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge tone={RISK[op.risk] ?? 'neutral'} label={`${op.risk} risk`} />
          <StatusBadge tone={op.requiresApproval ? 'warning' : 'neutral'} label={op.requiresApproval ? 'Needs approval' : 'No approval (people)'} />
          <StatusBadge tone={op.available ? 'good' : 'neutral'} label={op.available ? 'Ready on this machine' : 'Not available'} />
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-ink-2">{op.description}</p>
      {!op.available && op.unavailableReason ? <p className="mt-1 text-[11.5px] text-warning">{op.unavailableReason}</p> : null}

      <div className="mt-2 text-[11.5px]">
        {op.fields.length === 0 ? (
          <p className="text-ink-3">No input — inspects this machine only.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="pr-3 font-medium">Field</th>
                <th className="pr-3 font-medium">Required</th>
                <th className="pr-3 font-medium">Default / range</th>
                <th className="font-medium">What to enter</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {op.fields.map((f) => (
                <tr key={f.name} className="align-top">
                  <td className="pr-3 font-mono text-ink">{f.name}</td>
                  <td className="pr-3">{f.required ? 'yes' : 'no'}</td>
                  <td className="pr-3 font-mono">
                    {f.default !== null ? String(f.default) : '—'}
                    {f.min !== null && f.max !== null ? ` (${f.min}–${f.max})` : ''}
                  </td>
                  <td>{f.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
        <span>
          {op.targetKind === 'network' ? `Targets must be inside one active scope · max ${op.maxAddresses} addresses · ` : 'Local machine · '}
          timeout {Math.round(op.timeoutMs / 60_000)} min · {op.maxConcurrent} at a time · AI-agent requests always need approval
        </span>
        {canSubmit && op.available ? (
          <Link
            href={`/tasks?op=${encodeURIComponent(`${op.toolId}:${op.operationId}`)}`}
            className="inline-flex items-center gap-1 rounded border border-accent-strong bg-accent-strong/90 px-2 py-0.5 text-[11.5px] font-medium text-white hover:bg-accent-strong"
          >
            <Play className="size-3" aria-hidden /> Use this command
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function CommandReference() {
  const { can } = useAuth();
  const operations = useSWR<OperationList>('/operations');
  const tools = useSWR<ToolList>('/tools');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const grouped = useMemo(() => {
    const items = (operations.data?.items ?? []).filter((o) => !q || `${o.title} ${o.toolId} ${o.operationId} ${o.description}`.toLowerCase().includes(q));
    const map = new Map<string, Operation[]>();
    for (const o of items) map.set(o.category, [...(map.get(o.category) ?? []), o]);
    return [...map.entries()];
  }, [operations.data, q]);

  const planned = useMemo(
    () =>
      (tools.data?.items ?? [])
        .flatMap((t) => t.operations.filter((o) => o.status === 'planned').map((o) => ({ tool: t.name, toolId: t.id, phase: t.integrationPhase, ...o })))
        .filter((o) => !q || `${o.tool} ${o.id} ${o.description}`.toLowerCase().includes(q))
        .toSorted((a, b) => a.phase - b.phase || a.tool.localeCompare(b.tool)),
    [tools.data, q],
  );

  return (
    <div>
      <PageHeader
        title="Command Reference"
        summary="Every command the platform can run, what to enter, and the rules that apply. There are no free-form commands: only these reviewed operations can be executed."
        actions={
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              className="w-56 rounded border border-edge-strong bg-canvas py-1 pl-6 pr-2 text-[12px] text-ink"
              placeholder="Search commands"
              aria-label="Search commands"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        }
      />
      <div className="space-y-3 p-4">
        {operations.error ? <ErrorNotice error={operations.error} /> : null}
        {!operations.data && !operations.error ? <Skeleton className="h-48 w-full" /> : null}
        {grouped.map(([category, ops]) => (
          <Panel key={category} title={CATEGORY_LABEL[category] ?? category} subtitle={`${ops.length} executable command${ops.length === 1 ? '' : 's'}`}>
            <div className="grid gap-3 xl:grid-cols-2">
              {ops.map((op) => (
                <OperationCard key={`${op.toolId}:${op.operationId}`} op={op} canSubmit={can('jobs:submit')} />
              ))}
            </div>
          </Panel>
        ))}
        {operations.data && grouped.length === 0 ? <p className="text-[12px] text-ink-3">No executable command matches “{query}”.</p> : null}

        <Panel title="Before your first command" subtitle="Order matters">
          <ol className="list-decimal space-y-1 pl-5 text-[12px] text-ink-2">
            <li>
              <Link href="/tools" className="text-accent hover:underline">
                Tool Registry
              </Link>{' '}
              → <strong>Discover tools</strong>, so the platform knows which programs are installed.
            </li>
            <li>
              For network commands:{' '}
              <Link href="/scopes" className="text-accent hover:underline">
                Scope Management
              </Link>{' '}
              → add only addresses you own or are authorised to test (e.g. <code className="font-mono">127.0.0.1</code>).
            </li>
            <li>
              <Link href="/tasks" className="text-accent hover:underline">
                Task Queue
              </Link>{' '}
              → choose a command, fill in its fields, submit. Commands marked “Needs approval” wait for an OPERATOR or ADMIN to approve.
            </li>
          </ol>
        </Panel>

        <Panel title="Launcher commands" subtitle="Each repository has its own launcher. Run in PowerShell from that repository's folder (or the .cmd file of the same name from Command Prompt)">
          <table className="w-full text-left text-[12px]">
            <tbody>
              {LAUNCHER.map((l) => (
                <tr key={`${l.repo}:${l.command}`} className="border-b border-edge/60 last:border-0">
                  <td className="whitespace-nowrap py-1 pr-4 font-mono text-ink-3">{l.repo}</td>
                  <td className="whitespace-nowrap py-1 pr-4 font-mono text-ink">
                    .\scripts\{l.script} {l.command}
                  </td>
                  <td className="py-1 text-ink-2">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] text-ink-3">
            Options: <code className="font-mono">-NoBrowser</code> (console start without opening the browser), <code className="font-mono">-NoBanner</code> (API launcher without the banner). Both have <code className="font-mono">check</code> (typecheck, lint, tests).
          </p>
        </Panel>

        <Panel title="Planned commands" subtitle={tools.data ? `${planned.length} operations arrive in later phases — shown here so nothing is a surprise` : undefined}>
          {tools.error ? <ErrorNotice error={tools.error} /> : null}
          {!tools.data && !tools.error ? <Skeleton className="h-24 w-full" /> : null}
          {planned.length > 0 ? (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-panel text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Phase</th>
                    <th className="py-1 pr-3 font-medium">Tool</th>
                    <th className="py-1 pr-3 font-medium">Command</th>
                    <th className="py-1 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-ink-2">
                  {planned.map((o) => (
                    <tr key={`${o.toolId}:${o.id}`} className="border-t border-edge/50">
                      <td className="py-1 pr-3 font-mono">P{o.phase}</td>
                      <td className="py-1 pr-3">{o.tool}</td>
                      <td className="py-1 pr-3 font-mono">{o.id}</td>
                      <td className="py-1">{o.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
