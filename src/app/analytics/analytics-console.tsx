'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { JobTrendChart } from '@/components/job-trend-chart';
import { PageHeader } from '@/components/page-header';
import { ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import type { AgentList, AiModelList, AuditVerification, EngineStatus, Job, JobTrend } from '@/lib/api/client';

type JobStatus = Job['status'];

/**
 * Phase 9 of the Intelligence Command Center directive — cross-platform analytics, built mostly from
 * real data already exposed elsewhere (engine job counts, per-agent stats, per-model stats, the audit
 * chain), plus one real Mission 08 addition: a day-bucketed job-count trend (`GET /engine/job-trend`,
 * the first real time-series this platform has ever had for jobs — see its own backend doc comment for
 * why it needed a raw query). Every other number here is still a real, current snapshot.
 */

const JOB_STATUS: Record<JobStatus, { label: string; barClass: string; tone: 'good' | 'warning' | 'critical' | 'neutral' | 'pending' }> = {
  AWAITING_APPROVAL: { label: 'Awaiting approval', barClass: 'bg-warning', tone: 'warning' },
  QUEUED: { label: 'Queued', barClass: 'bg-ink-3/40', tone: 'neutral' },
  RUNNING: { label: 'Running', barClass: 'bg-cyan', tone: 'pending' },
  SUCCEEDED: { label: 'Succeeded', barClass: 'bg-good', tone: 'good' },
  FAILED: { label: 'Failed', barClass: 'bg-critical', tone: 'critical' },
  CANCELLED: { label: 'Cancelled', barClass: 'bg-ink-3/70', tone: 'neutral' },
  REJECTED: { label: 'Rejected', barClass: 'bg-critical/55', tone: 'critical' },
};
const JOB_STATUS_ORDER: JobStatus[] = ['AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED'];

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-edge bg-panel p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-[26px] leading-none text-ink">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

/** A single-hue magnitude bar — identity comes from the direct text label, never from color, so this
 * never needs a categorical palette no matter how many rows it has. 4px rounded data-end, square baseline. */
function MetricBar({ label, value, max, display, barClass = 'bg-accent' }: { label: string; value: number; max: number; display: string; barClass?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-36 shrink-0 truncate text-ink-2" title={label}>
        {label}
      </span>
      <div className="h-[10px] min-w-0 flex-1 rounded-[2px] bg-panel-2">
        <div className={`h-full rounded-r-[4px] ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-ink-3">{display}</span>
    </div>
  );
}

/** Job status breakdown as a segmented bar — one whole split into real parts, each its own 4px-corner
 * block with a 2px surface gap, width proportional to count. A status with zero jobs draws nothing. */
function JobStatusFigure({ counts: raw }: { counts: Record<string, number> }) {
  // EngineStatus.counts is generated as a plain string-indexed map, not a precise per-status Record — every
  // key this app actually sends/reads is one of JOB_STATUS_ORDER, so default any gap to 0 rather than widen
  // the type everywhere else that already relies on the precise JobStatus union.
  const counts = JOB_STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: raw[s] ?? 0 }), {} as Record<JobStatus, number>);
  const total = JOB_STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  const present = JOB_STATUS_ORDER.filter((s) => counts[s] > 0);
  if (total === 0) return <p className="text-[12px] text-ink-3">No jobs recorded yet.</p>;
  return (
    <div>
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-[4px]">
        {present.map((s) => {
          const share = (counts[s] / total) * 100;
          const cfg = JOB_STATUS[s];
          return (
            <div
              key={s}
              className={`flex h-full items-center justify-center rounded-[4px] ${cfg.barClass}`}
              style={{ width: `${share}%` }}
              title={`${cfg.label}: ${counts[s]} (${share.toFixed(1)}%)`}
            >
              {share >= 12 ? <span className="px-1 text-[10.5px] font-semibold text-canvas">{share.toFixed(0)}%</span> : null}
            </div>
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {present.map((s) => (
          <li key={s} className="flex items-center gap-1.5 text-[11.5px]">
            <StatusBadge tone={JOB_STATUS[s].tone} label={`${JOB_STATUS[s].label} · ${counts[s]}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsConsole() {
  const engine = useSWR<EngineStatus>('/engine', { refreshInterval: 15_000 });
  const jobTrend = useSWR<JobTrend>('/engine/job-trend?days=14', { refreshInterval: 60_000 });
  const agents = useSWR<AgentList>('/agents', { refreshInterval: 15_000 });
  const models = useSWR<AiModelList>('/ai/models', { refreshInterval: 15_000 });
  const auditVerify = useSWR<AuditVerification>('/audit/verify', { refreshInterval: 60_000 });

  const agentItems = agents.data?.items ?? [];
  const totalRuns = agentItems.reduce((sum, a) => sum + a.stats.runs, 0);
  const totalSucceeded = agentItems.reduce((sum, a) => sum + a.stats.succeeded, 0);
  const overallSuccessRate = totalRuns > 0 ? (totalSucceeded / totalRuns) * 100 : null;
  const maxRuns = Math.max(1, ...agentItems.map((a) => a.stats.runs));

  const modelItems = models.data?.items ?? [];
  const modelsWithLatency = modelItems.filter((m) => m.lastLatencyMs !== null);
  const maxLatency = Math.max(1, ...modelsWithLatency.map((m) => m.lastLatencyMs!));

  return (
    <div>
      <PageHeader
        title="Intelligence Analytics"
        summary="Real, current snapshots aggregated from the execution engine, the agent roster, the model registry and the audit chain, plus a real day-by-day job-count trend — no synthetic scores."
      />
      <div className="space-y-3 p-4">
        {engine.error ? <ErrorNotice error={engine.error} /> : null}
        {agents.error ? <ErrorNotice error={agents.error} /> : null}
        {models.error ? <ErrorNotice error={models.error} /> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total agent runs" value={agents.data ? String(totalRuns) : '—'} sub={agents.data ? `${agentItems.length} agents` : undefined} />
          <StatTile
            label="Overall success rate"
            value={overallSuccessRate === null ? '—' : `${overallSuccessRate.toFixed(0)}%`}
            sub={agents.data ? `${totalSucceeded} / ${totalRuns} runs` : undefined}
          />
          <StatTile
            label="Jobs in the queue now"
            value={engine.data ? String(engine.data.counts.AWAITING_APPROVAL + engine.data.counts.QUEUED + engine.data.counts.RUNNING) : '—'}
            sub={engine.data?.paused ? 'EMERGENCY STOP active' : 'awaiting / queued / running'}
          />
          <StatTile
            label="Audit chain"
            value={auditVerify.data ? (auditVerify.data.valid ? 'Intact' : 'Broken') : '—'}
            sub={auditVerify.data ? `${auditVerify.data.checkedEvents} events verified` : auditVerify.error ? 'Unreachable' : 'Verifying…'}
          />
        </div>

        <Panel title="Job status breakdown" subtitle="Every job in the system right now, by status">
          {!engine.data && !engine.error ? <Skeleton className="h-10 w-full" /> : null}
          {engine.data ? <JobStatusFigure counts={engine.data.counts} /> : null}
        </Panel>

        <Panel title="Job count trend" subtitle="Real day-by-day job counts, last 14 days">
          {jobTrend.error ? <ErrorNotice error={jobTrend.error} /> : null}
          {!jobTrend.data && !jobTrend.error ? <Skeleton className="h-40 w-full" /> : null}
          {jobTrend.data ? <JobTrendChart days={jobTrend.data.days} /> : null}
        </Panel>

        <Panel
          title="Agent run volume"
          subtitle="Total runs per agent — bar length only, since identity comes from the label, not a color"
          actions={
            <Link href="/agents" className="text-[11px] text-accent hover:underline">
              Agent detail
            </Link>
          }
        >
          {!agents.data && !agents.error ? <Skeleton className="h-24 w-full" /> : null}
          {agents.data && agentItems.length === 0 ? <p className="text-[12px] text-ink-3">No agents registered.</p> : null}
          {agents.data && agentItems.length > 0 ? (
            <div className="space-y-1.5">
              {[...agentItems]
                .sort((a, b) => b.stats.runs - a.stats.runs)
                .map((a) => (
                  <MetricBar key={a.id} label={a.name} value={a.stats.runs} max={maxRuns} display={`${a.stats.runs} (${a.stats.succeeded} ok)`} />
                ))}
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Model latency"
          subtitle="Most recent real latency per model, lowest first"
          actions={
            <Link href="/models" className="text-[11px] text-accent hover:underline">
              Model registry
            </Link>
          }
        >
          {!models.data && !models.error ? <Skeleton className="h-24 w-full" /> : null}
          {models.data && modelsWithLatency.length === 0 ? <p className="text-[12px] text-ink-3">No model has completed a real call yet.</p> : null}
          {modelsWithLatency.length > 0 ? (
            <div className="space-y-1.5">
              {[...modelsWithLatency]
                .sort((a, b) => a.lastLatencyMs! - b.lastLatencyMs!)
                .map((m) => (
                  <MetricBar key={m.id} label={m.id} value={m.lastLatencyMs!} max={maxLatency} display={`${m.lastLatencyMs} ms`} barClass="bg-cyan" />
                ))}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
