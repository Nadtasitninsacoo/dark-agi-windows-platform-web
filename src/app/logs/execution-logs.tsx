'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { AuditList } from '@/components/audit-list';
import { PageHeader } from '@/components/page-header';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type AuditPage, type AuditVerification } from '@/lib/api/client';
import { formatDateTime, shortHash } from '@/lib/format';

const PAGE_SIZE = 50;

export function ExecutionLogs() {
  // Stack of cursors: [undefined] = newest page; push nextCursor to go older.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [actionFilter, setActionFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [verification, setVerification] = useState<AuditVerification | null>(null);
  const [verifyError, setVerifyError] = useState<unknown>(null);
  const [verifying, setVerifying] = useState(false);

  const before = cursors.at(-1);
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (before) params.set('before', before);
  if (appliedFilter) params.set('action', appliedFilter);
  const { data, error, isLoading, mutate } = useSWR<AuditPage>(`/audit/events?${params.toString()}`);

  const verify = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      setVerification(await apiRequest<AuditVerification>('/audit/verify'));
    } catch (e) {
      setVerifyError(e);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Execution Logs"
        summary="Append-only audit trail. Every event is SHA-256 hash-chained to its predecessor and UPDATE/DELETE are rejected by the database."
        actions={
          <Button variant="primary" onClick={verify} busy={verifying}>
            <ShieldCheck className="size-3.5" aria-hidden /> Verify integrity
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {verifyError ? <ErrorNotice error={verifyError} /> : null}
        {verification ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-edge bg-panel px-3 py-2 text-[12px]">
            <StatusBadge tone={verification.valid ? 'good' : 'critical'} label={verification.valid ? 'Chain intact' : 'Chain broken'} />
            <span className="text-ink-2">{verification.checkedEvents} events verified</span>
            <span className="font-mono text-ink-3">head {shortHash(verification.headHash, 16)}</span>
            {!verification.valid ? (
              <span className="text-critical">
                First invalid event #{verification.firstInvalidSeq}: {verification.reason}
              </span>
            ) : null}
            <span className="ml-auto text-ink-3">{formatDateTime(verification.verifiedAt)}</span>
          </div>
        ) : null}

        <Panel
          title="Audit events"
          subtitle={`Newest first · page ${cursors.length}`}
          actions={
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedFilter(actionFilter.trim());
                setCursors([undefined]);
              }}
            >
              <label className="sr-only" htmlFor="action-filter">
                Filter by action
              </label>
              <input
                id="action-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Exact action, e.g. system.inventory.refresh"
                className="w-72 rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[11.5px] text-ink placeholder:text-ink-3"
              />
              <Button type="submit">Filter</Button>
              <Button onClick={() => void mutate()}>Refresh</Button>
            </form>
          }
        >
          {error ? <ErrorNotice error={error} /> : null}
          {isLoading && !data ? <Skeleton className="h-40 w-full" /> : null}
          {data ? <AuditList events={data.items} showHashes /> : null}
          <div className="mt-3 flex items-center justify-between">
            <Button onClick={() => setCursors((c) => (c.length > 1 ? c.slice(0, -1) : c))} disabled={cursors.length <= 1}>
              Newer
            </Button>
            <Button onClick={() => data?.nextCursor && setCursors((c) => [...c, data.nextCursor ?? undefined])} disabled={!data?.nextCursor}>
              Older
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
