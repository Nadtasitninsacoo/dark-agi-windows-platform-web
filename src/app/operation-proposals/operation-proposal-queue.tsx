'use client';

import { ChevronDown, ChevronRight, Lightbulb, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ConfirmDialog, ErrorNotice, Panel, Skeleton, StatusBadge, TerminalBox, type StatusTone } from '@/components/ui';
import { apiRequest, type OperationProposal, type OperationProposalCreateResult, type OperationProposalList } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const STATUS: Record<OperationProposal['status'], { tone: StatusTone; label: string }> = {
  PENDING_REVIEW: { tone: 'warning', label: 'Pending review' },
  APPROVED: { tone: 'good', label: 'Approved' },
  REJECTED: { tone: 'neutral', label: 'Rejected' },
};

const KIND_LABEL: Record<OperationProposal['kind'], string> = {
  NEW_OPERATION: 'New operation',
  NEW_TOOL_AND_OPERATION: 'New tool + operation',
};

interface DraftSpecShape {
  readonly toolId?: string;
  readonly operationId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly category?: string;
  readonly executableTool?: string;
  readonly risk?: string;
  readonly targetKind?: string;
  readonly maxAddresses?: number | null;
  readonly timeoutMs?: number;
  readonly maxConcurrent?: number;
  readonly fields?: readonly { name: string; label: string; type: string; required: boolean; help: string }[];
  readonly argsDescription?: string;
  readonly parseDescription?: string;
  readonly newTool?: { id: string; name: string; description: string } | null;
}

/** "Ask AI to design a new operation" — the entry point when a goal has no existing operation to cover it.
 * Also reachable from the Terminal / Task Queue's "What next?" panel when it has nothing to suggest. */
function ProposeForm({ onCreated }: { onCreated: (result: OperationProposalCreateResult) => void }) {
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    const trimmed = goal.trim();
    if (trimmed === '') return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<OperationProposalCreateResult>('/operation-proposals', post({ goal: trimmed }));
      onCreated(result);
      if (result.gapConfirmed) setGoal('');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
          placeholder="Describe the goal nothing existing operation covers…"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <Button variant="primary" busy={busy} disabled={goal.trim() === ''} onClick={() => void submit()}>
          <Send className="size-3.5" aria-hidden /> Analyze gap
        </Button>
      </div>
      <p className="text-[11px] text-ink-3">Two separate AI calls, not one trusted guess: first it decides whether a real gap exists and which approach is best; only then does it draft a concrete spec. Nothing here ever runs — it only ever produces a proposal for a human to review.</p>
    </div>
  );
}

