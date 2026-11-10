'use client';

import { Ban, ShieldOff } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, KeyValue, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type BlockedIp, type BlockedIpList, type DefenseEvent, type DefenseStats } from '@/lib/api/client';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { type DefenseFeedConnection, useDefenseFeed } from '@/lib/use-defense-feed';

/**
 * Active Defense: honeypot decoys and CRITICAL/HIGH IP IOCs feed one pipeline (DefenseService, backend)
 * that does exactly one of three things with a detection — alert, block at this machine's own Windows
 * Firewall, or note it's already blocked. Every action here is local containment, never traffic sent
 * back at the source: there is no "counter-attack" on this page, by design (see docs/architecture —
 * hacking back is illegal in effectively every jurisdiction and usually hits an innocent third party
 * whose machine was hijacked to stage the attack).
 */

const ACTION_COLOR: Record<string, string> = {
  BLOCKED: '#2ee88f',
  UNBLOCKED: '#9aa3a6',
  ALREADY_BLOCKED: '#22d3ee',
  ALERTED: '#f5a623',
  BLOCK_FAILED: '#ff3b5c',
};
const ACTION_TONE: Record<string, StatusTone> = { BLOCKED: 'good', UNBLOCKED: 'neutral', ALREADY_BLOCKED: 'neutral', ALERTED: 'warning', BLOCK_FAILED: 'critical' };
const KIND_LABEL: Record<string, string> = { HONEYPOT_HIT: 'Honeypot', IOC_AUTO_BLOCK: 'IOC', MANUAL: 'Manual' };
const RADAR_SLOTS = 24;
const RING_RADII = [34, 66, 98, 130];
const CENTER = 150;

function hashAngleDeg(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function Blip({ event, rank, total }: { event: DefenseEvent; rank: number; total: number }) {
  const angle = hashAngleDeg(event.sourceIp ?? event.id);
  const radius = 24 + (rank / Math.max(1, total - 1)) * 118;
  const rad = (angle * Math.PI) / 180;
  const x = CENTER + radius * Math.cos(rad);
  const y = CENTER + radius * Math.sin(rad);
  const color = ACTION_COLOR[event.action] ?? '#9aa3a6';
  const size = rank === 0 ? 6 : Math.max(2.5, 5 - rank * 0.15);
  return (
    <g style={{ animation: rank === 0 ? 'dagi-blip-in 500ms ease-out' : undefined }}>
      <circle cx={x} cy={y} r={size} fill={color} opacity={Math.max(0.25, 1 - rank / total)}>
        <title>
          {formatDateTime(event.occurredAt)} · {KIND_LABEL[event.kind] ?? event.kind} · {event.sourceIp ?? 'no source IP'} · {event.action} — {event.summary}
        </title>
      </circle>
      {rank === 0 ? <circle cx={x} cy={y} r={size + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.6} /> : null}
    </g>
  );
}

function RadarScope({ events, connection }: { events: readonly DefenseEvent[]; connection: DefenseFeedConnection }) {
  const latest = events.at(-1) ?? null;
  // Remounted (via `key`) whenever a new containment-worthy event arrives, which replays its one-shot,
  // non-looping CSS animation — no state or effect needed just to flash a ring once per event.
  const flashing = latest !== null && (latest.action === 'BLOCKED' || latest.action === 'BLOCK_FAILED' || latest.kind === 'HONEYPOT_HIT');

  const shown = useMemo(() => [...events].reverse().slice(0, RADAR_SLOTS), [events]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-85">
      <div
        key={latest?.id ?? 'idle'}
        className="absolute inset-0 rounded-full"
        style={{ animation: flashing ? 'dagi-ring-flash 900ms ease-out' : undefined }}
      />
      <div className="absolute inset-0 overflow-hidden rounded-full border border-edge-strong bg-[radial-gradient(circle,rgb(46_232_143/0.06),rgb(9_11_12/0.9)_70%)]">
        <div
          className="absolute inset-0"
          style={{
            animation: connection === 'live' ? 'dagi-radar-sweep 4s linear infinite' : undefined,
            background: 'conic-gradient(from 0deg, rgb(46 232 143 / 0.32), transparent 22deg, transparent 360deg)',
          }}
        />
        <svg viewBox="0 0 300 300" className="absolute inset-0 size-full">
          {RING_RADII.map((r) => (
            <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="#1f2528" strokeWidth={1} />
          ))}
          <line x1={CENTER} y1={10} x2={CENTER} y2={290} stroke="#1f2528" strokeWidth={1} />
          <line x1={10} y1={CENTER} x2={290} y2={CENTER} stroke="#1f2528" strokeWidth={1} />
          {shown.map((event, rank) => (
            <Blip key={event.id} event={event} rank={rank} total={shown.length} />
          ))}
        </svg>
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center font-mono text-[10px] tracking-widest text-ink-3 uppercase">
        {connection === 'live' ? 'Live sweep' : connection === 'connecting' ? 'Connecting…' : 'Feed offline'}
      </div>
    </div>
  );
}

const postJson = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function ManualBlockForm({ onDone }: { onDone: () => Promise<unknown> }) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/defense/blocked', postJson({ ip: ip.trim(), reason: reason.trim() }));
      setIp('');
      setReason('');
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-2" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[12px] text-ink" placeholder="IPv4 address, e.g. 203.0.113.9" value={ip} onChange={(e) => setIp(e.target.value)} />
        <input className="rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink" placeholder="Reason (audited)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button type="submit" variant="primary" busy={busy} disabled={ip.trim().length === 0 || reason.trim().length === 0}>
        <Ban className="size-3.5" aria-hidden /> Block at firewall
      </Button>
      <p className="text-[11px] text-ink-3">Applies immediately, regardless of auto-block — this is always your own explicit action, fully audited and reversible from the table below.</p>
    </form>
  );
}

