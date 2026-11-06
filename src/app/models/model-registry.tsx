'use client';

import { Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type AiDiscoveryResult, type AiModel, type AiModelList, type AiProviderList, type AiProviderStatus } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { ChatConsole } from './chat-console';

const PROVIDER_STATUS: Record<AiProviderStatus['status'], { tone: StatusTone; label: string }> = {
  available: { tone: 'good', label: 'Available' },
  error: { tone: 'critical', label: 'Error' },
  unknown: { tone: 'neutral', label: 'Not checked' },
  not_configured: { tone: 'neutral', label: 'Not configured' },
};

const TOOL_CALLING: Record<AiModel['toolCalling'], { tone: StatusTone; label: string }> = {
  SUPPORTED: { tone: 'good', label: 'Tools' },
  UNSUPPORTED: { tone: 'neutral', label: 'No tools' },
  UNKNOWN: { tone: 'neutral', label: 'Unknown' },
};

const formatTokens = (n: number | null): string => (n === null ? '—' : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

function ProvidersTable({ providers, onDiscover, busyId }: { providers: AiProviderStatus[]; onDiscover: (id: string) => void; busyId: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr className="border-b border-edge">
            <th className="py-1.5 pr-3 font-medium">Provider</th>
            <th className="py-1.5 pr-3 font-medium">Status</th>
            <th className="py-1.5 pr-3 font-medium">Models</th>
            <th className="py-1.5 pr-3 font-medium">Latency</th>
            <th className="py-1.5 pr-3 font-medium">Sessions</th>
            <th className="py-1.5 pr-3 font-medium">Detail</th>
            <th className="py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => {
            const s = PROVIDER_STATUS[p.status];
            return (
              <tr key={p.id} className="border-b border-edge/60 align-top last:border-0">
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-1.5 text-ink">
                    {p.local ? <HardDrive className="size-3.5 text-ink-3" aria-label="local" /> : <Cloud className="size-3.5 text-ink-3" aria-label="cloud" />}
                    {p.displayName}
                  </div>
                  <div className="font-mono text-[10.5px] text-ink-3">{p.id}</div>
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <StatusBadge tone={s.tone} label={s.label} />
                </td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">{p.modelCount}</td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">{p.latencyMs === null ? '—' : `${p.latencyMs} ms`}</td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">
                  {p.activeSessions}/{p.maxConcurrency}
                  {p.queuedSessions > 0 ? <span className="text-warning"> +{p.queuedSessions} queued</span> : null}
                </td>
                <td className="max-w-[26rem] py-1.5 pr-3 text-[11.5px] text-ink-3">
                  {p.status === 'not_configured' ? (
                    p.keyEnv ? (
                      <span>
                        Set <code className="font-mono text-ink-2">{p.keyEnv}</code> in <code className="font-mono">dark-agi-backend/.env</code> and restart the backend
                      </span>
                    ) : (
                      <span>Disabled in configuration</span>
                    )
                  ) : p.error ? (
                    <span className="text-critical">{p.error}</span>
                  ) : (
                    <span>
                      <span className="font-mono">{p.endpoint}</span>
                      {p.lastCheckedAt ? <> · checked {formatDateTime(p.lastCheckedAt)}</> : null}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {p.configured ? (
                    <Button onClick={() => onDiscover(p.id)} busy={busyId === p.id} disabled={busyId !== null && busyId !== p.id}>
                      Discover
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelsTable({ models }: { models: AiModel[] }) {
  if (models.length === 0) {
    return <p className="py-2 text-[12px] text-ink-3">No models registered yet. Configure a provider key, then run discovery.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr className="border-b border-edge">
            <th className="py-1.5 pr-3 font-medium">Model ID</th>
            <th className="py-1.5 pr-3 font-medium">Status</th>
            <th className="py-1.5 pr-3 font-medium">Context</th>
            <th className="py-1.5 pr-3 font-medium">Max out</th>
            <th className="py-1.5 pr-3 font-medium">Tool calling</th>
            <th className="py-1.5 pr-3 font-medium">Last latency</th>
            <th className="py-1.5 pr-3 font-medium">OK / Fail</th>
            <th className="py-1.5 font-medium">Last error</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => {
            const tc = TOOL_CALLING[m.toolCalling];
            return (
              <tr key={m.id} className="border-b border-edge/60 align-top last:border-0">
                <td className="py-1.5 pr-3">
                  <div className="font-mono text-ink">{m.id}</div>
                  {m.displayName !== m.name ? <div className="text-[11px] text-ink-3">{m.displayName}</div> : null}
                </td>
                <td className="py-1.5 pr-3">
                  <StatusBadge tone={m.status === 'AVAILABLE' ? 'good' : 'neutral'} label={m.status === 'AVAILABLE' ? 'Available' : 'Unavailable'} />
                </td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">{formatTokens(m.contextWindow)}</td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">{formatTokens(m.maxOutputTokens)}</td>
                <td className="py-1.5 pr-3">
                  <StatusBadge tone={tc.tone} label={tc.label} />
                </td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">
                  {m.lastLatencyMs === null ? '—' : `${m.lastLatencyMs} ms`}
                  {m.lastFirstTokenMs !== null ? <span className="text-ink-3"> (TTFT {m.lastFirstTokenMs})</span> : null}
                </td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">
                  {m.successCount} / {m.failureCount}
                </td>
                <td className="max-w-[20rem] truncate py-1.5 text-[11px] text-critical" title={m.lastError ?? undefined}>
                  {m.lastError ?? ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ModelRegistry() {
  const providers = useSWR<AiProviderList>('/ai/providers', { refreshInterval: 10_000 });
  const [statusFilter, setStatusFilter] = useState<'AVAILABLE' | ''>('AVAILABLE');
  const models = useSWR<AiModelList>(`/ai/models${statusFilter ? `?status=${statusFilter}` : ''}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discoverError, setDiscoverError] = useState<unknown>(null);
  const [lastResult, setLastResult] = useState<AiDiscoveryResult | null>(null);

  const discover = async (providerId?: string) => {
    setBusyId(providerId ?? '*');
    setDiscoverError(null);
    try {
      setLastResult(
        await apiRequest<AiDiscoveryResult>('/ai/providers/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(providerId ? { providerId } : {}),
        }),
      );
      await Promise.all([providers.mutate(), models.mutate()]);
    } catch (e) {
      setDiscoverError(e);
    } finally {
      setBusyId(null);
    }
  };

  const available = (models.data?.items ?? []).filter((m) => m.status === 'AVAILABLE');

  return (
    <div>
      <PageHeader
        title="Model Registry"
        summary="Cloud and local AI providers behind one gateway. API keys stay in the backend .env — they are never sent to this browser."
        actions={
          <Button variant="primary" onClick={() => discover()} busy={busyId === '*'} disabled={busyId !== null && busyId !== '*'}>
            <RefreshCw className="size-3.5" aria-hidden /> Discover all
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {discoverError ? <ErrorNotice error={discoverError} /> : null}
        {lastResult ? (
          <div className="flex flex-wrap gap-2 rounded-md border border-edge bg-panel px-3 py-2 text-[11.5px]">
            <span className="text-ink-3">Last discovery:</span>
            {lastResult.results.map((r) => (
              <StatusBadge
                key={r.providerId}
                tone={r.outcome === 'ok' ? 'good' : r.outcome === 'error' ? 'critical' : 'neutral'}
                label={`${r.providerId}: ${r.outcome === 'ok' ? `${r.models} models` : r.outcome}`}
              />
            ))}
          </div>
        ) : null}

        <Panel
          title="Providers"
          subtitle={
            providers.data
              ? `Default model: ${providers.data.defaultModel ?? 'not set (AI_DEFAULT_MODEL)'} · fallbacks: ${providers.data.fallbackModels.join(', ') || 'none'}`
              : undefined
          }
        >
          {providers.error ? <ErrorNotice error={providers.error} /> : null}
          {providers.data ? <ProvidersTable providers={providers.data.providers} onDiscover={(id) => void discover(id)} busyId={busyId} /> : providers.error ? null : <Skeleton className="h-32 w-full" />}
        </Panel>

        <Panel
          title="Models"
          subtitle={models.data ? `${models.data.items.length} shown` : undefined}
          actions={
            <label className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
              <input type="checkbox" checked={statusFilter === ''} onChange={(e) => setStatusFilter(e.target.checked ? '' : 'AVAILABLE')} />
              Include unavailable
            </label>
          }
        >
          {models.error ? <ErrorNotice error={models.error} /> : null}
          {models.data ? <ModelsTable models={models.data.items} /> : models.error ? null : <Skeleton className="h-32 w-full" />}
        </Panel>

        <ChatConsole models={available} defaultModel={providers.data?.defaultModel ?? null} onFinished={() => void models.mutate()} />
      </div>
    </div>
  );
}
