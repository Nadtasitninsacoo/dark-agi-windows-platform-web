'use client';

import { ChevronDown, ChevronRight, ExternalLink, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { CopyButton } from '@/components/operation-card';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type Operation, type OperationList, type Tool, type ToolDiscoveryResult, type ToolList } from '@/lib/api/client';
import { commandTemplate, commandTemplateAuto, operationForAlias } from '@/lib/commands';

/**
 * For a tool with zero automated operations of its own (not Windows-native, or GUI-only by design), the
 * already-runnable `dagi` command that does the same job natively — so "no operations" never means "no
 * command to copy" when a real substitute exists. Keyed by tool id; value is a command alias from
 * COMMAND_ALIASES. Left out entirely when no implemented operation covers the same job yet.
 */
const ALTERNATIVE_COMMAND: Record<string, string> = {
  'arp-scan': 'net:arp',
  netdiscover: 'net:arp',
  fping: 'net:ping',
  tcpdump: 'net:pcapanalyze',
  nikto: 'vuln:nuclei',
  testssl: 'crypto:tls',
};
import { formatDateTime } from '@/lib/format';

const STATUS: Record<Tool['installStatus'], { tone: StatusTone; label: string }> = {
  INSTALLED: { tone: 'good', label: 'Installed' },
  NOT_FOUND: { tone: 'neutral', label: 'Not installed' },
  NOT_WINDOWS_NATIVE: { tone: 'warning', label: 'Not Windows-native' },
  EXTERNAL: { tone: 'neutral', label: 'External service' },
  UNKNOWN: { tone: 'neutral', label: 'Not checked' },
};

const HEALTH: Record<Tool['health'], { tone: StatusTone; label: string } | null> = {
  OK: { tone: 'good', label: 'Healthy' },
  DEGRADED: { tone: 'warning', label: 'Degraded' },
  ERROR: { tone: 'critical', label: 'Error' },
  UNKNOWN: null,
};

const CATEGORY_LABEL: Record<string, string> = {
  'network-intelligence': 'Network',
  'vulnerability-assessment': 'Vulnerability',
  'web-security': 'Web',
  'windows-security': 'Windows',
  'digital-forensics': 'Forensics',
  'threat-intelligence': 'Threat intel',
  'malware-analysis': 'Malware',
  'cryptographic-audit': 'Crypto',
};

const inputClass = 'rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';

