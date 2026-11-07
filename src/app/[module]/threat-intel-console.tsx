'use client';

import { Construction } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type Ioc, type IocPage } from '@/lib/api/client';

/**
 * Threat Intelligence: the platform's own IOC (indicator of compromise)
 * registry — recorded by operators or agents, not a live VirusTotal/MISP
 * lookup (that needs an operator-supplied API key and a secret-injection path
 * the operation-adapter architecture does not have yet).
 */

const TYPES = ['HASH', 'IP', 'DOMAIN', 'URL'] as const;
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
const SEVERITY_TONE: Record<string, StatusTone> = { CRITICAL: 'critical', HIGH: 'critical', MEDIUM: 'warning', LOW: 'neutral', UNKNOWN: 'neutral' };
const STATUS_TONE: Record<string, StatusTone> = { ACTIVE: 'warning', EXPIRED: 'neutral', FALSE_POSITIVE: 'good' };

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function IocRow({ ioc, canManage, onChanged }: { ioc: Ioc; canManage: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const cycleStatus = async () => {
    const next = ioc.status === 'ACTIVE' ? 'FALSE_POSITIVE' : ioc.status === 'FALSE_POSITIVE' ? 'EXPIRED' : 'ACTIVE';
    setBusy(true);
    try {
      await apiRequest(`/iocs/${ioc.id}`, patch({ status: next }));
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr className="border-t border-edge/50">
      <td className="py-1.5 pr-3 font-mono text-ink-2">{ioc.type}</td>
      <td className="py-1.5 pr-3 font-mono text-ink">{ioc.value}</td>
      <td className="py-1.5 pr-3">
        <StatusBadge tone={SEVERITY_TONE[ioc.severity] ?? 'neutral'} label={ioc.severity.toLowerCase()} />
      </td>
      <td className="py-1.5 pr-3 text-ink-3">{ioc.source ?? '—'}</td>
      <td className="py-1.5 pr-3">
        {canManage ? (
          <button type="button" disabled={busy} onClick={() => void cycleStatus()} title="Click to change status" className="disabled:opacity-40">
            <StatusBadge tone={STATUS_TONE[ioc.status] ?? 'neutral'} label={ioc.status.toLowerCase().replace('_', ' ')} />
          </button>
        ) : (
          <StatusBadge tone={STATUS_TONE[ioc.status] ?? 'neutral'} label={ioc.status.toLowerCase().replace('_', ' ')} />
        )}
      </td>
    </tr>
  );
}

export function ThreatIntelConsole({ title, summary, phase, planned }: { title: string; summary: string; phase: number; planned: readonly string[] }) {
  const { can } = useAuth();
  const canManage = can('iocs:manage');
  const [type, setType] = useState('');
  const iocs = useSWR<IocPage>(`/iocs${type ? `?type=${type}` : ''}`, { refreshInterval: 20_000 });

  const [form, setForm] = useState({ type: 'DOMAIN' as (typeof TYPES)[number], value: '', source: '', severity: 'UNKNOWN' as (typeof SEVERITIES)[number] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await apiRequest('/iocs', post({ type: form.type, value: form.value.trim(), source: form.source.trim() || undefined, severity: form.severity }));
      setForm((f) => ({ ...f, value: '', source: '' }));
      await iocs.mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the IOC');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <title>{`${title} · DARK AGI`}</title>
      <PageHeader title={title} summary={summary} actions={<StatusBadge tone="good" label={`Live · Phase ${phase}`} />} />
      <div className="space-y-3 p-4">
        {canManage ? (
          <Panel title="Record an indicator of compromise">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <label className="text-[12px] text-ink-2">
                <span className="mb-1 block text-ink-3">Type</span>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof TYPES)[number] }))} className="rounded border border-edge-strong bg-canvas px-2 py-1 text-ink">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] text-ink-2">
                <span className="mb-1 block text-ink-3">Value</span>
                <input
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="e.g. evil.example.com"
                  className="w-56 rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-ink"
                />
              </label>
              <label className="text-[12px] text-ink-2">
                <span className="mb-1 block text-ink-3">Severity</span>
                <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as (typeof SEVERITIES)[number] }))} className="rounded border border-edge-strong bg-canvas px-2 py-1 text-ink">
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] text-ink-2">
                <span className="mb-1 block text-ink-3">Source</span>
                <input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="optional" className="w-36 rounded border border-edge-strong bg-canvas px-2 py-1 text-ink" />
              </label>
              <Button type="submit" variant="primary" busy={busy} disabled={form.value.trim() === ''}>
                Add IOC
              </Button>
            </form>
            {error ? <p className="mt-2 text-[11.5px] text-critical">{error}</p> : null}
          </Panel>
        ) : null}

        <Panel
          title="Indicators of compromise"
          subtitle={iocs.data ? `${iocs.data.items.length} shown` : undefined}
          actions={
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-0.5 text-[11.5px] text-ink">
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          }
        >
          {iocs.error ? <ErrorNotice error={iocs.error} /> : null}
          {!iocs.data && !iocs.error ? <Skeleton className="h-32 w-full" /> : null}
          {iocs.data && iocs.data.items.length === 0 ? <p className="text-[12px] text-ink-3">No indicators recorded yet.</p> : null}
          {iocs.data && iocs.data.items.length > 0 ? (
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="pb-1 pr-3 font-medium">Type</th>
                  <th className="pb-1 pr-3 font-medium">Value</th>
                  <th className="pb-1 pr-3 font-medium">Severity</th>
                  <th className="pb-1 pr-3 font-medium">Source</th>
                  <th className="pb-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {iocs.data.items.map((i) => (
                  <IocRow key={i.id} ioc={i} canManage={canManage} onChanged={() => void iocs.mutate()} />
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>

        {planned.length > 0 ? (
          <Panel title="Planned capabilities" subtitle="Scheduled for later phases — listed so the roadmap is explicit">
            <div className="flex items-start gap-3">
              <Construction className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
              <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-2">
                {planned.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
