import { CornerDownRight, GitBranch, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { StatusBadge, type StatusTone } from '@/components/ui';
import type { AgentRun, AgentRunDetail } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { buildRunTree, type RunNode } from '@/lib/run-tree';
import { DelegationTreeView } from './delegation-tree-view';

export const RUN_STATUS: Record<AgentRun['status'], { tone: StatusTone; label: string }> = {
  RUNNING: { tone: 'pending', label: 'Running' },
  SUCCEEDED: { tone: 'good', label: 'Succeeded' },
  FAILED: { tone: 'critical', label: 'Failed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
};

const DECISION: Record<AgentRun['requests'][number]['decision'], StatusTone> = {
  EXECUTED: 'good',
  QUEUED: 'neutral',
  DENIED: 'warning',
  REJECTED: 'neutral',
  // Claim verdicts (type:"claim" entries only — see src/claims/claims.ts, backend).
  VERIFIED: 'good',
  CITED_UNCHECKED: 'warning',
  UNSUPPORTED: 'critical',
  MISSING_ARTIFACT: 'critical',
  ARTIFACT_NOT_SUCCESSFUL: 'warning',
  OUT_OF_SCOPE: 'critical',
  UNCITED: 'warning',
};

function describeRequest(r: AgentRun['requests'][number]): string {
  if (r.type === 'delegate') return `delegate → ${r.agent ?? '?'}`;
  if (r.type === 'tool') return `tool ${r.tool ?? '?'} · ${r.operation ?? '?'}${r.target ? ` · ${r.target}` : ''}`;
  if (r.type === 'claim') return `claim: ${r.excerpt ?? '?'}`;
  return `invalid request${r.excerpt ? `: ${r.excerpt}` : ''}`;
}

function RunCard({ node, names }: { node: RunNode; names: Record<string, string> }) {
  const { run } = node;
  const s = RUN_STATUS[run.status];
  return (
    <div className="space-y-2">
      <div className="rounded border border-edge bg-canvas/60 p-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
          <span className="font-semibold text-ink">{names[run.agentId] ?? run.agentId}</span>
          <StatusBadge tone={s.tone} label={s.label} />
          {run.model ? <span className="font-mono text-ink-3">{run.model}</span> : null}
          {run.totalMs !== null ? <span className="font-mono text-ink-3">{(run.totalMs / 1000).toFixed(1)} s</span> : null}
          {run.usage.inputTokens !== null || run.usage.outputTokens !== null ? (
            <span className="font-mono text-ink-3">
              {run.usage.inputTokens ?? '—'} in / {run.usage.outputTokens ?? '—'} out tokens
            </span>
          ) : null}
          <span className="text-ink-3">{formatDateTime(run.createdAt)}</span>
        </div>
        {run.depth > 0 ? (
          <p className="mt-1.5 text-[11.5px] text-ink-2">
            <span className="text-ink-3">Delegated task: </span>
            {run.task}
          </p>
        ) : null}
        {run.output ? <div className="mt-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink">{run.output}</div> : null}
        {run.error ? <p className="mt-2 text-[12px] text-critical">{run.error}</p> : null}
        {run.failedAttempts.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-[11px] text-ink-3">
            {run.failedAttempts.map((a, i) => (
              <li key={i}>
                <span className="font-mono">{a.model}</span> failed: {a.error}
              </li>
            ))}
          </ul>
        ) : null}
        {run.requests.length > 0 ? (
          <div className="mt-2 border-t border-edge pt-2">
            <p className="mb-1 text-[10.5px] uppercase tracking-wider text-ink-3">Structured requests</p>
            <ul className="space-y-1">
              {run.requests.map((r, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2 text-[11.5px]">
                  <StatusBadge tone={DECISION[r.decision]} label={r.decision === 'QUEUED' ? 'awaiting approval' : r.decision.toLowerCase()} />
                  <span className="font-mono text-ink-2">{describeRequest(r)}</span>
                  {r.reason ? <span className="text-ink-3">— {r.reason}</span> : null}
                  {r.jobId ? (
                    <Link href={`/tasks?job=${r.jobId}`} className="text-accent hover:underline">
                      Review job
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <div className="space-y-2 border-l border-edge-strong pl-3">
          {node.children.map((child) => (
            <div key={child.run.id} className="flex gap-1.5">
              <CornerDownRight className="mt-2.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1">
                <RunCard node={child} names={names} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A run and every delegated run beneath it. "Tree" gives a real structural at-a-glance view (only
 * worth offering once there's at least one delegation to show); "Cards" (the default) shows full detail
 * inline — output, structured requests, iterations — which the tree view deliberately doesn't repeat. */
export function RunView({ detail, names }: { detail: AgentRunDetail; names: Record<string, string> }) {
  const [view, setView] = useState<'cards' | 'tree'>('cards');
  const root = buildRunTree(detail.run, detail.descendants);
  const hasDelegations = detail.descendants.length > 0;

  return (
    <div className="space-y-2">
      {hasDelegations ? (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${view === 'cards' ? 'border-accent-strong/60 bg-accent-strong/10 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
          >
            <LayoutList className="size-3" aria-hidden /> Cards
          </button>
          <button
            type="button"
            onClick={() => setView('tree')}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${view === 'tree' ? 'border-accent-strong/60 bg-accent-strong/10 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'}`}
          >
            <GitBranch className="size-3" aria-hidden /> Tree
          </button>
        </div>
      ) : null}
      {view === 'tree' && hasDelegations ? <DelegationTreeView root={root} names={names} /> : <RunCard node={root} names={names} />}
    </div>
  );
}