function ToolDetail({ tool, canConfigure, onChanged, operationsById }: { tool: Tool; canConfigure: boolean; onChanged: () => Promise<unknown>; operationsById: Map<string, Operation> }) {
  const [path, setPath] = useState(tool.configuredPath ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const save = async (configuredPath: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<Tool>(`/tools/${tool.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configuredPath }) });
      await onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 bg-canvas/50 px-3 py-3 text-[12px] lg:grid-cols-2">
      <div className="space-y-1.5">
        <p className="text-ink">{tool.description}</p>
        <dl className="grid grid-cols-[8.5rem_1fr] gap-x-2 gap-y-0.5 text-ink-2">
          <dt className="text-ink-3">Vendor</dt>
          <dd>{tool.vendor}</dd>
          <dt className="text-ink-3">License</dt>
          <dd>
            {tool.license}
            {tool.commercial ? <span className="ml-1 text-warning">(commercial)</span> : null}
          </dd>
          <dt className="text-ink-3">Windows</dt>
          <dd>{tool.supportedWindows.length > 0 ? `Windows ${tool.supportedWindows.join(' / ')} x64` : tool.windowsSupport === 'external' ? 'Not installed locally' : 'Not supported natively'}</dd>
          <dt className="text-ink-3">Permissions</dt>
          <dd>{tool.requiresAdministrator ? 'Administrator for some operations' : 'Standard user'}</dd>
          <dt className="text-ink-3">Default timeout</dt>
          <dd>{Math.round(tool.defaultTimeoutMs / 60_000)} min</dd>
          <dt className="text-ink-3">Integration</dt>
          <dd>Phase {tool.integrationPhase}</dd>
          {tool.executablePath ? (
            <>
              <dt className="text-ink-3">Executable</dt>
              <dd className="break-all font-mono text-[11px]">
                {tool.executablePath} <span className="text-ink-3">({tool.resolvedFrom})</span>
              </dd>
            </>
          ) : null}
          {tool.lastCheckedAt ? (
            <>
              <dt className="text-ink-3">Last checked</dt>
              <dd>
                {formatDateTime(tool.lastCheckedAt)} · {tool.checkDurationMs} ms
              </dd>
            </>
          ) : null}
        </dl>
        {tool.detail ? <p className="text-ink-2">{tool.detail}</p> : null}
        {tool.alternative && tool.installStatus !== 'NOT_WINDOWS_NATIVE' ? <p className="text-ink-2">Alternative: {tool.alternative}</p> : null}
        {tool.notes ? <p className="text-ink-3">{tool.notes}</p> : null}
        <div className="flex gap-3 pt-1">
          <a href={tool.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
            Homepage <ExternalLink className="size-3" aria-hidden />
          </a>
          {tool.documentation !== tool.homepage ? (
            <a href={tool.documentation} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              Documentation <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Operations</p>
          {tool.operations.length === 0 ? (
            <div className="space-y-1.5">
              <p className="text-ink-3">No automated operations defined for this integration.</p>
              {(() => {
                const alias = ALTERNATIVE_COMMAND[tool.id];
                const alt = alias ? operationForAlias(alias, [...operationsById.values()]) : undefined;
                if (!alt) return null;
                return (
                  <div>
                    <p className="text-[11px] text-ink-3">Use this instead — same job, Windows-native:</p>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden rounded border border-edge bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                      <span className="shrink-0 select-none text-ink-3">$</span>
                      <span className="truncate">{commandTemplate(alt)}</span>
                      <CopyButton text={commandTemplate(alt)} label="Copy" />
                    </div>
                    {alt.targetKind === 'network' ? (
                      <div className="mt-1 flex items-center gap-1.5 overflow-hidden rounded border border-edge bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                        <span className="shrink-0 select-none text-ink-3">$</span>
                        <span className="truncate">{commandTemplateAuto(alt)}</span>
                        <span className="shrink-0 rounded border border-edge-strong px-1 py-0.5 font-sans text-[9.5px] uppercase tracking-wider text-ink-3">auto</span>
                        <CopyButton text={commandTemplateAuto(alt)} label="Copy" />
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {tool.operations.map((op) => {
                const full = operationsById.get(`${tool.id}:${op.id}`);
                return (
                  <li key={op.id}>
                    <div className="flex items-baseline gap-2">
                      {op.status === 'available' ? (
                        <StatusBadge tone="good" label={op.requiresApproval ? 'Available · approval' : 'Available'} />
                      ) : (
                        <StatusBadge tone="neutral" label={`Planned · P${tool.integrationPhase}`} />
                      )}
                      <span className="font-mono text-[11.5px] text-ink">{op.id}</span>
                      <span className="text-ink-3">{op.description}</span>
                    </div>
                    {full ? (
                      <div className="mt-1 space-y-1 pl-1">
                        <div className="flex items-center gap-1.5 overflow-hidden rounded border border-edge bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                          <span className="shrink-0 select-none text-ink-3">$</span>
                          <span className="truncate">{commandTemplate(full)}</span>
                          <CopyButton text={commandTemplate(full)} label="Copy" />
                        </div>
                        {full.targetKind === 'network' ? (
                          <div className="flex items-center gap-1.5 overflow-hidden rounded border border-edge bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                            <span className="shrink-0 select-none text-ink-3">$</span>
                            <span className="truncate">{commandTemplateAuto(full)}</span>
                            <span className="shrink-0 rounded border border-edge-strong px-1 py-0.5 font-sans text-[9.5px] uppercase tracking-wider text-ink-3">auto</span>
                            <CopyButton text={commandTemplateAuto(full)} label="Copy" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-1 text-[11px] text-ink-3">
            Available operations run from the <Link href="/tasks" className="text-accent hover:underline">Task Queue</Link>; planned ones need their adapter, schema and policy first.
          </p>
        </div>
        {tool.windowsSupport === 'native' ? (
          <div>
            <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Executable path</p>
            {error ? <ErrorNotice error={error} /> : null}
            {canConfigure ? (
              <div className="mt-1 flex flex-wrap gap-2">
                <input className={`${inputClass} min-w-0 flex-1 font-mono`} value={path} placeholder="Automatic — or C:\Path\to\tool.exe" onChange={(e) => setPath(e.target.value)} />
                <Button busy={busy} disabled={path.trim() === '' || path === tool.configuredPath} onClick={() => void save(path.trim())}>
                  Pin path
                </Button>
                {tool.configuredPath ? (
                  <Button busy={busy} onClick={() => { setPath(''); void save(null); }}>
                    Use discovery
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-ink-3">{tool.configuredPath ? <span className="font-mono">{tool.configuredPath}</span> : 'Automatic discovery'} · administrators can pin a path.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ToolRegistry() {
  const { can } = useAuth();
  const tools = useSWR<ToolList>('/tools');
  const operations = useSWR<OperationList>('/operations');
  const operationsById = useMemo(() => new Map((operations.data?.items ?? []).map((o) => [`${o.toolId}:${o.operationId}`, o])), [operations.data]);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastRun, setLastRun] = useState<ToolDiscoveryResult | null>(null);

  const discover = async () => {
    setBusy(true);
    setError(null);
    try {
      setLastRun(await apiRequest<ToolDiscoveryResult>('/tools/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
      await tools.mutate();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tools.data?.items ?? []).filter(
      (t) =>
        (!category || t.categories.includes(category as Tool['categories'][number])) &&
        (!status || t.installStatus === status) &&
        (!q || `${t.name} ${t.vendor} ${t.id}`.toLowerCase().includes(q)),
    );
  }, [tools.data, category, status, query]);

  const s = tools.data?.summary;

  return (
    <div>
      <PageHeader
        title="Tool Registry"
        summary="Every supported cybersecurity tool and its verified state on this machine. A tool counts as installed only when discovery finds it — nothing is assumed, and nothing is downloaded automatically."
        actions={
          can('tools:discover') ? (
            <Button variant="primary" onClick={() => void discover()} busy={busy}>
              <RefreshCw className="size-3.5" aria-hidden /> Discover tools
            </Button>
          ) : (
            <StatusBadge tone="neutral" label="Discovery needs the OPERATOR role" />
          )
        }
      />
      <div className="space-y-3 p-4">
        {error ? <ErrorNotice error={error} /> : null}
        {tools.error ? <ErrorNotice error={tools.error} /> : null}
        {lastRun ? (
          <div className="rounded-md border border-edge bg-panel px-3 py-2 text-[12px] text-ink-2">
            Checked {lastRun.checked} integrations in {(lastRun.durationMs / 1000).toFixed(1)} s · found {lastRun.installed.length} installed:{' '}
            <span className="font-mono text-ink">{lastRun.installed.map((i) => i.id).join(', ') || 'none'}</span>
          </div>
        ) : null}
        {s ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ['Integrations', s.total, ''],
                ['Installed', s.installed, 'INSTALLED'],
                ['Not installed', s.notFound, 'NOT_FOUND'],
                ['Not Windows-native', s.notWindowsNative, 'NOT_WINDOWS_NATIVE'],
                ['External services', s.external, 'EXTERNAL'],
                ['Not checked', s.unchecked, 'UNKNOWN'],
              ] as const
            ).map(([label, value, key]) => (
              <button
                key={label}
                type="button"
                onClick={() => setStatus(status === key ? '' : key)}
                aria-pressed={status === key && key !== ''}
                className={`rounded-md border bg-panel px-3 py-2 text-left transition-colors ${status === key && key !== '' ? 'border-accent/60' : 'border-edge hover:border-edge-strong'}`}
              >
                <div className="font-mono text-[18px] text-ink">{value}</div>
                <div className="text-[11px] text-ink-3">{label}</div>
              </button>
            ))}
          </div>
        ) : null}

        <Panel
          title="Integrations"
          subtitle={s?.lastDiscoveryAt ? `Last discovery ${formatDateTime(s.lastDiscoveryAt)}` : 'Discovery has not run yet'}
          actions={
            <div className="flex items-center gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-ink-3" aria-hidden />
                <input className={`${inputClass} w-40 pl-6`} placeholder="Search" aria-label="Search tools" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <select className={inputClass} aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {(tools.data?.categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c] ?? c}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {!tools.data && !tools.error ? <Skeleton className="h-64 w-full" /> : null}
          {tools.data ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="py-1.5 pr-3 font-medium">Tool</th>
                    <th className="py-1.5 pr-3 font-medium">Category</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium">Version</th>
                    <th className="py-1.5 pr-3 font-medium">Kind</th>
                    <th className="py-1.5 font-medium">Phase</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const st = STATUS[t.installStatus];
                    const health = t.installStatus === 'INSTALLED' ? HEALTH[t.health] : null;
                    const expanded = open === t.id;
                    return (
                      <Fragment key={t.id}>
                        <tr className="cursor-pointer border-b border-edge/60 align-top hover:bg-panel-2/60" onClick={() => setOpen(expanded ? null : t.id)}>
                          <td className="py-1.5 pr-3">
                            <button type="button" aria-expanded={expanded} className="flex items-start gap-1.5 text-left">
                              {expanded ? <ChevronDown className="mt-0.5 size-3.5 text-ink-3" aria-hidden /> : <ChevronRight className="mt-0.5 size-3.5 text-ink-3" aria-hidden />}
                              <span>
                                <span className="text-ink">{t.name}</span>
                                <span className="block text-[11px] text-ink-3">{t.vendor}</span>
                              </span>
                            </button>
                          </td>
                          <td className="py-1.5 pr-3 text-ink-2">{t.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(', ')}</td>
                          <td className="py-1.5 pr-3">
                            <div className="flex flex-wrap gap-1">
                              <StatusBadge tone={st.tone} label={st.label} />
                              {health && t.health !== 'OK' ? <StatusBadge tone={health.tone} label={health.label} /> : null}
                            </div>
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-ink-2">{t.version ?? '—'}</td>
                          <td className="py-1.5 pr-3 text-ink-3">{t.kind}</td>
                          <td className="py-1.5 font-mono text-ink-3">P{t.integrationPhase}</td>
                        </tr>
                        {expanded ? (
                          <tr className="border-b border-edge/60">
                            <td colSpan={6} className="p-0">
                              <ToolDetail tool={t} canConfigure={can('tools:configure')} onChanged={() => tools.mutate()} operationsById={operationsById} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {items.length === 0 ? <p className="py-3 text-[12px] text-ink-3">No tools match the filters.</p> : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
