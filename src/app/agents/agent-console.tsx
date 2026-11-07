'use client';

import { Play, Radar, Square, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { PageHeader } from '@/components/page-header';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, Toggle } from '@/components/ui';
import {
  type Agent,
  type AgentAutoAllResult,
  type AgentList,
  type AgentMemory,
  type AgentMemoryList,
  type AgentRunDetail,
  type AgentRunPage,
  type AgentRunRequest,
  type AgentUpdateRequest,
  type AiModel,
  type AiModelList,
  apiRequest,
} from '@/lib/api/client';
import { formatRelativeTime } from '@/lib/format';
import { formatDateTime } from '@/lib/format';
import { RUN_STATUS, RunView } from './run-view';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const DEFAULT = '__default';
const NONE = '__none';

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function AgentListPanel({ agents, selected, onSelect }: { agents: Agent[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <Panel title="Agents" subtitle={`${agents.length} registered`}>
      <ul className="-m-1 space-y-0.5">
        {agents.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              aria-current={a.id === selected}
              className={`w-full rounded px-2 py-1.5 text-left transition-colors ${a.id === selected ? 'bg-accent-strong/15 ring-1 ring-accent/40' : 'hover:bg-panel-2'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {a.stats.running > 0 ? <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" style={{ boxShadow: '0 0 6px 1px rgb(46 232 143 / 0.8)' }} aria-hidden /> : null}
                  <span className={`text-[12px] font-semibold ${a.enabled ? 'text-ink' : 'text-ink-3 line-through'}`}>{a.name}</span>
                  {a.autoRunEnabled ? <Zap className="size-3 text-accent" aria-label="Auto mode on" /> : null}
                </span>
                <span className="font-mono text-[10.5px] text-ink-3">
                  {a.stats.succeeded}/{a.stats.runs}
                </span>
              </div>
              <div className="truncate text-[11px] text-ink-3">{a.effectiveModel ?? 'no model assigned'}</div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Real counts only, animated by SWR's own re-renders as fresh data arrives — never a fabricated series. */
function StatusBar({ stats }: { stats: Agent['stats'] }) {
  const total = stats.runs || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
      <div className="h-full bg-good transition-all duration-700" style={{ width: seg(stats.succeeded) }} />
      <div className="h-full bg-critical transition-all duration-700" style={{ width: seg(stats.failed) }} />
      <div className="h-full bg-ink-3/50 transition-all duration-700" style={{ width: seg(stats.cancelled) }} />
      <div className="h-full bg-cyan transition-all duration-700" style={{ width: seg(stats.running) }} />
    </div>
  );
}

function AgentOverviewCard({ agent, onToggleAuto, busy }: { agent: Agent; onToggleAuto: (enabled: boolean) => void; busy: boolean }) {
  const running = agent.stats.running > 0;
  return (
    <div
      className={`rounded-md border p-2.5 transition-colors ${running ? 'border-accent/50 bg-accent-strong/5' : 'border-edge bg-panel'}`}
      style={running ? { animation: 'dagi-pulse 2.5s ease-in-out infinite', boxShadow: '0 0 0 1px rgb(46 232 143 / 0.15)' } : undefined}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {running ? <Radar className="size-3.5 shrink-0 animate-spin text-accent" style={{ animationDuration: '2s' }} aria-hidden /> : <span className="size-1.5 shrink-0 rounded-full bg-ink-3" aria-hidden />}
          <span className={`truncate text-[12px] font-semibold ${agent.enabled ? 'text-ink' : 'text-ink-3 line-through'}`}>{agent.name}</span>
        </div>
        <Toggle checked={agent.autoRunEnabled} onChange={onToggleAuto} disabled={busy} label={`Auto mode for ${agent.name}`} />
      </div>
      <StatusBar stats={agent.stats} />
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-3">
        <span>
          {agent.stats.runs} run{agent.stats.runs === 1 ? '' : 's'} · {agent.stats.avgTotalMs === null ? '—' : `${(agent.stats.avgTotalMs / 1000).toFixed(1)}s avg`}
        </span>
        <span>{agent.autoRunEnabled ? `auto: ${formatRelativeTime(agent.lastAutoRunAt)}` : 'auto off'}</span>
      </div>
    </div>
  );
}

function AgentOverviewPanel({ agents, onToggleAuto, onAutoAll, busyId, autoAllBusy }: {
  agents: Agent[];
  onToggleAuto: (id: string, enabled: boolean) => void;
  onAutoAll: (enabled: boolean) => void;
  busyId: string | null;
  autoAllBusy: boolean;
}) {
  const runningNow = agents.filter((a) => a.stats.running > 0).length;
  const autoOn = agents.filter((a) => a.autoRunEnabled).length;
  return (
    <Panel
      title="Operations overview"
      subtitle={`${runningNow} running now · ${autoOn}/${agents.length} on auto mode · polls every few seconds`}
      actions={
        <div className="flex items-center gap-1.5">
          <Button busy={autoAllBusy} onClick={() => onAutoAll(true)}>
            <Zap className="size-3.5" aria-hidden /> Auto all ON
          </Button>
          <Button busy={autoAllBusy} onClick={() => onAutoAll(false)}>
            Auto all OFF
          </Button>
        </div>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <AgentOverviewCard key={a.id} agent={a} busy={busyId === a.id} onToggleAuto={(enabled) => onToggleAuto(a.id, enabled)} />
        ))}
      </div>
    </Panel>
  );
}

function ConfigPanel({ agent, models, onSaved }: { agent: Agent; models: AiModel[]; onSaved: () => Promise<unknown> }) {
  const [model, setModel] = useState(agent.modelId ?? DEFAULT);
  const [fallback, setFallback] = useState(agent.useDefaultFallbacks ? DEFAULT : (agent.fallbackModels[0] ?? NONE));
  const [enabled, setEnabled] = useState(agent.enabled);
  const [instructions, setInstructions] = useState(agent.instructionsOverride ?? agent.defaultInstructions);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Keep a currently assigned model selectable even if it is no longer AVAILABLE.
  const options = useMemo(() => {
    const ids = models.map((m) => m.id);
    for (const id of [agent.modelId, ...agent.fallbackModels]) if (id && !ids.includes(id)) ids.push(id);
    return ids;
  }, [models, agent.modelId, agent.fallbackModels]);

  const save = async (label: string, body: AgentUpdateRequest) => {
    setBusy(label);
    setError(null);
    setSaved(null);
    try {
      await apiRequest<Agent>(`/agents/${agent.id}`, json('PATCH', body));
      await onSaved();
      setSaved(label);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const overridden = agent.instructionsOverride !== null;

  return (
    <Panel title="Configuration" subtitle="Changes are audited">
      <div className="space-y-3">
        {error ? <ErrorNotice error={error} /> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-[11px] text-ink-3">
            Model
            <select className={`${inputClass} mt-0.5 font-mono`} value={model} onChange={(e) => setModel(e.target.value)}>
              <option value={DEFAULT}>Platform default (AI_DEFAULT_MODEL)</option>
              {options.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-ink-3">
            Fallback
            <select className={`${inputClass} mt-0.5 font-mono`} value={fallback} onChange={(e) => setFallback(e.target.value)}>
              <option value={DEFAULT}>Platform defaults (AI_FALLBACK_MODELS)</option>
              <option value={NONE}>No fallback</option>
              {options.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-1.5 pb-1.5 text-[12px] text-ink-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            busy={busy === 'assignment'}
            disabled={busy !== null}
            onClick={() =>
              void save('assignment', {
                enabled,
                modelId: model === DEFAULT ? null : model,
                fallbackModels: fallback === DEFAULT ? null : fallback === NONE ? [] : [fallback],
              })
            }
          >
            Save assignment
          </Button>
          <span className="text-[11px] text-ink-3">
            Effective: <span className="font-mono">{agent.effectiveModel ?? 'none — set a model or AI_DEFAULT_MODEL'}</span>
            {agent.effectiveFallbackModels.length > 0 ? <> → {agent.effectiveFallbackModels.join(', ')}</> : null}
          </span>
        </div>
        {options.length === 0 ? (
          <p className="text-[11.5px] text-ink-3">
            No models available yet. Add a provider key and run discovery in the{' '}
            <Link href="/models" className="text-accent underline-offset-2 hover:underline">
              Model Registry
            </Link>
            .
          </p>
        ) : null}

        <div className="border-t border-edge pt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-3">System instructions</span>
            <StatusBadge tone="neutral" label={overridden ? 'Overridden' : 'Default'} />
          </div>
          <textarea className={`${inputClass} h-40 resize-y font-mono text-[11.5px] leading-relaxed`} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <p className="mt-1 text-[11px] text-ink-3">Platform safety rules and the request protocol are always appended and cannot be overridden.</p>
          <div className="mt-2 flex items-center gap-2">
            <Button busy={busy === 'instructions'} disabled={busy !== null || instructions.trim() === ''} onClick={() => void save('instructions', { instructions })}>
              Save instructions
            </Button>
            {overridden ? (
              <Button
                busy={busy === 'reset'}
                disabled={busy !== null}
                onClick={() => {
                  setInstructions(agent.defaultInstructions);
                  void save('reset', { instructions: null });
                }}
              >
                Restore default
              </Button>
            ) : null}
            {saved ? <span className="text-[11px] text-good">Saved</span> : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MemoryPanel({ agent, max, onChanged }: { agent: Agent; max: number; onChanged: () => Promise<unknown> }) {
  const memories = useSWR<AgentMemoryList>(`/agents/${agent.id}/memories`);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([memories.mutate(), onChanged()]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const items: AgentMemory[] = memories.data?.items ?? [];
  return (
    <Panel title="Memory" subtitle={`Operator notes added to every run · ${items.length}/${max}`}>
      <div className="space-y-2">
        {error ? <ErrorNotice error={error} /> : null}
        {memories.error ? <ErrorNotice error={memories.error} /> : null}
        {items.length === 0 && memories.data ? <p className="text-[12px] text-ink-3">No notes. Add context the agent should always know, such as approved scope.</p> : null}
        <ul className="space-y-1">
          {items.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2 rounded border border-edge px-2 py-1.5 text-[12px] text-ink">
              <span className="whitespace-pre-wrap break-words">{m.content}</span>
              <button
                type="button"
                aria-label="Delete note"
                disabled={busy}
                onClick={() => void act(() => apiRequest(`/agents/${agent.id}/memories/${m.id}`, { method: 'DELETE' }))}
                className="shrink-0 text-ink-3 hover:text-critical disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await apiRequest(`/agents/${agent.id}/memories`, json('POST', { content: draft }));
              setDraft('');
            });
          }}
        >
          <input className={inputClass} value={draft} maxLength={2000} placeholder="e.g. Approved scope: lab subnet 192.0.2.0/24" onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" busy={busy} disabled={draft.trim() === '' || items.length >= max}>
            Add
          </Button>
        </form>
      </div>
    </Panel>
  );
}

function RunPanel({ agent, names, onFinished }: { agent: Agent; names: Record<string, string>; onFinished: () => Promise<unknown> }) {
  const [task, setTask] = useState('');
  const [allowDelegation, setAllowDelegation] = useState(agent.delegatesTo.length > 0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<AgentRunDetail | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const body: AgentRunRequest = { task, allowDelegation };
      setResult(await apiRequest<AgentRunDetail>(`/agents/${agent.id}/runs`, { ...json('POST', body), signal: controller.signal }));
    } catch (e) {
      if (!controller.signal.aborted) setError(e);
    } finally {
      abortRef.current = null;
      setRunning(false);
      await onFinished();
    }
  };

  return (
    <Panel title={`Run ${agent.name}`} subtitle="Runs are recorded in the execution history; the audit trail stores metadata only">
      <div className="space-y-2">
        {!agent.enabled ? <p className="text-[12px] text-warning">This agent is disabled.</p> : null}
        <textarea
          className={`${inputClass} h-24 resize-y`}
          value={task}
          maxLength={20_000}
          placeholder="Describe the task, the authorized scope, and paste any data the agent should analyse."
          onChange={(e) => setTask(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <Button onClick={() => abortRef.current?.abort()}>
              <Square className="size-3.5" aria-hidden /> Stop
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void run()} disabled={!agent.enabled || task.trim() === '' || !agent.effectiveModel}>
              <Play className="size-3.5" aria-hidden /> Run
            </Button>
          )}
          {agent.delegatesTo.length > 0 ? (
            <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <input type="checkbox" checked={allowDelegation} disabled={running} onChange={(e) => setAllowDelegation(e.target.checked)} />
              Allow delegation to {agent.delegatesTo.map((id) => names[id] ?? id).join(', ')}
            </label>
          ) : (
            <span className="text-[11.5px] text-ink-3">This agent does not delegate.</span>
          )}
          {running ? <StatusBadge tone="pending" label="Running — delegated runs execute in sequence" /> : null}
        </div>
        {!agent.effectiveModel ? <p className="text-[11.5px] text-ink-3">Assign a model below (or set AI_DEFAULT_MODEL) before running this agent.</p> : null}
        {error ? <ErrorNotice error={error} /> : null}
        {result ? <RunView detail={result} names={names} /> : null}
      </div>
    </Panel>
  );
}

function HistoryPanel({ agent, names }: { agent: Agent; names: Record<string, string> }) {
  const runs = useSWR<AgentRunPage>(`/agents/runs?agentId=${agent.id}&rootOnly=true&limit=20`);
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useSWR<AgentRunDetail>(openId ? `/agents/runs/${openId}` : null);

  return (
    <Panel title="Execution history" subtitle="Runs started on this agent (delegated runs appear inside their parent)">
      {runs.error ? <ErrorNotice error={runs.error} /> : null}
      {!runs.data && !runs.error ? <Skeleton className="h-16 w-full" /> : null}
      {runs.data?.items.length === 0 ? <p className="text-[12px] text-ink-3">No runs yet.</p> : null}
      <ul className="divide-y divide-edge/60">
        {runs.data?.items.map((r) => {
          const s = RUN_STATUS[r.status];
          const open = openId === r.id;
          return (
            <li key={r.id} className="py-1.5">
              <button type="button" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open} className="flex w-full items-center gap-3 text-left text-[12px]">
                <StatusBadge tone={s.tone} label={s.label} />
                <span className="min-w-0 flex-1 truncate text-ink">{r.task}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink-3">{r.totalMs === null ? '—' : `${(r.totalMs / 1000).toFixed(1)} s`}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{formatDateTime(r.createdAt)}</span>
              </button>
              {open ? (
                <div className="mt-2">
                  {detail.error ? <ErrorNotice error={detail.error} /> : null}
                  {detail.data?.run.id === r.id ? <RunView detail={detail.data} names={names} /> : <Skeleton className="h-16 w-full" />}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function AgentConsole() {
  const agents = useSWR<AgentList>('/agents', { refreshInterval: 4_000 });
  const models = useSWR<AiModelList>('/ai/models?status=AVAILABLE');
  const [selected, setSelected] = useState('oracle');
  const [autoBusyId, setAutoBusyId] = useState<string | null>(null);
  const [autoAllBusy, setAutoAllBusy] = useState(false);
  const [autoError, setAutoError] = useState<unknown>(null);
  const { mutate } = useSWRConfig();

  const items = useMemo(() => agents.data?.items ?? [], [agents.data]);
  const agent = items.find((a) => a.id === selected) ?? items[0];
  const names = useMemo(() => Object.fromEntries(items.map((a) => [a.id, a.name])), [items]);
  const refresh = async () => {
    await Promise.all([agents.mutate(), mutate((key) => typeof key === 'string' && key.startsWith('/agents/runs'))]);
  };

  const toggleAuto = async (id: string, enabled: boolean) => {
    setAutoBusyId(id);
    setAutoError(null);
    try {
      await apiRequest<Agent>(`/agents/${id}`, json('PATCH', { autoRunEnabled: enabled }));
      await agents.mutate();
    } catch (e) {
      setAutoError(e);
    } finally {
      setAutoBusyId(null);
    }
  };

  const autoAll = async (enabled: boolean) => {
    setAutoAllBusy(true);
    setAutoError(null);
    try {
      await apiRequest<AgentAutoAllResult>('/agents/auto-all', json('POST', { enabled }));
      await agents.mutate();
    } catch (e) {
      setAutoError(e);
    } finally {
      setAutoAllBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Agents"
        summary="Specialist agents with their own instructions, model assignment and memory. Agents analyse and coordinate; they cannot execute tools or commands — every action request goes through the platform's policy. Auto mode runs an agent on its own mission every 15 minutes with no prompting — any tool or delegation request it makes still waits for human approval, same as a manually started run."
      />
      <div className="space-y-3 p-4">
        {agents.error ? <ErrorNotice error={agents.error} /> : null}
        {autoError ? <ErrorNotice error={autoError} /> : null}
        {!agents.data && !agents.error ? <Skeleton className="h-64 w-full" /> : null}
        {agents.data ? <AgentOverviewPanel agents={items} onToggleAuto={(id, enabled) => void toggleAuto(id, enabled)} onAutoAll={(enabled) => void autoAll(enabled)} busyId={autoBusyId} autoAllBusy={autoAllBusy} /> : null}
        {agent && agents.data ? (
          <div className="grid gap-3 lg:grid-cols-[15rem_1fr]">
            <div className="space-y-3">
              <AgentListPanel agents={items} selected={agent.id} onSelect={setSelected} />
              <Panel title="Delegation limits">
                <dl className="space-y-0.5 text-[11.5px] text-ink-2">
                  <div>Max depth: {agents.data.limits.maxDelegationDepth}</div>
                  <div>Max delegations per run: {agents.data.limits.maxDelegationsPerRun}</div>
                  <div>Max runs per task tree: {agents.data.limits.maxRunsPerTree}</div>
                </dl>
              </Panel>
            </div>
            <div key={agent.id} className="min-w-0 space-y-3">
              <Panel title={agent.name} subtitle={agent.mission}>
                <div className="grid gap-3 text-[12px] sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Capabilities</p>
                    <ul className="space-y-0.5 text-ink-2">
                      {agent.capabilities.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Tool permissions</p>
                    {agent.toolCategories.length === 0 ? (
                      <p className="text-ink-3">None — coordinates other agents</p>
                    ) : (
                      <>
                        <ul className="space-y-0.5 font-mono text-[11.5px] text-ink-2">
                          {agent.toolCategories.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                        <p className="mt-1 text-[11px] text-ink-3">Requests are recorded and denied until the Tool Registry and authorization engine ship (Phase 2/4).</p>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Telemetry</p>
                    <dl className="space-y-0.5 text-ink-2">
                      <div>
                        Runs: {agent.stats.runs} ({agent.stats.succeeded} ok, {agent.stats.failed} failed, {agent.stats.cancelled} cancelled)
                      </div>
                      <div>Avg duration: {agent.stats.avgTotalMs === null ? '—' : `${(agent.stats.avgTotalMs / 1000).toFixed(1)} s`}</div>
                      <div>Last run: {agent.stats.lastRunAt ? formatDateTime(agent.stats.lastRunAt) : '—'}</div>
                      {agent.stats.running > 0 ? <div className="text-warning">{agent.stats.running} running now</div> : null}
                    </dl>
                  </div>
                </div>
              </Panel>
              <RunPanel agent={agent} names={names} onFinished={refresh} />
              <HistoryPanel agent={agent} names={names} />
              <div className="grid gap-3 xl:grid-cols-2">
                <ConfigPanel agent={agent} models={models.data?.items ?? []} onSaved={refresh} />
                <MemoryPanel agent={agent} max={agents.data.limits.maxMemoriesPerAgent} onChanged={refresh} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