function ValidationChecklist({ validation }: { validation: OperationProposal['validation'] }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Validation checklist</p>
      <ul className="space-y-1">
        {validation.checks.map((c) => (
          <li key={c.rule} className="flex items-start gap-1.5">
            <StatusBadge tone={c.passed ? 'good' : 'critical'} label={c.passed ? 'Pass' : 'Fail'} />
            <span className="text-ink-2">
              <span className="font-mono text-[11px] text-ink-3">{c.rule}</span>
              {c.detail ? <span className="block text-[11px]">{c.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type CodegenMode = 'HUMAN_FINISHES' | 'AI_DRAFTS_FULL';

/** Phase C: turns an approved proposal into a real .ts file in its own workspace, with a genuine compile
 * check — never something that gets wired into the live system by this page. */
function CodegenPanel({ proposal, canReview, onChanged }: { proposal: OperationProposal; canReview: boolean; onChanged: () => Promise<unknown> }) {
  const [mode, setMode] = useState<CodegenMode>('HUMAN_FINISHES');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/operation-proposals/${proposal.id}/write-code`, post({ mode }));
      await onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (proposal.status !== 'APPROVED') return null;

  return (
    <div className="space-y-2 rounded border border-edge px-2 py-2">
      <p className="text-[10.5px] uppercase tracking-wider text-ink-3">Code generation</p>
      {canReview ? (
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink" value={mode} onChange={(e) => setMode(e.target.value as CodegenMode)}>
            <option value="HUMAN_FINISHES">Human finishes the implementation</option>
            <option value="AI_DRAFTS_FULL">AI drafts the full implementation</option>
          </select>
          <Button busy={busy} onClick={() => void generate()}>
            {proposal.generatedCode ? 'Regenerate file' : 'Generate file'}
          </Button>
        </div>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      {proposal.generatedCode ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            <StatusBadge tone={proposal.compileCheck?.passed ? 'good' : 'critical'} label={proposal.compileCheck?.passed ? 'tsc: compiles' : 'tsc: compile error'} />
            <span className="font-mono">{proposal.generatedCodePath}</span>
            <span>· mode: {proposal.codegenMode}</span>
          </div>
          {proposal.compileCheck && !proposal.compileCheck.passed ? (
            <div>
              <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Compiler output</p>
              <TerminalBox maxHeight="8rem" className="text-critical">{proposal.compileCheck.output}</TerminalBox>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Generated file</p>
            <TerminalBox maxHeight="12rem">{proposal.generatedCode}</TerminalBox>
          </div>
          <p className="text-[11px] text-ink-3">This file only exists in its own workspace, outside the live system. A human still has to finish/review it, move it out, wire it into the operations registry, run the full test suite, and commit — none of that happens automatically.</p>
        </div>
      ) : null}
    </div>
  );
}

function ProposalDetail({ proposal, canReview, onChanged }: { proposal: OperationProposal; canReview: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirming, setConfirming] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const spec = proposal.draftSpec as DraftSpecShape;

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/operation-proposals/${proposal.id}/decide`, post({ decision }));
      setConfirming(null);
      await onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 bg-canvas/50 px-3 py-3 text-[12px] lg:grid-cols-2">
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Goal</p>
          <p className="text-ink-2">{proposal.goal}</p>
        </div>
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Gap analysis — hypotheses considered</p>
          <ul className="space-y-1.5">
            {proposal.gapAnalysis.hypotheses.map((h, i) => (
              <li key={i} className={`rounded border px-2 py-1 ${i === proposal.gapAnalysis.chosenIndex ? 'border-accent/60 bg-accent/5' : 'border-edge'}`}>
                <div className="flex items-center gap-1.5">
                  {i === proposal.gapAnalysis.chosenIndex ? <StatusBadge tone="good" label="Chosen" /> : null}
                  <span className="font-mono text-[11px] text-ink-3">{h.kind}</span>
                </div>
                <p className="text-ink-2">{h.summary}</p>
                <p className="text-[11px] text-ink-3">{h.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
        <ValidationChecklist validation={proposal.validation} />
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Drafted operation</p>
          <dl className="grid grid-cols-[8.5rem_1fr] gap-x-2 gap-y-0.5 text-ink-2">
            <dt className="text-ink-3">Operation</dt>
            <dd className="font-mono text-[11.5px]">{spec.toolId}:{spec.operationId}</dd>
            <dt className="text-ink-3">Title</dt>
            <dd>{spec.title}</dd>
            <dt className="text-ink-3">Category</dt>
            <dd>{spec.category}</dd>
            <dt className="text-ink-3">Executable tool</dt>
            <dd className="font-mono text-[11.5px]">{spec.executableTool}</dd>
            <dt className="text-ink-3">Model&apos;s own risk</dt>
            <dd>{spec.risk} <span className="text-[11px] text-ink-3">(stored as &quot;high&quot; regardless — see below)</span></dd>
            <dt className="text-ink-3">Target kind</dt>
            <dd>{spec.targetKind}{spec.targetKind === 'network' ? ` · max ${spec.maxAddresses ?? '—'} addresses` : ''}</dd>
          </dl>
          <p className="mt-1.5 text-ink-2">{spec.description}</p>
        </div>
        {spec.fields && spec.fields.length > 0 ? (
          <div>
            <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Fields</p>
            <ul className="space-y-0.5">
              {spec.fields.map((f) => (
                <li key={f.name} className="font-mono text-[11px] text-ink-2">
                  {f.name}{f.required ? '' : '?'}:{f.type} <span className="font-sans text-ink-3">— {f.help}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">How it would run (prose — never executed as-is)</p>
          <TerminalBox maxHeight="6rem">args(): {spec.argsDescription}{'\n\n'}parse(): {spec.parseDescription}</TerminalBox>
        </div>
        {spec.newTool ? (
          <div className="rounded border border-warning/40 bg-warning/5 px-2 py-1.5">
            <p className="text-[10.5px] uppercase tracking-wider text-warning">Requires a new tool</p>
            <p className="text-ink-2">{spec.newTool.name} ({spec.newTool.id}) — {spec.newTool.description}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
          <StatusBadge tone="critical" label="Forced: high risk" />
          <StatusBadge tone="warning" label="Forced: needs approval" />
          <span>Drafted by {proposal.model}</span>
        </div>
        {error ? <ErrorNotice error={error} /> : null}
        {proposal.status === 'PENDING_REVIEW' && canReview ? (
          <div className="flex gap-2">
            <Button variant="primary" busy={busy} disabled={!proposal.validation.passed} onClick={() => setConfirming('APPROVED')}>
              Approve
            </Button>
            <Button variant="danger" busy={busy} onClick={() => setConfirming('REJECTED')}>
              Reject
            </Button>
            {!proposal.validation.passed ? <span className="self-center text-[11px] text-critical">Fails the validation checklist — cannot be approved as-is.</span> : null}
          </div>
        ) : proposal.decidedBy ? (
          <p className="text-[11px] text-ink-3">
            {proposal.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {proposal.decidedBy} · {proposal.decidedAt ? formatDateTime(proposal.decidedAt) : ''}
            {proposal.decisionNote ? ` — "${proposal.decisionNote}"` : ''}
          </p>
        ) : null}
        <CodegenPanel proposal={proposal} canReview={canReview} onChanged={onChanged} />
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title={confirming === 'APPROVED' ? 'Approve this proposal?' : 'Reject this proposal?'}
        body={confirming === 'APPROVED' ? 'This only marks the spec reviewed and safe to implement — it still needs a human to write and wire in the real code before anything can run.' : 'This proposal will be marked rejected and can no longer be approved.'}
        confirmLabel={confirming === 'APPROVED' ? 'Approve' : 'Reject'}
        busy={busy}
        onConfirm={() => void decide(confirming!)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

export function OperationProposalQueue() {
  const { can } = useAuth();
  const params = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<OperationProposal['status'] | ''>('');
  const [open, setOpen] = useState<string | null>(params.get('id'));
  const [lastResult, setLastResult] = useState<OperationProposalCreateResult | null>(null);
  const proposals = useSWR<OperationProposalList>(`/operation-proposals${statusFilter ? `?status=${statusFilter}` : ''}`);

  const items = proposals.data?.items ?? [];
  const counts = {
    PENDING_REVIEW: items.filter((p) => p.status === 'PENDING_REVIEW').length,
    APPROVED: items.filter((p) => p.status === 'APPROVED').length,
    REJECTED: items.filter((p) => p.status === 'REJECTED').length,
  };

  const onCreated = (result: OperationProposalCreateResult) => {
    setLastResult(result);
    if (result.gapConfirmed) setOpen(result.proposal.id);
    void proposals.mutate();
  };

  return (
    <div>
      <PageHeader
        title="Operation Proposals"
        summary="When no existing operation can satisfy a goal, the AI analyzes the gap and drafts a new one following this platform's own conventions — always inert data a human must approve, never something that runs on its own."
      />
      <div className="space-y-3 p-4">
        {can('operations:propose') ? (
          <Panel title="Propose a new operation">
            <ProposeForm onCreated={onCreated} />
            {lastResult && !lastResult.gapConfirmed ? (
              <p className="mt-2 rounded border border-edge bg-panel-2/60 px-2 py-1.5 text-[12px] text-ink-2">{lastResult.reason}</p>
            ) : null}
          </Panel>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['Pending review', counts.PENDING_REVIEW, 'PENDING_REVIEW'],
              ['Approved', counts.APPROVED, 'APPROVED'],
              ['Rejected', counts.REJECTED, 'REJECTED'],
            ] as const
          ).map(([label, value, key]) => (
            <button
              key={label}
              type="button"
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              aria-pressed={statusFilter === key}
              className={`rounded-md border bg-panel px-3 py-2 text-left transition-colors ${statusFilter === key ? 'border-accent/60' : 'border-edge hover:border-edge-strong'}`}
            >
              <div className="font-mono text-[18px] text-ink">{value}</div>
              <div className="text-[11px] text-ink-3">{label}</div>
            </button>
          ))}
        </div>

        <Panel title="Proposals" subtitle={<span className="flex items-center gap-1"><Lightbulb className="size-3" aria-hidden /> AI-drafted, human-decided</span>}>
          {proposals.error ? <ErrorNotice error={proposals.error} /> : null}
          {!proposals.data && !proposals.error ? <Skeleton className="h-48 w-full" /> : null}
          {proposals.data ? (
            items.length === 0 ? (
              <p className="text-[12px] text-ink-3">No proposals yet.</p>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="w-8 py-1.5 pr-2 font-medium" />
                    <th className="py-1.5 pr-3 font-medium">Goal</th>
                    <th className="py-1.5 pr-3 font-medium">Kind</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium">Validation</th>
                    <th className="py-1.5 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const expanded = open === p.id;
                    const st = STATUS[p.status];
                    return (
                      <Fragment key={p.id}>
                        <tr className="cursor-pointer border-b border-edge/60 align-top hover:bg-panel-2/60" onClick={() => setOpen(expanded ? null : p.id)}>
                          <td className="py-1.5 pr-2">{expanded ? <ChevronDown className="size-3.5 text-ink-3" aria-hidden /> : <ChevronRight className="size-3.5 text-ink-3" aria-hidden />}</td>
                          <td className="max-w-xs truncate py-1.5 pr-3 text-ink">{p.goal}</td>
                          <td className="py-1.5 pr-3 text-ink-2">{KIND_LABEL[p.kind]}</td>
                          <td className="py-1.5 pr-3">
                            <StatusBadge tone={st.tone} label={st.label} />
                          </td>
                          <td className="py-1.5 pr-3">
                            <StatusBadge tone={p.validation.passed ? 'good' : 'critical'} label={p.validation.passed ? 'Passes' : 'Fails'} />
                          </td>
                          <td className="py-1.5 font-mono text-ink-3">{formatDateTime(p.createdAt)}</td>
                        </tr>
                        {expanded ? (
                          <tr className="border-b border-edge/60">
                            <td colSpan={6} className="p-0">
                              <ProposalDetail proposal={p} canReview={can('operations:review')} onChanged={() => proposals.mutate()} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
