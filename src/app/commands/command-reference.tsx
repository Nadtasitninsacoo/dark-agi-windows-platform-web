'use client';

import { CornerDownLeft, Search, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CATEGORY_LABEL, OperationCard, RISK } from '@/components/operation-card';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type Job, type Operation, type OperationList, type ToolList } from '@/lib/api/client';
import { CommandError, commandHint, COMMAND_PREFIX, COMMAND_SUFFIX, parseCommand } from '@/lib/commands';

const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

/** Type a branded DARK AGI command; it is parsed client-side and submitted through POST /jobs (validated server-side). */
function CommandBar({ operations, canSubmit }: { operations: Operation[]; canSubmit: boolean }) {
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const hint = useMemo(() => (line.trim() === '' ? null : commandHint(line, operations)), [line, operations]);

  const run = async () => {
    setError(null);
    setJob(null);
    let body: { toolId: string; operationId: string; input: Record<string, unknown> };
    try {
      body = parseCommand(line, operations);
    } catch (e) {
      setError(e instanceof CommandError ? e.message : 'Invalid command');
      return;
    }
    setBusy(true);
    try {
      const created = await apiRequest<Job>('/jobs', post(body));
      setJob(created);
      setLine('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Command bar" subtitle={`The platform's own command language — ${COMMAND_PREFIX} <command> key=value … ${COMMAND_SUFFIX}`}>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <span className="select-none font-mono text-ink-3">$</span>
        <input
          className="min-w-0 flex-1 rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[12px] text-ink"
          placeholder={`${COMMAND_PREFIX} net:dns host=example.com ${COMMAND_SUFFIX}`}
          aria-label="DARK AGI command"
          value={line}
          spellCheck={false}
          onChange={(e) => setLine(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !canSubmit || line.trim() === ''}
          className="inline-flex items-center gap-1 rounded border border-accent-strong bg-accent-strong/90 px-3 py-1 text-[12px] font-medium text-white hover:bg-accent-strong disabled:opacity-50"
        >
          <Terminal className="size-3.5" aria-hidden /> Run
        </button>
      </form>
      {hint ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {hint.operation ? (
            <>
              <span className="text-ink-2">{hint.operation.title}</span>
              <StatusBadge tone={RISK[hint.operation.risk] ?? 'neutral'} label={`${hint.operation.risk} risk`} />
              {hint.missingRequiredFields.length > 0 ? (
                <span className="text-warning">missing: {hint.missingRequiredFields.join(', ')}</span>
              ) : hint.ready ? (
                <span className="flex items-center gap-1 text-good">
                  <CornerDownLeft className="size-3" aria-hidden /> ready to run
                </span>
              ) : (
                <span className="text-ink-3">add &quot;{COMMAND_SUFFIX}&quot; to finish</span>
              )}
            </>
          ) : hint.alias ? (
            <span className="text-critical">Unknown command &quot;{hint.alias}&quot;</span>
          ) : null}
        </div>
      ) : null}
      {canSubmit ? null : <p className="mt-2 text-[11.5px] text-ink-3">You need the jobs:submit permission to run commands.</p>}
      {error ? <p className="mt-2 text-[11.5px] text-critical">{error}</p> : null}
      {job ? (
        <p className="mt-2 text-[11.5px] text-ink-2">
          Submitted <span className="font-mono text-ink">{job.operationTitle}</span> · status {job.status} ·{' '}
          <Link href="/tasks" className="text-accent hover:underline">
            open Task Queue
          </Link>
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-ink-3">
        Copy a command from any card below, paste it here, fill the &lt;values&gt;, and Run. Network commands still need an approved scope; some need approval before they run.
      </p>
    </Panel>
  );
}

const LAUNCHER: { repo: string; script: string; command: string; description: string }[] = [
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'setup', description: 'First install: npm install, create the database, migrate and build' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'start', description: 'Start PostgreSQL and the API (7411); prints the setup token on first run' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'stop', description: 'Stop the API and PostgreSQL' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'status', description: 'Show whether the API and PostgreSQL are running' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'check', description: 'Typecheck, lint and run the test suite' },
  { repo: 'dark-agi-backend', script: 'dark-agi-api.ps1', command: 'banner', description: 'Print the DARK AGI console banner and exit' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'setup', description: 'First install: npm install, create .env.local and build' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'start', description: 'Start this console (7410) and open the browser' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'stop', description: 'Stop this console' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'status', description: 'Show whether the console runs and the API is reachable' },
  { repo: 'dark-agi-frontend', script: 'dark-agi-web.ps1', command: 'check', description: 'Typecheck, lint and run the test suite' },
];

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
        <CommandBar operations={operations.data?.items ?? []} canSubmit={can('jobs:submit')} />
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
