'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, apiUrl, type Report, type ReportDetail, type ReportPage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * Reports: generates a point-in-time snapshot of the current findings and
 * evidence, filtered as chosen, and persists it so later triage/relabelling
 * never silently rewrites a report someone already read or exported. Export
 * is a standalone HTML document; "PDF" is the browser's own Print → Save as
 * PDF on that page, not a server-side renderer — a deliberate, documented
 * scope limit rather than an added dependency taken on casually.
 */

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
const FINDING_STATUSES = ['OPEN', 'RESOLVED', 'IGNORED'] as const;
const EVIDENCE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
const SEVERITY_TONE: Record<string, StatusTone> = { CRITICAL: 'critical', HIGH: 'critical', MEDIUM: 'warning', LOW: 'neutral', UNKNOWN: 'neutral' };

const selectClass = 'rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';

function GenerateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('');
  const [findingStatus, setFindingStatus] = useState('');
  const [evidenceStatus, setEvidenceStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (title.trim() === '') {
      setError('A title is required');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, string> = { title: title.trim() };
      if (severity) body.severity = severity;
      if (findingStatus) body.findingStatus = findingStatus;
      if (evidenceStatus) body.evidenceStatus = evidenceStatus;
      const report = await apiRequest<ReportDetail>('/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setTitle('');
      onCreated(report.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Report title" className="min-w-0 flex-1 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectClass}>
          <option value="">Any severity</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
        <select value={findingStatus} onChange={(e) => setFindingStatus(e.target.value)} className={selectClass}>
          <option value="">Any finding status</option>
          {FINDING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
        <select value={evidenceStatus} onChange={(e) => setEvidenceStatus(e.target.value)} className={selectClass}>
          <option value="">Any evidence status</option>
          {EVIDENCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
        <Button variant="primary" busy={busy} onClick={() => void generate()}>
          Generate
        </Button>
      </div>
      {error ? <p className="text-[11.5px] text-critical">{error}</p> : null}
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  return (
    <tr className="border-t border-edge/50">
      <td className="py-1.5 pr-3">
        <p className="font-medium text-ink">{report.title}</p>
        <p className="text-[11px] text-ink-3">
          by {report.createdByType.toLowerCase()}:{report.createdBy}
        </p>
      </td>
      <td className="py-1.5 pr-3 text-ink-3">{formatDateTime(report.createdAt)}</td>
      <td className="py-1.5 pr-3">
        <div className="flex flex-wrap gap-1">
          {SEVERITIES.filter((s) => (report.summary.findingsBySeverity[s] ?? 0) > 0).map((s) => (
            <StatusBadge key={s} tone={SEVERITY_TONE[s] ?? 'neutral'} label={`${s.toLowerCase()} ${report.summary.findingsBySeverity[s]}`} />
          ))}
          {report.summary.totalFindings === 0 ? <span className="text-[11px] text-ink-3">No findings</span> : null}
        </div>
      </td>
      <td className="py-1.5 pr-3 text-ink-2">{report.summary.totalEvidence}</td>
      <td className="py-1.5">
        <a href={apiUrl(`/reports/${report.id}/export`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-cyan hover:underline">
          <Download className="size-3.5" aria-hidden />
          Export HTML
        </a>
      </td>
    </tr>
  );
}

export function ReportsConsole() {
  const { can } = useAuth();
  const canManage = can('reports:manage');
  const reports = useSWR<ReportPage>('/reports');

  return (
    <div>
      <title>Reports · DARK AGI</title>
      <PageHeader title="Reports" summary="Point-in-time snapshots of findings and evidence — generating one freezes the matching rows as they are right now, so later triage never silently rewrites a report someone already read or shared." />
      <div className="space-y-3 p-4">
        {canManage ? (
          <Panel title="Generate a report">
            <GenerateForm onCreated={() => void reports.mutate()} />
          </Panel>
        ) : null}
        <Panel title="Reports" subtitle={reports.data ? `${reports.data.items.length} report${reports.data.items.length === 1 ? '' : 's'}` : undefined}>
          {reports.error ? <ErrorNotice error={reports.error} /> : null}
          {!reports.data && !reports.error ? <Skeleton className="h-32 w-full" /> : null}
          {reports.data && reports.data.items.length === 0 ? (
            <p className="text-[12px] text-ink-3">
              No reports generated yet.{canManage ? ' Use the form above to generate the first one.' : ''}
            </p>
          ) : null}
          {reports.data && reports.data.items.length > 0 ? (
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="pb-1 pr-3 font-medium">Report</th>
                  <th className="pb-1 pr-3 font-medium">Generated</th>
                  <th className="pb-1 pr-3 font-medium">Findings</th>
                  <th className="pb-1 pr-3 font-medium">Evidence</th>
                  <th className="pb-1 font-medium">Export</th>
                </tr>
              </thead>
              <tbody>
                {reports.data.items.map((r) => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
