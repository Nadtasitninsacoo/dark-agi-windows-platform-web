'use client';

import { ChevronDown, ChevronRight, OctagonX, Play, RotateCcw, Send } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Fragment, useMemo, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type EngineStatus, type Job, type JobPage, type Operation, type OperationList } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { RemoteHostField } from '@/app/remote-hosts/remote-host-field';
import { JobResult } from './job-result';
import { NextSuggestions } from './next-suggestions';
import { SequencePanel } from './sequence-panel';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

const STATUS: Record<Job['status'], { tone: StatusTone; label: string }> = {
  AWAITING_APPROVAL: { tone: 'warning', label: 'Awaiting approval' },
  QUEUED: { tone: 'neutral', label: 'Queued' },
  RUNNING: { tone: 'pending', label: 'Running' },
  SUCCEEDED: { tone: 'good', label: 'Succeeded' },
  FAILED: { tone: 'critical', label: 'Failed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  REJECTED: { tone: 'neutral', label: 'Rejected' },
};
const RISK: Record<string, StatusTone> = { low: 'neutral', moderate: 'warning', high: 'critical' };
const ACTIVE: Job['status'][] = ['AWAITING_APPROVAL', 'QUEUED', 'RUNNING'];

function EnginePanel({ engine, onChanged }: { engine: EngineStatus; onChanged: () => Promise<unknown> }) {
  const { can } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const act = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<EngineStatus>(path, post(body));
      setReason('');
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const c = engine.counts;
  return (
    <Panel
      title="Execution engine"
      subtitle={`Up to ${engine.maxConcurrentJobs} jobs at once · ${engine.limits.submissionsPerMinute} submissions/min per requester · process priority ${engine.limits.processPriority.toLowerCase()}`}
      actions={engine.paused ? <StatusBadge tone="critical" label="EMERGENCY STOP ACTIVE" /> : <StatusBadge tone="good" label="Accepting jobs" />}
    >
      <div className="space-y-3">
        {error ? <ErrorNotice error={error} /> : null}
        <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4 lg:grid-cols-7">
          {(Object.keys(STATUS) as Job['status'][]).map((s) => (
            <div key={s} className="rounded border border-edge px-2 py-1.5">
              <div className="font-mono text-[16px] text-ink">{c[s] ?? 0}</div>
              <div className="text-[11px] text-ink-3">{STATUS[s].label}</div>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-ink-3">
          Last 24 h: {engine.last24h.finished} finished, {engine.last24h.succeeded} succeeded, {engine.last24h.failed} failed
          {engine.last24h.avgDurationMs !== null ? `, average ${(engine.last24h.avgDurationMs / 1000).toFixed(1)} s` : ''}. Memory limit: {engine.limits.memoryLimit}.
        </p>
        {engine.paused ? (
          <div className="flex flex-wrap items-center gap-3 rounded border border-critical/30 bg-critical/10 px-3 py-2 text-[12px]">
            <span>
              Stopped by <strong>{engine.changedBy}</strong>
              {engine.changedAt ? ` at ${formatDateTime(engine.changedAt)}` : ''}: {engine.reason}
            </span>
            {can('engine:control') ? (
              <Button variant="primary" busy={busy} onClick={() => void act('/engine/resume')}>
                <Play className="size-3.5" aria-hidden /> Resume engine
              </Button>
            ) : null}
          </div>
        ) : can('engine:control') ? (
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${inputClass} max-w-md`} placeholder="Reason for emergency stop" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void act('/engine/emergency-stop', { reason })}
              className="inline-flex items-center gap-1.5 rounded border border-critical/60 bg-critical/20 px-2.5 py-1 text-[12px] font-semibold text-critical hover:bg-critical/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <OctagonX className="size-3.5" aria-hidden /> Emergency stop
            </button>
            <span className="text-[11px] text-ink-3">Cancels every queued and running job and refuses new ones until resumed.</span>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function SubmitJob({ operations, initial, onSubmitted }: { operations: Operation[]; initial: string | null; onSubmitted: (job: Job) => Promise<unknown> }) {
  const [key, setKey] = useState(initial ?? '');
  const [filter, setFilter] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const op = operations.find((o) => `${o.toolId}:${o.operationId}` === key) ?? operations.find((o) => o.available);
  const filterLower = filter.trim().toLowerCase();
  const filteredOperations = filterLower === '' ? operations : operations.filter((o) => o === op || `${o.toolId}:${o.operationId} ${o.title}`.toLowerCase().includes(filterLower));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!op) return;
    setBusy(true);
    setError(null);
    try {
      const input: Record<string, unknown> = {};
      for (const f of op.fields) {
        const raw = (values[f.name] ?? '').trim();
        if (raw === '') continue;
        input[f.name] = f.type === 'targets' ? raw.split(/[\s,]+/).filter(Boolean) : f.type === 'integer' ? Number(raw) : raw;
      }
      const job = await apiRequest<Job>('/jobs', post({ toolId: op.toolId, operationId: op.operationId, input }));
      setValues({});
      await onSubmitted(job);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!op) return <p className="text-[12px] text-ink-3">No operation is available yet. Run discovery in the Tool Registry first.</p>;
  return (
    <form className="space-y-2" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      <input className={inputClass} placeholder="Search operations… e.g. remote, exploit, process" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <select
        className={inputClass}
        aria-label="Operation"
        value={`${op.toolId}:${op.operationId}`}
        onChange={(e) => {
          setKey(e.target.value);
          setValues({});
        }}
      >
        {filteredOperations.map((o) => (
          <option key={`${o.toolId}:${o.operationId}`} value={`${o.toolId}:${o.operationId}`} disabled={!o.available}>
            {o.toolId} · {o.title}
            {o.available ? '' : ` — ${o.unavailableReason}`}
          </option>
        ))}
      </select>
      {filterLower !== '' ? <p className="text-[11px] text-ink-3">{filteredOperations.length} of {operations.length} operations match</p> : null}
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
        <span>{op.description}</span>
        <StatusBadge tone={RISK[op.risk] ?? 'neutral'} label={`${op.risk} risk`} />
        {op.requiresApproval ? <StatusBadge tone="warning" label="Needs approval" /> : null}
        {op.targetKind === 'network' ? <span>Targets must be inside one active scope (max {op.maxAddresses} addresses).</span> : <span>Runs on this machine only.</span>}
      </div>
      {op.fields.map((f) => (
        <label key={f.name} className="block text-[11.5px] text-ink-2">
          {f.label}
          {f.required ? ' *' : ''}
          {f.type === 'targets' ? (
            <textarea className={`${inputClass} mt-1 h-16 font-mono`} value={values[f.name] ?? ''} placeholder="127.0.0.1" onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : f.type === 'remoteHost' ? (
            <div className="mt-1">
              <RemoteHostField value={values[f.name] ?? ''} onChange={(id) => setValues({ ...values, [f.name]: id })} />
            </div>
          ) : f.options ? (
            <select className={`${inputClass} mt-1`} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
              <option value="" disabled>
                Pick one…
              </option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={`${inputClass} mt-1 ${f.type === 'integer' ? 'w-40' : ''}`}
              type={f.type === 'integer' ? 'number' : 'text'}
              min={f.min ?? undefined}
              max={f.max ?? undefined}
              placeholder={f.default !== null ? String(f.default) : ''}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          )}
          <span className="block text-[11px] text-ink-3">{f.help}</span>
        </label>
      ))}
      <Button type="submit" variant="primary" busy={busy} disabled={!op.available}>
        <Send className="size-3.5" aria-hidden /> Submit job
      </Button>
    </form>
  );
}

function JobDetail({ job, onChanged }: { job: Job; onChanged: () => Promise<unknown> }) {
  const { user, can } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const own = job.requestedBy.type === 'USER' && job.requestedBy.id === user.username;

  const act = async (action: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<Job>(`/jobs/${job.id}/${action}`, post(body));
      setNote('');
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 bg-canvas/50 px-3 py-3 text-[12px]">
      {error ? <ErrorNotice error={error} /> : null}
      <dl className="grid gap-x-3 gap-y-0.5 text-ink-2 sm:grid-cols-[9rem_1fr]">
        <dt className="text-ink-3">Requested by</dt>
        <dd>
          {job.requestedBy.type === 'AGENT' ? 'Agent ' : ''}
          {job.requestedBy.id}
          {job.agentRunId ? (
            <Link className="ml-2 text-accent hover:underline" href="/agents">
              view agent runs
            </Link>
          ) : null}
        </dd>
        {job.scope ? (
          <>
            <dt className="text-ink-3">Scope</dt>
            <dd>{job.scope.name}</dd>
          </>
        ) : null}
        {job.decision ? (
          <>
            <dt className="text-ink-3">Decision</dt>
            <dd>
              {job.status === 'REJECTED' ? 'Rejected' : 'Approved'} by {job.decision.by} at {formatDateTime(job.decision.at)}
              {job.decision.note ? ` — ${job.decision.note}` : ''}
            </dd>
          </>
        ) : null}
        <dt className="text-ink-3">Input</dt>
        <dd className="font-mono text-[11.5px]">{JSON.stringify(job.input)}</dd>
        <dt className="text-ink-3">Command (argv)</dt>
        <dd className="break-all font-mono text-[11px]">
          {job.executable ?? '<executable>'} {job.args.map((a) => (a.length > 60 ? `${a.slice(0, 24)}…` : a)).join(' ')}
        </dd>
        {job.startedAt ? (
          <>
            <dt className="text-ink-3">Run</dt>
            <dd>
              started {formatDateTime(job.startedAt)}
              {job.durationMs !== null ? ` · ${(job.durationMs / 1000).toFixed(1)} s` : ''}
              {job.exitCode !== null ? ` · exit ${job.exitCode}` : ''}
              {job.termination && job.termination !== 'exited' ? ` · ${job.termination}` : ''}
            </dd>
          </>
        ) : null}
        {job.cancelledBy ? (
          <>
            <dt className="text-ink-3">Cancelled by</dt>
            <dd>{job.cancelledBy}</dd>
          </>
        ) : null}
        {job.retryOfId ? (
          <>
            <dt className="text-ink-3">Retry of</dt>
            <dd className="font-mono text-[11px]">{job.retryOfId}</dd>
          </>
        ) : null}
      </dl>
      {job.error ? <p className="text-critical">{job.error}</p> : null}
      {job.status === 'AWAITING_APPROVAL' && can('jobs:approve') ? (
        <div className="flex flex-wrap items-center gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-2">
          <input className={`${inputClass} max-w-sm`} placeholder="Decision note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="primary" busy={busy} onClick={() => void act('approve', note ? { note } : {})}>
            Approve
          </Button>
          <Button busy={busy} onClick={() => void act('reject', note ? { note } : {})}>
            Reject
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        {ACTIVE.includes(job.status) && (own || can('jobs:approve')) && can('jobs:submit') ? (
          <Button busy={busy} onClick={() => void act('cancel')}>
            Cancel job
          </Button>
        ) : null}
        {(job.status === 'FAILED' || job.status === 'CANCELLED') && can('jobs:submit') ? (
          <Button busy={busy} onClick={() => void act('retry')}>
            <RotateCcw className="size-3.5" aria-hidden /> Retry as new job
          </Button>
        ) : null}
      </div>
      {job.result !== null ? (
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Result</p>
          <JobResult result={job.result} />
        </div>
      ) : null}
      {job.stderrExcerpt ? (
        <details>
          <summary className="cursor-pointer text-ink-3">stderr</summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-ink-2">{job.stderrExcerpt}</pre>
        </details>
      ) : null}
      {job.stdoutExcerpt ? (
        <details>
          <summary className="cursor-pointer text-ink-3">stdout (excerpt)</summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-ink-2">{job.stdoutExcerpt}</pre>
        </details>
      ) : null}
      <NextSuggestions job={job} onSubmitted={() => void onChanged()} />
    </div>
  );
}

export function TaskQueue() {
  const { can } = useAuth();
  const params = useSearchParams();
  const [status, setStatus] = useState<Job['status'] | ''>('');
  const [open, setOpen] = useState<string | null>(params.get('job'));
  const jobs = useSWR<JobPage>(`/jobs?limit=50${status ? `&status=${status}` : ''}`, {
    refreshInterval: (data) => (data?.items.some((j) => ACTIVE.includes(j.status)) ? 2000 : 10_000),
  });
  const engine = useSWR<EngineStatus>('/engine', { refreshInterval: 5000 });
  const operations = useSWR<OperationList>('/operations');
  const openJob = useSWR<Job>(open && !jobs.data?.items.some((j) => j.id === open) ? `/jobs/${open}` : null);

  const items = useMemo(() => {
    const list = jobs.data?.items ?? [];
    return openJob.data && !list.some((j) => j.id === openJob.data!.id) ? [openJob.data, ...list] : list;
  }, [jobs.data, openJob.data]);

  const refresh = () => Promise.all([jobs.mutate(), engine.mutate()]);

  return (
    <div>
      <PageHeader
        title="Task Queue"
        summary="Jobs run by the Windows execution engine: fixed, reviewed operations only — no free-form commands. Network targets are checked against approved scopes; risky operations and every AI-agent request wait for human approval."
      />
      <div className="space-y-3 p-4">
        {engine.error ? <ErrorNotice error={engine.error} /> : null}
        {engine.data ? <EnginePanel engine={engine.data} onChanged={refresh} /> : <Skeleton className="h-28 w-full" />}

        {can('jobs:submit') ? (
          <Panel title="Submit job">
            {operations.error ? <ErrorNotice error={operations.error} /> : null}
            {operations.data ? (
              <SubmitJob
                operations={operations.data.items}
                initial={params.get('op')}
                onSubmitted={async (job) => {
                  setOpen(job.id);
                  await refresh();
                }}
              />
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </Panel>
        ) : null}

        {can('jobs:submit') ? <SequencePanel /> : null}

        <Panel
          title="Jobs"
          actions={
            <select className={`${inputClass} w-auto`} aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value as Job['status'] | '')}>
              <option value="">All statuses</option>
              {(Object.keys(STATUS) as Job['status'][]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          }
        >
          {jobs.error ? <ErrorNotice error={jobs.error} /> : null}
          {!jobs.data && !jobs.error ? <Skeleton className="h-24 w-full" /> : null}
          {jobs.data && items.length === 0 ? <p className="text-[12px] text-ink-3">No jobs yet.</p> : null}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="py-1.5 pr-3 font-medium">Operation</th>
                    <th className="py-1.5 pr-3 font-medium">Targets</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium">Requested by</th>
                    <th className="py-1.5 pr-3 font-medium">Created</th>
                    <th className="py-1.5 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((j) => {
                    const expanded = open === j.id;
                    const s = STATUS[j.status];
                    return (
                      <Fragment key={j.id}>
                        <tr className="cursor-pointer border-b border-edge/60 align-top hover:bg-panel-2/60" onClick={() => setOpen(expanded ? null : j.id)}>
                          <td className="py-1.5 pr-3">
                            <button type="button" aria-expanded={expanded} className="flex items-start gap-1.5 text-left">
                              {expanded ? <ChevronDown className="mt-0.5 size-3.5 text-ink-3" aria-hidden /> : <ChevronRight className="mt-0.5 size-3.5 text-ink-3" aria-hidden />}
                              <span>
                                <span className="text-ink">{j.operationTitle}</span>
                                <span className="block font-mono text-[11px] text-ink-3">{j.toolId}</span>
                              </span>
                            </button>
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-[11.5px] text-ink-2">{j.targets.join(', ') || 'this machine'}</td>
                          <td className="py-1.5 pr-3">
                            <StatusBadge tone={s.tone} label={s.label} />
                          </td>
                          <td className="py-1.5 pr-3 text-ink-2">
                            {j.requestedBy.type === 'AGENT' ? <span className="text-warning">agent </span> : null}
                            {j.requestedBy.id}
                          </td>
                          <td className="py-1.5 pr-3 text-ink-3">{formatDateTime(j.createdAt)}</td>
                          <td className="py-1.5 font-mono text-ink-2">{j.durationMs !== null ? `${(j.durationMs / 1000).toFixed(1)} s` : '—'}</td>
                        </tr>
                        {expanded ? (
                          <tr className="border-b border-edge/60">
                            <td colSpan={6} className="p-0">
                              <JobDetail job={j} onChanged={refresh} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
