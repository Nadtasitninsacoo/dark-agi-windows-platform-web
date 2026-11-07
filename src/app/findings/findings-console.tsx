'use client';

import { CheckCircle2, EyeOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, apiUrl, type Finding, type FindingPage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * Security Findings: normalised vulnerability-assessment results ingested
 * from succeeded jobs (Trivy, Grype, OSV-Scanner, Nuclei — see the backend's
 * FindingsService). A repeat sighting updates lastSeenAt/occurrences rather
 * than duplicating; triage status (open/resolved/ignored) is set here and
 * never reset by a rescan.
 */

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
const STATUSES = ['OPEN', 'RESOLVED', 'IGNORED'] as const;
const SEVERITY_TONE: Record<string, StatusTone> = { CRITICAL: 'critical', HIGH: 'critical', MEDIUM: 'warning', LOW: 'neutral', UNKNOWN: 'neutral' };
const STATUS_TONE: Record<string, StatusTone> = { OPEN: 'warning', RESOLVED: 'good', IGNORED: 'neutral' };

const patch = (body: unknown): RequestInit => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function FindingRow({ finding, canManage, onChanged }: { finding: Finding; canManage: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: 'OPEN' | 'RESOLVED' | 'IGNORED') => {
    setBusy(true);
    try {
      await apiRequest(`/findings/${finding.id}`, patch({ status }));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-t border-edge/50 align-top">
      <td className="py-2 pr-3">
        <StatusBadge tone={SEVERITY_TONE[finding.severity] ?? 'neutral'} label={finding.severity.toLowerCase()} />
      </td>
      <td className="py-2 pr-3">
        <p className="font-medium text-ink">{finding.title ?? finding.findingKey}</p>
        <p className="font-mono text-[11px] text-ink-3">{finding.findingKey}</p>
        {finding.package ? (
          <p className="text-[11px] text-ink-3">
            {finding.package} {finding.installedVersion ?? ''}
            {finding.fixedVersion ? <> → fix: {finding.fixedVersion}</> : null}
          </p>
        ) : null}
      </td>
      <td className="py-2 pr-3">
        <p className="font-mono text-ink-2">{finding.target}</p>
        <p className="text-[11px] text-ink-3">{finding.toolId}</p>
      </td>
      <td className="py-2 pr-3 text-ink-3">
        <p>{formatDateTime(finding.lastSeenAt)}</p>
        <p className="text-[11px]">{finding.occurrences}× seen · first {formatDateTime(finding.firstSeenAt)}</p>
      </td>
      <td className="py-2 pr-3">
        <StatusBadge tone={STATUS_TONE[finding.status] ?? 'neutral'} label={finding.status.toLowerCase()} />
        {finding.statusNote ? <p className="mt-1 max-w-48 truncate text-[11px] text-ink-3" title={finding.statusNote}>{finding.statusNote}</p> : null}
      </td>
      <td className="py-2 text-right">
        {canManage ? (
          <div className="flex items-center justify-end gap-1">
            {finding.status !== 'RESOLVED' ? (
              <button type="button" disabled={busy} onClick={() => void setStatus('RESOLVED')} className="rounded border border-edge-strong p-1 text-good hover:bg-canvas disabled:opacity-40" title="Mark resolved">
                <CheckCircle2 className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {finding.status !== 'IGNORED' ? (
              <button type="button" disabled={busy} onClick={() => void setStatus('IGNORED')} className="rounded border border-edge-strong p-1 text-ink-2 hover:bg-canvas disabled:opacity-40" title="Ignore">
                <EyeOff className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {finding.status !== 'OPEN' ? (
              <button type="button" disabled={busy} onClick={() => void setStatus('OPEN')} className="rounded border border-edge-strong p-1 text-warning hover:bg-canvas disabled:opacity-40" title="Reopen">
                <RotateCcw className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function FindingsConsole() {
  const { can } = useAuth();
  const canManage = can('findings:manage');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('OPEN');
  const key = apiUrl('/findings', { severity: severity || undefined, status: status || undefined, limit: 100 });
  const findings = useSWR<FindingPage>(key, { refreshInterval: 20_000 });

  return (
    <div>
      <title>Security Findings · DARK AGI</title>
      <PageHeader
        title="Security Findings"
        summary="Normalised vulnerability-assessment results ingested from succeeded scans — Trivy, Grype, OSV-Scanner (local dependency scans) and Nuclei (network-target, scope-enforced)."
      />
      <div className="space-y-3 p-4">
        {findings.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">Open</p>
              <p className="mt-1 font-mono text-[20px] text-ink">{findings.data.summary.open}</p>
            </div>
            {SEVERITIES.map((s) => (
              <div key={s} className="rounded-md border border-edge bg-panel p-3">
                <p className="text-[11px] uppercase tracking-wider text-ink-3">{s.toLowerCase()}</p>
                <p className="mt-1 font-mono text-[20px] text-ink">{findings.data!.summary.bySeverity[s] ?? 0}</p>
              </div>
            ))}
          </div>
        ) : null}

        <Panel
          title="Findings"
          subtitle={findings.data ? `${findings.data.items.length} shown of ${findings.data.summary.total} total` : undefined}
          actions={
            <div className="flex items-center gap-2 text-[11.5px]">
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-0.5 text-ink">
                <option value="">All severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-edge-strong bg-canvas px-1.5 py-0.5 text-ink">
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {findings.error ? <ErrorNotice error={findings.error} /> : null}
          {!findings.data && !findings.error ? <Skeleton className="h-48 w-full" /> : null}
          {findings.data && findings.data.items.length === 0 ? (
            <p className="text-[12px] text-ink-3">
              No findings match this filter. Run a Trivy, Grype, OSV-Scanner or Nuclei operation from{' '}
              <Link href="/vulnerabilities" className="text-accent hover:underline">
                Vulnerability Assessment
              </Link>{' '}
              to populate this view.
            </p>
          ) : null}
          {findings.data && findings.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="pb-1 pr-3 font-medium">Severity</th>
                    <th className="pb-1 pr-3 font-medium">Finding</th>
                    <th className="pb-1 pr-3 font-medium">Target / Tool</th>
                    <th className="pb-1 pr-3 font-medium">Seen</th>
                    <th className="pb-1 pr-3 font-medium">Status</th>
                    <th className="pb-1 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {findings.data.items.map((f) => (
                    <FindingRow key={f.id} finding={f} canManage={canManage} onChanged={() => void findings.mutate()} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
