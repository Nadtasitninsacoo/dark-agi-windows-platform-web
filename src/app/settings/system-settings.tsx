'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { InventoryTable } from '@/components/inventory-table';
import { PageHeader } from '@/components/page-header';
import { Button, ErrorNotice, KeyValue, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { API_BASE_URL, apiRequest, type EnvironmentInventory, type HealthReport } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

export function SystemSettings() {
  const inventory = useSWR<EnvironmentInventory>('/system/inventory');
  const health = useSWR<HealthReport>('/health');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<unknown>(null);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await apiRequest<EnvironmentInventory>('/system/inventory/refresh', { method: 'POST' });
      await inventory.mutate(fresh, { revalidate: false });
    } catch (e) {
      setRefreshError(e);
    } finally {
      setRefreshing(false);
    }
  };

  const inv = inventory.data;
  const db = health.data?.checks.database;

  return (
    <div>
      <PageHeader
        title="System Settings"
        summary="Detected Windows environment and the runtimes DARK AGI depends on. Probes run real executables (shell-free) and the configured endpoints only."
        actions={
          <Button variant="primary" onClick={refresh} busy={refreshing}>
            <RefreshCw className="size-3.5" aria-hidden /> Re-probe environment
          </Button>
        }
      />
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        {refreshError ? (
          <div className="lg:col-span-3">
            <ErrorNotice error={refreshError} />
          </div>
        ) : null}
        <Panel title="Operating system">
          {inv ? (
            <dl>
              <KeyValue label="Edition">{inv.os.version}</KeyValue>
              <KeyValue label="Release / build">{inv.os.release}</KeyValue>
              <KeyValue label="Architecture">{inv.os.arch}</KeyValue>
              <KeyValue label="Hostname">{inv.os.hostname}</KeyValue>
              <KeyValue label="Support">
                <StatusBadge tone={inv.os.supported ? 'good' : 'critical'} label={inv.os.supported ? 'Supported' : 'Unsupported'} />
              </KeyValue>
              {inv.os.supportNote ? <p className="pt-1 text-[11px] text-warning">{inv.os.supportNote}</p> : null}
            </dl>
          ) : (
            <Skeleton className="h-28 w-full" />
          )}
        </Panel>
        <Panel title="Database">
          {db ? (
            <dl>
              <KeyValue label="Status">
                <StatusBadge tone={db.reachable ? 'good' : 'critical'} label={db.reachable ? 'Reachable' : 'Unreachable'} />
              </KeyValue>
              <KeyValue label="PostgreSQL">{db.serverVersion ?? '—'}</KeyValue>
              <KeyValue label="Round-trip">{db.latencyMs === null ? '—' : `${db.latencyMs} ms`}</KeyValue>
              <KeyValue label="Migrations applied">{db.appliedMigrations ?? '—'}</KeyValue>
              {db.error ? <p className="pt-1 text-[11px] text-critical">{db.error}</p> : null}
            </dl>
          ) : health.error ? (
            <ErrorNotice error={health.error} />
          ) : (
            <Skeleton className="h-28 w-full" />
          )}
        </Panel>
        <Panel title="Backend connection">
          <dl>
            <KeyValue label="API base URL">{API_BASE_URL}</KeyValue>
            <KeyValue label="Backend version">{health.data?.version ?? '—'}</KeyValue>
            <KeyValue label="Started">{health.data ? formatDateTime(health.data.startedAt) : '—'}</KeyValue>
            <KeyValue label="OpenAPI">
              <a className="text-accent hover:underline" href={`${API_BASE_URL}/api/docs`} target="_blank" rel="noreferrer">
                /api/docs
              </a>
            </KeyValue>
          </dl>
        </Panel>
        <Panel
          title="Platform runtimes"
          subtitle={inv ? `Collected ${formatDateTime(inv.collectedAt)}` : 'Probing…'}
          className="lg:col-span-3"
        >
          {inventory.error ? <ErrorNotice error={inventory.error} /> : null}
          {inv ? <InventoryTable components={inv.components} /> : inventory.error ? null : <Skeleton className="h-48 w-full" />}
        </Panel>
      </div>
    </div>
  );
}
