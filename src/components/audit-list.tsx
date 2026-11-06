import type { AuditEvent } from '@/lib/api/client';
import { formatDateTime, shortHash } from '@/lib/format';
import { StatusBadge, type StatusTone } from './ui';

const OUTCOME_TONE: Record<AuditEvent['outcome'], StatusTone> = { SUCCESS: 'good', DENIED: 'warning', FAILURE: 'critical' };

export function AuditList({ events, showHashes = false }: { events: readonly AuditEvent[]; showHashes?: boolean }) {
  if (events.length === 0) return <p className="py-2 text-[12px] text-ink-3">No audit events recorded yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr className="border-b border-edge">
            <th className="py-1.5 pr-3 font-medium">#</th>
            <th className="py-1.5 pr-3 font-medium">Time</th>
            <th className="py-1.5 pr-3 font-medium">Actor</th>
            <th className="py-1.5 pr-3 font-medium">Action</th>
            <th className="py-1.5 pr-3 font-medium">Outcome</th>
            {showHashes ? <th className="py-1.5 pr-3 font-medium">Hash</th> : null}
            {showHashes ? <th className="py-1.5 font-medium">Details</th> : null}
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-edge/60 align-top last:border-0">
              <td className="py-1.5 pr-3 font-mono text-ink-3">{e.seq}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-ink-2">{formatDateTime(e.occurredAt)}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">
                {e.actorType.toLowerCase()}:{e.actorId}
              </td>
              <td className="py-1.5 pr-3 font-mono text-ink">{e.action}</td>
              <td className="py-1.5 pr-3">
                <StatusBadge tone={OUTCOME_TONE[e.outcome]} label={e.outcome.toLowerCase()} />
              </td>
              {showHashes ? (
                <td className="py-1.5 pr-3 font-mono text-[11px] text-ink-3" title={`hash ${e.hash}\nprev ${e.prevHash}`}>
                  {shortHash(e.hash)}
                </td>
              ) : null}
              {showHashes ? (
                <td className="max-w-[28rem] py-1.5">
                  <code className="line-clamp-2 break-all font-mono text-[11px] text-ink-3">{JSON.stringify(e.details)}</code>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
