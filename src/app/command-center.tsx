'use client';

import { Activity, Bot, HardDrive, ListChecks, MemoryStick, Server, Sparkles, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import useSWR from 'swr';
import { AuditList } from '@/components/audit-list';
import { InventoryTable } from '@/components/inventory-table';
import { PageHeader } from '@/components/page-header';
import { Sparkline } from '@/components/sparkline';
import { ErrorNotice, KeyValue, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import type { AgentList, AgentRunPage, AiProviderList, AuditPage, EngineStatus, EnvironmentInventory, HealthReport, ToolList } from '@/lib/api/client';
import { formatBytes, formatDateTime, formatDuration, formatPercent, utilisationLevel } from '@/lib/format';
import { MODULES } from '@/lib/modules';
import { useTelemetry } from '@/lib/use-telemetry';

const LEVEL_LABEL: Record<ReturnType<typeof utilisationLevel>, { tone: StatusTone; label: string }> = {
  good: { tone: 'good', label: 'Normal' },
  warning: { tone: 'warning', label: 'High' },
  critical: { tone: 'critical', label: 'Critical' },
  unknown: { tone: 'neutral', label: 'Measuring' },
};

function MetricTile({ icon, label, value, sub, percent }: { icon: ReactNode; label: string; value: string; sub: string; percent: number | null }) {
  const level = LEVEL_LABEL[utilisationLevel(percent)];
  return (
    <div className="rounded-md border border-edge bg-panel p-3">
      <div className="flex items-center justify-between text-ink-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
          {icon}
          {label}
        </span>
        <StatusBadge tone={level.tone} label={level.label} />
      </div>
      <p className="mt-2 font-mono text-[22px] leading-none text-ink">{value}</p>
      <p className="mt-1 truncate text-[11px] text-ink-3">{sub}</p>
    </div>
  );
}

/** A compact status tile for a system that is simply up/degraded/attention-needed — no gauge, just a count and a tone. */
function StatusTile({ icon, label, tone, value, sub, href }: { icon: ReactNode; label: string; tone: StatusTone; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="block rounded-md border border-edge bg-panel p-3 transition-colors hover:border-accent/50">
      <div className="flex items-center justify-between text-ink-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
          {icon}
          {label}
        </span>
      </div>
      <p className="mt-2 font-mono text-[22px] leading-none text-ink">{value}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
        <StatusBadge tone={tone} label={sub} />
      </p>
    </Link>
  );
}

const RUN_TONE: Record<string, StatusTone> = { RUNNING: 'pending', SUCCEEDED: 'good', FAILED: 'critical', CANCELLED: 'neutral' };

export function CommandCenter() {
  const telemetry = useTelemetry();
  const health = useSWR<HealthReport>('/health', { refreshInterval: 10_000 });
  const inventory = useSWR<EnvironmentInventory>('/system/inventory');
  const audit = useSWR<AuditPage>('/audit/events?limit=8', { refreshInterval: 15_000 });
  const engine = useSWR<EngineStatus>('/engine', { refreshInterval: 10_000 });
  const agents = useSWR<AgentList>('/agents');
  const providers = useSWR<AiProviderList>('/ai/providers');
  const tools = useSWR<ToolList>('/tools');
  const agentRuns = useSWR<AgentRunPage>('/agents/runs?limit=5', { refreshInterval: 20_000 });

  const m = telemetry.latest;
  const cpuPoints = telemetry.samples.flatMap((s) => (s.cpu.usagePercent === null ? [] : [{ t: s.sampledAt, v: s.cpu.usagePercent }]));
  const memPoints = telemetry.samples.map((s) => ({ t: s.sampledAt, v: s.memory.usagePercent }));
  const liveCount = MODULES.filter((x) => x.status === 'live').length;

  const telemetryBadge =
    telemetry.connection === 'live' ? (
      <StatusBadge tone="good" label={`Live · ${telemetry.intervalMs ? telemetry.intervalMs / 1000 : '?'}s`} />
    ) : telemetry.connection === 'connecting' ? (
      <StatusBadge tone="pending" label="Connecting" />
    ) : (
      <StatusBadge tone="critical" label="Stream offline" />
    );

  return (
    <div>
      <PageHeader
        title="Command Center"
        summary="Real-time platform health: host telemetry, agents, AI providers, the tool registry, the execution queue and the latest activity."
        actions={telemetryBadge}
      />
      <div className="grid gap-3 p-4 lg:grid-cols-4">
        <MetricTile
          icon={<Activity className="size-3.5" aria-hidden />}
          label="CPU"
          value={formatPercent(m?.cpu.usagePercent)}
          sub={m ? `${m.cpu.logicalCores} logical cores · ${m.cpu.model}` : 'Waiting for telemetry…'}
          percent={m?.cpu.usagePercent ?? null}
        />
        <MetricTile
          icon={<MemoryStick className="size-3.5" aria-hidden />}
          label="Memory"
          value={formatPercent(m?.memory.usagePercent)}
          sub={m ? `${formatBytes(m.memory.usedBytes)} of ${formatBytes(m.memory.totalBytes)}` : '—'}
          percent={m?.memory.usagePercent ?? null}
        />
        <MetricTile
          icon={<HardDrive className="size-3.5" aria-hidden />}
          label={`System drive ${m?.systemDrive?.path ?? ''}`}
          value={formatPercent(m?.systemDrive?.usagePercent)}
          sub={m?.systemDrive ? `${formatBytes(m.systemDrive.freeBytes)} free of ${formatBytes(m.systemDrive.totalBytes)}` : '—'}
          percent={m?.systemDrive?.usagePercent ?? null}
        />
        <div className="rounded-md border border-edge bg-panel p-3">
          <div className="flex items-center justify-between text-ink-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <Server className="size-3.5" aria-hidden />
              Backend
            </span>
            {health.error ? (
              <StatusBadge tone="critical" label="Unreachable" />
            ) : health.data ? (
              <StatusBadge tone={health.data.status === 'ok' ? 'good' : 'warning'} label={health.data.status === 'ok' ? 'Healthy' : 'Degraded'} />
            ) : (
              <StatusBadge tone="pending" label="Checking" />
            )}
          </div>
          <p className="mt-2 font-mono text-[22px] leading-none text-ink">{health.data ? formatDuration(health.data.uptimeSeconds) : '—'}</p>
          <p className="mt-1 truncate text-[11px] text-ink-3">
            {health.data
              ? `uptime · DB ${health.data.checks.database.reachable ? `${health.data.checks.database.latencyMs} ms` : 'down'} · ${m?.process.activeChildProcesses ?? 0} child processes`
              : '—'}
          </p>
        </div>

        <StatusTile
          icon={<Bot className="size-3.5" aria-hidden />}
          label="AI Agents"
          href="/agents"
          tone={!agents.data ? 'pending' : agents.data.items.some((a) => a.enabled) ? 'good' : 'warning'}
          value={agents.data ? `${agents.data.items.filter((a) => a.enabled).length} / ${agents.data.items.length}` : '—'}
          sub={agents.error ? 'Unreachable' : agents.data ? 'enabled' : 'Checking'}
        />
        <StatusTile
          icon={<Sparkles className="size-3.5" aria-hidden />}
          label="AI Providers"
          href="/models"
          tone={!providers.data ? 'pending' : providers.data.providers.some((p) => p.status === 'available') ? 'good' : 'warning'}
          value={providers.data ? `${providers.data.providers.filter((p) => p.status === 'available').length} / ${providers.data.providers.length}` : '—'}
          sub={providers.error ? 'Unreachable' : providers.data ? 'available' : 'Checking'}
        />
        <StatusTile
          icon={<Wrench className="size-3.5" aria-hidden />}
          label="Tool Registry"
          href="/tools"
          tone={!tools.data ? 'pending' : tools.data.summary.lastDiscoveryAt === null ? 'neutral' : tools.data.summary.installed > 0 ? 'good' : 'warning'}
          value={tools.data ? `${tools.data.summary.installed} / ${tools.data.summary.total}` : '—'}
          sub={tools.error ? 'Unreachable' : tools.data ? (tools.data.summary.lastDiscoveryAt === null ? 'never discovered' : 'installed') : 'Checking'}
        />
        <StatusTile
          icon={<ListChecks className="size-3.5" aria-hidden />}
          label="Execution Queue"
          href="/tasks"
          tone={!engine.data ? 'pending' : engine.data.paused ? 'critical' : engine.data.counts.RUNNING > 0 ? 'pending' : 'good'}
          value={engine.data ? String(engine.data.counts.AWAITING_APPROVAL + engine.data.counts.QUEUED + engine.data.counts.RUNNING) : '—'}
          sub={engine.error ? 'Unreachable' : engine.data ? (engine.data.paused ? 'EMERGENCY STOP' : 'active jobs') : 'Checking'}
        />

        <Panel title="CPU utilisation" subtitle="Last ~5 minutes, measured from OS tick deltas" className="lg:col-span-2">
          <Sparkline points={cpuPoints} label="CPU utilisation" />
        </Panel>
        <Panel title="Memory utilisation" subtitle="Physical memory in use" className="lg:col-span-2">
          <Sparkline points={memPoints} label="Memory utilisation" />
        </Panel>

        <Panel
          title="Environment readiness"
          subtitle={inventory.data ? `${inventory.data.os.version} · build ${inventory.data.os.build ?? '?'} · ${inventory.data.os.arch}` : 'Probing runtimes…'}
          actions={<Link href="/settings" className="text-[11px] text-accent hover:underline">Details</Link>}
          className="lg:col-span-2"
        >
          {inventory.error ? <ErrorNotice error={inventory.error} /> : null}
          {inventory.data ? (
            <InventoryTable components={inventory.data.components} compact />
          ) : inventory.error ? null : (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />)}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <Panel title="Recent audit activity" actions={<Link href="/logs" className="text-[11px] text-accent hover:underline">All events</Link>}>
            {audit.error ? <ErrorNotice error={audit.error} /> : audit.data ? <AuditList events={audit.data.items} /> : <Skeleton className="h-24 w-full" />}
          </Panel>
          <Panel title="Recent agent activity" actions={<Link href="/agents" className="text-[11px] text-accent hover:underline">All agents</Link>}>
            {agentRuns.error ? (
              <ErrorNotice error={agentRuns.error} />
            ) : agentRuns.data ? (
              agentRuns.data.items.length === 0 ? (
                <p className="text-[12px] text-ink-3">No agent runs yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {agentRuns.data.items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="min-w-0 truncate text-ink-2">
                        <span className="font-mono text-ink">{r.agentId}</span> · {r.task}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-ink-3">
                        {formatDateTime(r.createdAt)}
                        <StatusBadge tone={RUN_TONE[r.status] ?? 'neutral'} label={r.status.toLowerCase()} />
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </Panel>
          <Panel title="Platform delivery" subtitle="Modules backed by implemented APIs">
            <dl>
              <KeyValue label="Live modules">
                {liveCount} / {MODULES.length}
              </KeyValue>
              <KeyValue label="Host">{m ? `${m.host.hostname} · up ${formatDuration(m.host.uptimeSeconds)}` : '—'}</KeyValue>
              <KeyValue label="API process">{m ? `PID ${m.process.pid} · RSS ${formatBytes(m.process.rssBytes)}` : '—'}</KeyValue>
              <KeyValue label="Findings summary">Not implemented yet (Phase 5)</KeyValue>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
