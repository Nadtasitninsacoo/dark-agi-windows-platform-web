'use client';

import { ChevronDown, ChevronRight, Languages, ListOrdered, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, Fragment, useState } from 'react';
import useSWR from 'swr';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type Operation, type OperationList, type Sequence, type SequenceList } from '@/lib/api/client';
import { aliasFor, CommandError, commandHint, commandTemplate, commandTemplateAuto, COMMAND_PREFIX, COMMAND_SUFFIX, parseCommand } from '@/lib/commands';
import { formatDateTime } from '@/lib/format';
import { operationTitle } from '@/lib/operation-titles-th';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const RISK: Record<string, StatusTone> = { low: 'neutral', moderate: 'warning', high: 'critical' };

const SEQUENCE_STATUS: Record<Sequence['status'], { tone: StatusTone; label: string }> = {
  SCHEDULED: { tone: 'neutral', label: 'Scheduled' },
  PENDING: { tone: 'neutral', label: 'Pending' },
  RUNNING: { tone: 'pending', label: 'Running' },
  PAUSED_FOR_APPROVAL: { tone: 'warning', label: 'Paused — needs approval' },
  SUCCEEDED: { tone: 'good', label: 'Succeeded' },
  FAILED: { tone: 'critical', label: 'Failed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
};
const ACTIVE: Sequence['status'][] = ['SCHEDULED', 'PENDING', 'RUNNING', 'PAUSED_FOR_APPROVAL'];

type DraftStep = { id: number; line: string; error: string | null };
type DelayUnit = 'seconds' | 'minutes' | 'hours';
const DELAY_UNIT_MS: Record<DelayUnit, number> = { seconds: 1000, minutes: 60_000, hours: 3_600_000 };

/**
 * An ordered list of operations the engine runs one at a time — step N+1 never starts until step N
 * reaches a terminal status. Built on the same POST /sequences the backend's SequenceService drives;
 * see dark-agi-backend's docs/architecture or sequence.service.ts for how pausing-for-approval and
 * resuming works (it falls out of the normal job-approval flow, nothing sequence-specific).
 */
function SequenceBuilder({ operations, onCreated }: { operations: Operation[]; onCreated: () => Promise<unknown> }) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>([{ id: 0, line: '', error: null }]);
  const [schedule, setSchedule] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'at' | 'in'>('at');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayAmount, setDelayAmount] = useState('');
  const [delayUnit, setDelayUnit] = useState<DelayUnit>('minutes');
  const [language, setLanguage] = useState<'en' | 'th'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const nextId = useState(() => ({ current: 1 }))[0];
  const sortedOperations = [...operations].sort((a, b) => (aliasFor(a) ?? '').localeCompare(aliasFor(b) ?? ''));

  const updateStep = (id: number, line: string) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, line, error: null } : s)));
  const addStep = () => setSteps((prev) => [...prev, { id: nextId.current++, line: '', error: null }]);
  const removeStep = (id: number) => setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const move = (id: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed: { toolId: string; operationId: string; input: Record<string, unknown> }[] = [];
    let hadError = false;
    setSteps((prev) =>
      prev.map((s) => {
        const line = s.line.trim();
        if (line === '') {
          hadError = true;
          return { ...s, error: 'Enter a command' };
        }
        try {
          parsed.push(parseCommand(line, operations));
          return { ...s, error: null };
        } catch (err) {
          hadError = true;
          return { ...s, error: err instanceof CommandError ? err.message : 'Invalid command' };
        }
      }),
    );
    if (hadError) return;

    let scheduledAtIso: string | undefined;
    if (schedule && scheduleMode === 'at' && scheduledAt) {
      scheduledAtIso = new Date(scheduledAt).toISOString();
    } else if (schedule && scheduleMode === 'in') {
      const amount = Number.parseFloat(delayAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(new Error('Enter how long from now to wait (a positive number)'));
        return;
      }
      scheduledAtIso = new Date(Date.now() + amount * DELAY_UNIT_MS[delayUnit]).toISOString();
    }

    setBusy(true);
    try {
      await apiRequest('/sequences', post({ name: name.trim() || undefined, scheduledAt: scheduledAtIso, steps: parsed }));
      setName('');
      setSteps([{ id: 0, line: '', error: null }]);
      setSchedule(false);
      setScheduledAt('');
      setDelayAmount('');
      await onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-2" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex items-center gap-2">
        <input className={inputClass} placeholder="Sequence name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          type="button"
          onClick={() => setLanguage((l) => (l === 'en' ? 'th' : 'en'))}
          title="Switch the operation names below between English and Thai"
          className="flex shrink-0 items-center gap-1 rounded border border-edge-strong px-1.5 py-1 text-[11px] text-ink-3 hover:border-accent/60"
        >
          <Languages className="size-3" aria-hidden />
          {language === 'en' ? 'EN' : 'TH'}
        </button>
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const hint = commandHint(s.line, operations);
          return (
            <div key={s.id} className="rounded border border-edge/60 p-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-center text-[11px] text-ink-3">{i + 1}.</span>
                <select
                  className="w-auto shrink-0 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                  value=""
                  aria-label={`Pick an operation for step ${i + 1}`}
                  onChange={(e) => {
                    const op = operations.find((o) => `${o.toolId}:${o.operationId}` === e.target.value);
                    if (op) updateStep(s.id, op.targetKind === 'network' ? commandTemplateAuto(op) : commandTemplate(op));
                  }}
                >
                  <option value="" disabled>
                    Pick an operation…
                  </option>
                  {sortedOperations.map((o) => (
                    <option key={`${o.toolId}:${o.operationId}`} value={`${o.toolId}:${o.operationId}`} disabled={!o.available}>
                      {aliasFor(o) ?? `${o.toolId}:${o.operationId}`} · {operationTitle(o, language)}
                      {o.available ? '' : ` — not installed/discovered yet`}
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputClass} font-mono`}
                  placeholder={`${COMMAND_PREFIX} net:ping host=<host> ${COMMAND_SUFFIX}`}
                  value={s.line}
                  onChange={(e) => updateStep(s.id, e.target.value)}
                />
                <button type="button" onClick={() => move(s.id, -1)} disabled={i === 0} className="shrink-0 text-ink-3 hover:text-ink disabled:opacity-30" title="Move up">
                  <ChevronDown className="size-3.5 rotate-180" aria-hidden />
                </button>
                <button type="button" onClick={() => move(s.id, 1)} disabled={i === steps.length - 1} className="shrink-0 text-ink-3 hover:text-ink disabled:opacity-30" title="Move down">
                  <ChevronDown className="size-3.5" aria-hidden />
                </button>
                <button type="button" onClick={() => removeStep(s.id)} disabled={steps.length === 1} className="shrink-0 text-ink-3 hover:text-critical disabled:opacity-30" title="Remove step">
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
              {hint.operation ? (
                <p className="ml-6.5 mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
                  <span className="font-semibold text-ink-2">{operationTitle(hint.operation, language)}</span>
                  <span>— {hint.operation.description}</span>
                  <StatusBadge tone={RISK[hint.operation.risk] ?? 'neutral'} label={`${hint.operation.risk} risk`} />
                  {hint.operation.requiresApproval ? <StatusBadge tone="warning" label="Needs approval" /> : null}
                  {hint.operation.targetKind === 'network' ? (
                    <span>No target typed? It&apos;s filled in from your one active scope when the step runs.</span>
                  ) : null}
                </p>
              ) : s.line.trim() !== '' ? (
                <p className="ml-6.5 mt-1 text-[11px] text-ink-3">Unrecognized command — pick an operation above, or check the alias and syntax.</p>
              ) : null}
              {s.error ? <p className="ml-6.5 mt-1 text-[11px] text-critical">{s.error}</p> : null}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={addStep} className="flex items-center gap-1 text-[11.5px] text-accent hover:underline">
        <Plus className="size-3.5" aria-hidden /> Add step
      </button>
      <div className="space-y-2 border-t border-edge pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
            Schedule for later
          </label>
          {!schedule ? <span className="text-[11.5px] text-ink-3">Runs immediately once submitted</span> : null}
          <Button type="submit" variant="primary" busy={busy}>
            <ListOrdered className="size-3.5" aria-hidden /> Queue sequence
          </Button>
        </div>
        {schedule ? (
          <div className="flex flex-wrap items-center gap-2 pl-5">
            <select
              className="rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as 'at' | 'in')}
            >
              <option value="at">At a specific time</option>
              <option value="in">After a delay</option>
            </select>
            {scheduleMode === 'at' ? (
              <input
                type="datetime-local"
                className="w-[190px] rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required={schedule && scheduleMode === 'at'}
              />
            ) : (
              <>
                <span className="text-[11.5px] text-ink-2">In</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="w-16 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                  value={delayAmount}
                  onChange={(e) => setDelayAmount(e.target.value)}
                  required={schedule && scheduleMode === 'in'}
                />
                <select
                  className="rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                  value={delayUnit}
                  onChange={(e) => setDelayUnit(e.target.value as DelayUnit)}
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                </select>
              </>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}

function SequenceRow({ sequence, onChanged }: { sequence: Sequence; onChanged: () => Promise<unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = SEQUENCE_STATUS[sequence.status];
  const succeeded = sequence.steps.filter((st) => st.status === 'SUCCEEDED').length;

  const cancel = async () => {
    setBusy(true);
    try {
      await apiRequest(`/sequences/${sequence.id}/cancel`, post());
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-edge last:border-0">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between gap-2 px-1 py-2 text-left hover:bg-canvas/40">
        <span className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="size-3.5 shrink-0 text-ink-3" aria-hidden /> : <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />}
          <span className="truncate text-[12px] text-ink">{sequence.name ?? `Sequence ${sequence.id.slice(0, 8)}`}</span>
          <span className="shrink-0 text-[11px] text-ink-3">
            {succeeded}/{sequence.steps.length} steps
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge tone={s.tone} label={s.label} />
          <span className="text-[11px] text-ink-3">{formatDateTime(sequence.createdAt)}</span>
        </span>
      </button>
      {expanded ? (
        <div className="space-y-2 bg-canvas/50 px-3 py-3 text-[12px]">
          {sequence.scheduledAt ? <p className="text-ink-3">Scheduled for {formatDateTime(sequence.scheduledAt)}</p> : null}
          <ol className="space-y-1">
            {sequence.steps.map((step) => (
              <li key={step.position} className="flex items-center justify-between gap-2 rounded border border-edge bg-panel-2/40 px-2 py-1">
                <span className="font-mono text-[11.5px] text-ink">
                  {step.position + 1}. {step.toolId}:{step.operationId}
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge
                    tone={step.status === 'SUCCEEDED' ? 'good' : step.status === 'FAILED' ? 'critical' : step.status === 'SUBMITTED' ? 'pending' : 'neutral'}
                    label={step.status.toLowerCase()}
                  />
                  {step.jobId ? (
                    <Link href={`/tasks?job=${step.jobId}`} className="text-accent hover:underline">
                      view job
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          {sequence.status === 'SUCCEEDED' || sequence.status === 'FAILED' || sequence.status === 'CANCELLED' ? (
            <div className={`flex items-center gap-2 rounded border px-3 py-2 ${sequence.status === 'SUCCEEDED' ? 'border-good/30 bg-good/10 text-good' : sequence.status === 'FAILED' ? 'border-critical/30 bg-critical/10 text-critical' : 'border-edge-strong bg-panel-2 text-ink-2'}`}>
              {sequence.status === 'SUCCEEDED' ? (
                <span>All {sequence.steps.length} step(s) finished successfully.</span>
              ) : sequence.status === 'FAILED' ? (
                <span>
                  Stopped at step {sequence.currentStep + 1} of {sequence.steps.length} — it did not succeed, so later steps never ran.
                </span>
              ) : (
                <span>Cancelled before completion.</span>
              )}
            </div>
          ) : null}
          {ACTIVE.includes(sequence.status) ? (
            <Button busy={busy} onClick={() => void cancel()}>
              <X className="size-3.5" aria-hidden /> Cancel sequence
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SequencePanel() {
  const operations = useSWR<OperationList>('/operations');
  const sequences = useSWR<SequenceList>('/sequences', { refreshInterval: (data) => (data?.items.some((s) => ACTIVE.includes(s.status)) ? 2000 : 15_000) });
  const refresh = () => sequences.mutate();

  return (
    <Panel title="Sequences" subtitle="Queue several operations to run one at a time, in order — optionally scheduled for later">
      {operations.data ? (
        <SequenceBuilder operations={operations.data.items} onCreated={refresh} />
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
      <div className="mt-3 border-t border-edge pt-2">
        {sequences.error ? <ErrorNotice error={sequences.error} /> : null}
        {!sequences.data && !sequences.error ? <Skeleton className="h-16 w-full" /> : null}
        {sequences.data && sequences.data.items.length === 0 ? <p className="text-[12px] text-ink-3">No sequences yet.</p> : null}
        {sequences.data?.items.map((s) => (
          <Fragment key={s.id}>
            <SequenceRow sequence={s} onChanged={refresh} />
          </Fragment>
        ))}
      </div>
    </Panel>
  );
}
