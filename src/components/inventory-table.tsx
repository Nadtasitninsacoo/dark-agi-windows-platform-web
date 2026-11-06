import type { RuntimeComponent } from '@/lib/api/client';
import { StatusBadge, type StatusTone } from './ui';

export function componentTone(c: RuntimeComponent): { tone: StatusTone; label: string } {
  if (c.status === 'available') return { tone: 'good', label: 'Available' };
  if (c.status === 'error') return { tone: 'critical', label: 'Error' };
  return c.required ? { tone: 'critical', label: 'Missing (required)' } : { tone: 'neutral', label: 'Not installed' };
}

export function InventoryTable({ components, compact = false }: { components: readonly RuntimeComponent[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr className="border-b border-edge">
            <th className="py-1.5 pr-3 font-medium">Component</th>
            <th className="py-1.5 pr-3 font-medium">Status</th>
            <th className="py-1.5 pr-3 font-medium">Version</th>
            {compact ? null : <th className="py-1.5 pr-3 font-medium">Location</th>}
            {compact ? null : <th className="py-1.5 font-medium">Purpose / detail</th>}
          </tr>
        </thead>
        <tbody>
          {components.map((c) => {
            const { tone, label } = componentTone(c);
            return (
              <tr key={c.id} className="border-b border-edge/60 align-top last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="text-ink">{c.name}</span>
                  {c.required ? <span className="ml-1.5 text-[10px] text-warning">required</span> : null}
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <StatusBadge tone={tone} label={label} />
                </td>
                <td className="py-1.5 pr-3 font-mono text-ink-2">{c.version ?? '—'}</td>
                {compact ? null : (
                  <td className="max-w-[22rem] truncate py-1.5 pr-3 font-mono text-[11px] text-ink-3" title={c.path ?? undefined}>
                    {c.path ?? '—'}
                    {c.resolution ? <span className="ml-1 text-ink-3/70">({c.resolution})</span> : null}
                  </td>
                )}
                {compact ? null : (
                  <td className="py-1.5 text-ink-2">
                    {c.purpose}
                    {c.detail ? <div className="text-[11px] text-ink-3">{c.detail}</div> : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
