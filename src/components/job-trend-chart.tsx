'use client';

import { useId, useState } from 'react';
import { Table2 } from 'lucide-react';

export interface JobTrendDay {
  readonly date: string;
  readonly counts: Record<string, number>;
}

/**
 * Mission 08: a real day-bucketed job-count trend, as a stacked bar chart — the overall bar height is
 * the real total-jobs trend; the stacked breakdown is provenance. The 7 real JobStatus values are folded
 * into 4 status-colored buckets (this app's own real `--color-good`/`warning`/`critical` tokens, already
 * used by StatusBadge elsewhere, validated together against this app's real panel surface — not the
 * dataviz skill's generic default palette): Succeeded (good), Failed (critical), Stopped — cancelled or
 * rejected, a human decision, not a crash (warning), and Pending — awaiting approval/queued/running,
 * expected to be near-zero on a past day (muted ink, no real hue — the one CVD-borderline pair this
 * creates against Failed is mitigated by the mandatory legend + hover tooltip + table view below, per the
 * skill's own "relief rule": color is never the only cue here).
 */

interface Bucket {
  readonly key: 'succeeded' | 'failed' | 'stopped' | 'pending';
  readonly label: string;
  readonly color: string;
  readonly statuses: readonly string[];
}

const BUCKETS: readonly Bucket[] = [
  { key: 'succeeded', label: 'Succeeded', color: 'var(--color-good)', statuses: ['SUCCEEDED'] },
  { key: 'failed', label: 'Failed', color: 'var(--color-critical)', statuses: ['FAILED'] },
  { key: 'stopped', label: 'Stopped', color: 'var(--color-warning)', statuses: ['CANCELLED', 'REJECTED'] },
  { key: 'pending', label: 'Pending', color: 'var(--color-ink-3)', statuses: ['AWAITING_APPROVAL', 'QUEUED', 'RUNNING'] },
];

function bucketCounts(counts: Record<string, number>): Record<Bucket['key'], number> {
  const out = { succeeded: 0, failed: 0, stopped: 0, pending: 0 };
  for (const bucket of BUCKETS) {
    out[bucket.key] = bucket.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  }
  return out;
}

const GAP = 2; // 2px surface gap between stacked segments, per the dataviz skill's mark spec

export function JobTrendChart({ days }: { days: readonly JobTrendDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();

  const rows = days.map((d) => ({ date: d.date, counts: bucketCounts(d.counts), total: Object.values(d.counts).reduce((a, b) => a + b, 0) }));
  const max = Math.max(1, ...rows.map((r) => r.total));
  const showEveryNth = days.length > 14 ? Math.ceil(days.length / 14) : 1;

  const width = 600;
  const height = 160;
  const barGap = 3;
  const barWidth = rows.length > 0 ? width / rows.length - barGap : 0;

  if (asTable) {
    return (
      <div className="space-y-2">
        <ToggleButton asTable={asTable} onToggle={() => setAsTable(false)} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px]">
            <thead className="text-[10px] uppercase tracking-wider text-ink-3">
              <tr className="border-b border-edge">
                <th className="py-1 pr-3 font-medium">Date</th>
                {BUCKETS.map((b) => (
                  <th key={b.key} className="py-1 pr-3 font-medium">{b.label}</th>
                ))}
                <th className="py-1 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono text-ink-2">
              {rows.map((r) => (
                <tr key={r.date} className="border-b border-edge/50 last:border-0">
                  <td className="py-1 pr-3 text-ink">{r.date}</td>
                  {BUCKETS.map((b) => (
                    <td key={b.key} className="py-1 pr-3">{r.counts[b.key]}</td>
                  ))}
                  <td className="py-1">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const active = hover === null ? null : rows[hover];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
          {BUCKETS.map((b) => (
            <span key={b.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: b.color }} aria-hidden />
              {b.label}
            </span>
          ))}
        </div>
        <ToggleButton asTable={asTable} onToggle={() => setAsTable(true)} />
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-labelledby={titleId}>
          <title id={titleId}>Job counts per day, {days.length} days, stacked by outcome</title>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="var(--color-edge)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {rows.map((r, i) => {
            const x = i * (barWidth + barGap);
            let yCursor = height;
            const segments = BUCKETS.map((b) => {
              const value = r.counts[b.key];
              const segHeight = value === 0 ? 0 : Math.max(2, (value / max) * height);
              const y = yCursor - segHeight;
              yCursor = y - (value === 0 ? 0 : GAP);
              return { bucket: b, value, x, y, segHeight };
            });
            return (
              <g key={r.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover((h) => (h === i ? null : h))}>
                <rect x={x} y={0} width={barWidth} height={height} fill="transparent" />
                {segments.map((s) =>
                  s.value > 0 ? <rect key={s.bucket.key} x={s.x} y={s.y} width={barWidth} height={s.segHeight} fill={s.bucket.color} rx={1.5} opacity={hover === null || hover === i ? 1 : 0.4} /> : null,
                )}
              </g>
            );
          })}
        </svg>
        <div className="mt-1 flex text-[9.5px] text-ink-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {rows.map((r, i) => (
            <div key={r.date} style={{ width: `${100 / rows.length}%` }} className="truncate text-center">
              {i % showEveryNth === 0 ? r.date.slice(5) : ''}
            </div>
          ))}
        </div>
        {active ? (
          <div className="pointer-events-none absolute top-0 right-0 rounded border border-edge-strong bg-canvas/95 px-2 py-1 text-[11px] text-ink">
            <div className="font-mono text-ink-2">{active.date}</div>
            {BUCKETS.map((b) => (
              <div key={b.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-ink-3">
                  <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: b.color }} aria-hidden />
                  {b.label}
                </span>
                <span className="font-mono">{active.counts[b.key]}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToggleButton({ asTable, onToggle }: { asTable: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 rounded border border-edge-strong px-2 py-0.5 text-[11px] text-ink-2 hover:bg-canvas">
      <Table2 className="size-3" aria-hidden />
      {asTable ? 'View as chart' : 'View as table'}
    </button>
  );
}
