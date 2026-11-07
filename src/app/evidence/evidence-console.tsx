'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type Evidence, type EvidenceDetail, type EvidencePage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * Evidence (chain of custody): one row per SHA-256 hash the file-hash
 * operation has computed, with an append-only custody timeline. Expand a row
 * to see the full history and (for evidence:manage holders) annotate it —
 * every change requires a note, which becomes the next custody entry.
 */

const STATUS_TONE: Record<string, StatusTone> = { ACTIVE: 'good', ARCHIVED: 'neutral' };
const ACTION_TONE: Record<string, StatusTone> = { ACQUIRED: 'good', HASHED: 'neutral', ANNOTATED: 'neutral', ARCHIVED: 'warning', RESTORED: 'good' };

const patch = (body: unknown): RequestInit => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function AnnotateForm({ evidence, onChanged }: { evidence: EvidenceDetail; onChanged: () => void }) {
  const [label, setLabel] = useState(evidence.label ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (status?: 'ACTIVE' | 'ARCHIVED') => {
    if (note.trim() === '') {
      setError('A note is required — it becomes this change’s custody entry');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await apiRequest(`/evidence/${evidence.id}`, patch({ label: label.trim() || undefined, status, note: note.trim() }));
      setNote('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update evidence');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded border border-edge bg-canvas/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="w-48 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required for any change)" className="min-w-0 flex-1 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink" />
        <Button busy={busy} onClick={() => void save()}>
          Save
        </Button>
        {evidence.status === 'ACTIVE' ? (
          <Button busy={busy} onClick={() => void save('ARCHIVED')}>
            Archive
          </Button>
        ) : (
          <Button busy={busy} onClick={() => void save('ACTIVE')}>
            Restore
          </Button>
        )}
      </div>
      {error ? <p className="text-[11.5px] text-critical">{error}</p> : null}
    </div>
  );
}

function EvidenceRow({ item, canManage }: { item: Evidence; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const detail = useSWR<EvidenceDetail>(open ? `/evidence/${item.id}` : null);

  return (
    <>
      <tr className="cursor-pointer border-t border-edge/50 hover:bg-canvas/40" onClick={() => setOpen((o) => !o)}>
        <td className="py-1.5 pr-2">{open ? <ChevronDown className="size-3.5 text-ink-3" aria-hidden /> : <ChevronRight className="size-3.5 text-ink-3" aria-hidden />}</td>
        <td className="py-1.5 pr-3">
          <p className="font-medium text-ink">{item.label ?? 'Untitled'}</p>
          <p className="font-mono text-[11px] text-ink-3">{item.sha256}</p>
        </td>
        <td className="py-1.5 pr-3 font-mono text-ink-2">{item.firstPath}</td>
        <td className="py-1.5 pr-3 text-ink-3">
          {formatDateTime(item.lastSeenAt)}
          <br />
          {item.custodyCount} custody event{item.custodyCount === 1 ? '' : 's'}
        </td>
        <td className="py-1.5">
          <StatusBadge tone={STATUS_TONE[item.status] ?? 'neutral'} label={item.status.toLowerCase()} />
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-edge/30">
          <td />
          <td colSpan={4} className="py-2 pr-3">
            {detail.error ? <ErrorNotice error={detail.error} /> : null}
            {!detail.data && !detail.error ? <Skeleton className="h-16 w-full" /> : null}
            {detail.data ? (
              <>
                <ol className="space-y-1 border-l border-edge pl-3">
                  {detail.data.custody.map((c) => (
                    <li key={c.id} className="text-[11.5px]">
                      <StatusBadge tone={ACTION_TONE[c.action] ?? 'neutral'} label={c.action.toLowerCase()} /> <span className="text-ink-3">{formatDateTime(c.occurredAt)}</span>{' '}
                      <span className="text-ink-2">
                        by {c.actorType.toLowerCase()}:{c.actorId}
                      </span>
                      {c.detail ? <span className="text-ink-2"> — {c.detail}</span> : null}
                      {c.path ? <span className="font-mono text-ink-3"> ({c.path})</span> : null}
                    </li>
                  ))}
                </ol>
                {canManage ? <AnnotateForm evidence={detail.data} onChanged={() => void detail.mutate()} /> : null}
              </>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function EvidenceConsole() {
  const { can } = useAuth();
  const canManage = can('evidence:manage');
  const evidence = useSWR<EvidencePage>('/evidence');

  return (
    <div>
      <title>Evidence · DARK AGI</title>
      <PageHeader
        title="Evidence"
        summary="Files identified as evidence by the file-hash operation (Digital Forensics), each with an append-only chain of custody. Hashing the same file again adds a custody event, never a duplicate."
      />
      <div className="p-4">
        <Panel title="Evidence" subtitle={evidence.data ? `${evidence.data.items.length} item${evidence.data.items.length === 1 ? '' : 's'}` : undefined}>
          {evidence.error ? <ErrorNotice error={evidence.error} /> : null}
          {!evidence.data && !evidence.error ? <Skeleton className="h-32 w-full" /> : null}
          {evidence.data && evidence.data.items.length === 0 ? (
            <p className="text-[12px] text-ink-3">
              No evidence registered yet. Run <span className="font-mono text-ink">fs:hash</span> from Digital Forensics or the Terminal to hash a file.
            </p>
          ) : null}
          {evidence.data && evidence.data.items.length > 0 ? (
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th />
                  <th className="pb-1 pr-3 font-medium">Evidence</th>
                  <th className="pb-1 pr-3 font-medium">First path</th>
                  <th className="pb-1 pr-3 font-medium">Last seen</th>
                  <th className="pb-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {evidence.data.items.map((item) => (
                  <EvidenceRow key={item.id} item={item} canManage={canManage} />
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