function BlockedIpRow({ row, canManage, onChanged }: { row: BlockedIp; canManage: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const unblock = async () => {
    setBusy(true);
    try {
      await apiRequest(`/defense/blocked/${row.id}/unblock`, { method: 'POST' });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr className="border-t border-edge/50">
      <td className="py-1.5 pr-3 font-mono text-ink">{row.ip}</td>
      <td className="py-1.5 pr-3 text-ink-2">{row.reason}</td>
      <td className="py-1.5 pr-3 text-ink-3">{row.source}</td>
      <td className="py-1.5 pr-3 text-ink-3">{formatRelativeTime(row.blockedAt)}</td>
      <td className="py-1.5 pr-3 text-ink-3">{row.expiresAt ? formatRelativeTime(row.expiresAt) : 'manual'}</td>
      <td className="py-1.5 pr-3">
        <StatusBadge tone={row.active ? 'warning' : 'neutral'} label={row.active ? 'Active' : 'Lifted'} />
      </td>
      <td className="py-1.5 text-right">
        {canManage && row.active ? (
          <button type="button" disabled={busy} onClick={() => void unblock()} className="rounded border border-edge-strong p-1 text-ink-2 hover:bg-canvas disabled:opacity-40" title="Unblock">
            <ShieldOff className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export function DefenseRadar() {
  const { can } = useAuth();
  const canManage = can('defense:manage');
  const feed = useDefenseFeed();
  const stats = useSWR<DefenseStats>('/defense/stats', { refreshInterval: 15_000 });
  const blocked = useSWR<BlockedIpList>('/defense/blocked', { refreshInterval: 10_000 });

  const feedBadge =
    feed.connection === 'live' ? (
      <StatusBadge tone="good" label="Radar live" />
    ) : feed.connection === 'connecting' ? (
      <StatusBadge tone="pending" label="Connecting" />
    ) : (
      <StatusBadge tone="critical" label="Feed offline" />
    );

  return (
    <div>
      <title>Active Defense · DARK AGI</title>
      <PageHeader
        title="Active Defense"
        summary="Honeypot decoys and CRITICAL/HIGH IP IOCs feed a real-time containment pipeline: alert, block at this machine's own Windows Firewall, or already-blocked — never traffic sent back at the source."
        actions={feedBadge}
      />
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <Panel title="Radar" subtitle="Each blip is one real detection; distance from center is recency, color is the action taken" className="lg:col-span-1">
          <RadarScope events={feed.events} connection={feed.connection} />
        </Panel>

        <div className="space-y-3 lg:col-span-2">
          {stats.error ? <ErrorNotice error={stats.error} /> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">Auto-block</p>
              <p className="mt-1 font-mono text-[18px] text-ink">
                <StatusBadge tone={stats.data?.autoBlockEnabled ? 'good' : 'neutral'} label={stats.data ? (stats.data.autoBlockEnabled ? 'ON' : 'OFF') : '—'} />
              </p>
            </div>
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">Honeypots</p>
              <p className="mt-1 font-mono text-[18px] text-ink">{stats.data ? stats.data.honeypotPorts.length : '—'}</p>
            </div>
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">Active blocks</p>
              <p className="mt-1 font-mono text-[18px] text-ink">{stats.data ? stats.data.activeBlocks : '—'}</p>
            </div>
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">Events · 24h</p>
              <p className="mt-1 font-mono text-[18px] text-ink">{stats.data ? stats.data.events24h : '—'}</p>
            </div>
          </div>

          <Panel title="Event log" subtitle="Newest first — honeypot hits, auto-blocked IOCs and manual reports">
            {feed.events.length === 0 ? (
              <p className="text-[12px] text-ink-3">No detections yet. Nothing has connected to a honeypot port, and no CRITICAL/HIGH IP IOC has been recorded.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {[...feed.events].reverse().map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 rounded border border-edge/60 px-2 py-1 text-[11.5px]">
                    <span className="min-w-0 truncate text-ink-2">
                      <span className="font-mono text-ink-3">{KIND_LABEL[e.kind] ?? e.kind}</span> · {e.sourceIp ?? '—'} · {e.summary}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-ink-3">
                      {formatRelativeTime(e.occurredAt)}
                      <StatusBadge tone={ACTION_TONE[e.action] ?? 'neutral'} label={e.action.toLowerCase().replace('_', ' ')} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Blocked addresses" subtitle={blocked.data ? `${blocked.data.items.filter((b) => b.active).length} active` : undefined}>
            {blocked.error ? <ErrorNotice error={blocked.error} /> : null}
            {!blocked.data && !blocked.error ? <Skeleton className="h-24 w-full" /> : null}
            {blocked.data && blocked.data.items.length === 0 ? <p className="text-[12px] text-ink-3">Nothing blocked yet.</p> : null}
            {blocked.data && blocked.data.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                    <tr>
                      <th className="pb-1 pr-3 font-medium">IP</th>
                      <th className="pb-1 pr-3 font-medium">Reason</th>
                      <th className="pb-1 pr-3 font-medium">Source</th>
                      <th className="pb-1 pr-3 font-medium">Blocked</th>
                      <th className="pb-1 pr-3 font-medium">Expires</th>
                      <th className="pb-1 pr-3 font-medium">Status</th>
                      <th className="pb-1 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {blocked.data.items.map((row) => (
                      <BlockedIpRow key={row.id} row={row} canManage={canManage} onChanged={() => Promise.all([blocked.mutate(), stats.mutate()])} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Panel>

          {canManage ? (
            <Panel title="Manual block" subtitle="Applies at the Windows Firewall immediately — your own explicit, audited action">
              <ManualBlockForm onDone={() => Promise.all([blocked.mutate(), stats.mutate()])} />
            </Panel>
          ) : null}

          <Panel title="How this works">
            <dl>
              <KeyValue label="Detectors">Honeypot decoy ports · CRITICAL/HIGH IP indicators of compromise · manual operator reports</KeyValue>
              <KeyValue label="Containment">Local Windows Firewall rule (in + out), named and removable only by this platform</KeyValue>
              <KeyValue label="What this never does">Send any packet back at the source — that would usually hit an innocent, already-hijacked third party</KeyValue>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

