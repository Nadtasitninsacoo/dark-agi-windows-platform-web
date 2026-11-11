'use client';

import { ChevronDown, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest } from '@/lib/api/client';

interface Asset {
  ip: string;
  country: string | null;
  city: string | null;
  region: string | null;
  source: string;
  ports: { port: number; service: string | null }[];
  authorized: boolean;
}
interface AssetList {
  total: number;
  items: Asset[];
}
interface Filters {
  q: string;
  country: string;
  port: string;
  state: 'all' | 'authorized' | 'unauthorized';
}

const PAGE_SIZE = 50;
const MAX_PORT_CHIPS = 10;
const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const EMPTY: Filters = { q: '', country: '', port: '', state: 'all' };

const buildKey = (f: Filters, offset: number): string => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), state: f.state });
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.country.trim()) params.set('country', f.country.trim());
  if (f.port.trim()) params.set('port', f.port.trim());
  return `/scopes/assets?${params.toString()}`;
};

/** "TH" → "TH · ไทย (Thailand)". Names come from the browser's built-in region data; unknown codes show as-is. */
function countryLabel(code: string): string {
  if (!code) return '';
  try {
    const th = new Intl.DisplayNames(['th'], { type: 'region' }).of(code);
    const en = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    if (!th || th === code) return code;
    return en && en !== th ? `${code} · ${th} (${en})` : `${code} · ${th}`;
  } catch {
    return code;
  }
}

interface Facets {
  countries: { code: string; count: number }[];
  ports: { port: number; service: string | null; count: number }[];
}
interface ComboOption {
  value: string;
  label: string;
}

/** Type to filter, or click to pick from the list. The text box always holds the filter value itself. */
function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  numeric = false,
  status = null,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder: string;
  ariaLabel: string;
  numeric?: boolean;
  status?: 'loading' | 'error' | null;
}) {
  const [open, setOpen] = useState(false);
  const needle = value.trim().toLowerCase();
  const shown = options.filter((o) => !needle || o.value.toLowerCase().includes(needle) || o.label.toLowerCase().includes(needle)).slice(0, 100);

  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-6`}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputMode={numeric ? 'numeric' : undefined}
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        onChange={(e) => {
          onChange(numeric ? e.target.value.replace(/\D/g, '') : e.target.value);
          setOpen(true);
        }}
      />
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full min-w-40 overflow-auto rounded border border-edge-strong bg-panel text-[12px] shadow-lg" role="listbox">
          {value ? (
            <li>
              <button type="button" className="w-full px-2 py-1 text-left text-ink-3 hover:bg-panel-2" onMouseDown={(e) => { e.preventDefault(); onChange(''); setOpen(false); }}>
                Clear
              </button>
            </li>
          ) : null}
          {shown.length === 0 ? (
            <li className="px-2 py-1 text-ink-3">
              {status === 'loading' ? 'Loading the list…' : status === 'error' ? 'Could not load the list (see the error above) — you can still type a value' : 'No match — Search will use what you typed'}
            </li>
          ) : null}
          {shown.map((o) => (
            <li key={o.value}>
              <button type="button" className="w-full px-2 py-1 text-left text-ink hover:bg-panel-2" onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A fixed-choice dropdown drawn by this app (not the browser's native <select>), styled like the other filters. */
function PickInput({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: ComboOption[]; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <div className="relative">
      <button
        type="button"
        className={`${inputClass} flex items-center justify-between text-left`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span>{current}</span>
        <ChevronDown className="size-3.5 text-ink-3" aria-hidden />
      </button>
      {open ? (
        <ul className="absolute z-20 mt-1 w-full min-w-40 overflow-auto rounded border border-edge-strong bg-panel text-[12px] shadow-lg" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`w-full px-2 py-1 text-left hover:bg-panel-2 ${o.value === value ? 'text-accent' : 'text-ink'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const STATE_OPTIONS: ComboOption[] = [
  { value: 'all', label: 'All' },
  { value: 'unauthorized', label: 'Not authorized' },
  { value: 'authorized', label: 'Authorized' },
];

/**
 * Pick exactly which IPs may be scanned. Browse the asset vault (search by IP / country / open port), tick the
 * ones to allow, and authorize. An authorization never expires — it stays until someone revokes it here (or in
 * AGI-Research). Nothing is scannable until it is authorized; the server enforces this on every job.
 */
export function AssetAuthorization({ canManage, onChanged }: { canManage: boolean; onChanged: () => Promise<unknown> }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  const list = useSWR<AssetList>(buildKey(applied, (page - 1) * PAGE_SIZE));
  const facets = useSWR<Facets>('/scopes/assets/facets', { revalidateOnFocus: false });
  const facetStatus: 'loading' | 'error' | null = facets.error ? 'error' : facets.data ? null : 'loading';
  const countryOptions: ComboOption[] = (facets.data?.countries ?? []).map((c) => ({ value: c.code, label: `${countryLabel(c.code)} — ${c.count.toLocaleString()} IPs` }));
  const portOptions: ComboOption[] = (facets.data?.ports ?? []).map((p) => ({ value: String(p.port), label: `${p.port}${p.service ? ` ${p.service}` : ''} · ${p.count.toLocaleString()} IPs` }));
  const items = list.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const allOnPage = items.length > 0 && items.every((a) => selected.has(a.ip));

  const apply = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  };

  const toggle = (ip: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const a of items) {
        if (allOnPage) next.delete(a.ip);
        else next.add(a.ip);
      }
      return next;
    });

  const act = async (action: 'authorize' | 'revoke') => {
    const ips = [...selected];
    if (ips.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ips }) };
      if (action === 'authorize') {
        const r = await apiRequest<{ authorized: number; ignored: number }>('/scopes/assets/authorize', init);
        setMessage(`Authorized ${r.authorized} IP(s)${r.ignored > 0 ? `; ${r.ignored} skipped (not in the vault)` : ''}. They can be scanned now and stay authorized until revoked.`);
      } else {
        const r = await apiRequest<{ revoked: number }>('/scopes/assets/revoke', init);
        setMessage(`Revoked ${r.revoked} IP(s). They can no longer be scanned.`);
      }
      setSelected(new Set());
      await Promise.all([list.mutate(), onChanged()]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Authorize targets"
      subtitle={list.data ? `${list.data.total} IP(s) in the vault match${selected.size > 0 ? ` · ${selected.size} selected` : ''}` : 'Search the vault, then choose which IPs may be scanned'}
    >
      <form className="mb-3 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" onSubmit={apply}>
        <input className={inputClass} placeholder="Search IP, city or country" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} aria-label="Search" />
        <ComboInput value={draft.country} onChange={(country) => setDraft({ ...draft, country })} options={countryOptions} placeholder="Country (type or pick)" ariaLabel="Country" status={facetStatus} />
        <ComboInput value={draft.port} onChange={(port) => setDraft({ ...draft, port })} options={portOptions} placeholder="Open port (type or pick)" ariaLabel="Open port" numeric status={facetStatus} />
        <PickInput value={draft.state} onChange={(state) => setDraft({ ...draft, state: state as Filters['state'] })} options={STATE_OPTIONS} ariaLabel="Authorization state" />
        <Button type="submit" variant="primary">
          <Search className="size-3.5" aria-hidden /> Search
        </Button>
      </form>

      {error ? <ErrorNotice error={error} /> : null}
      {list.error ? <ErrorNotice error={list.error} /> : null}
      {message ? <p className="mb-2 text-[12px] text-ink-2">{message}</p> : null}
      {!list.data && !list.error ? <Skeleton className="h-24 w-full" /> : null}
      {list.data && items.length === 0 ? <p className="text-[12px] text-ink-3">No IPs match these filters.</p> : null}

      {items.length > 0 ? (
        <div className="max-h-112 overflow-auto rounded border border-edge">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 bg-panel text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="w-8 py-1 pl-2 pr-1 font-medium">
                  {canManage ? <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /> : null}
                </th>
                <th className="py-1 pr-3 font-medium">IP</th>
                <th className="py-1 pr-3 font-medium">Country</th>
                <th className="py-1 pr-3 font-medium">Location</th>
                <th className="py-1 pr-3 font-medium">Open ports</th>
                <th className="py-1 pr-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.ip} className="border-t border-edge/50 align-top">
                  <td className="py-1 pl-2 pr-1">{canManage ? <input type="checkbox" checked={selected.has(a.ip)} onChange={() => toggle(a.ip)} aria-label={`Select ${a.ip}`} /> : null}</td>
                  <td className="py-1 pr-3 font-mono text-ink">{a.ip}</td>
                  <td className="py-1 pr-3 text-ink-2">{a.country ? countryLabel(a.country) : '—'}</td>
                  <td className="py-1 pr-3 text-ink-2">{[a.city, a.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="py-1 pr-3 font-mono text-ink-2">
                    {a.ports.length === 0
                      ? '—'
                      : a.ports
                          .slice(0, MAX_PORT_CHIPS)
                          .map((p) => (p.service ? `${p.port}/${p.service}` : String(p.port)))
                          .join('  ') + (a.ports.length > MAX_PORT_CHIPS ? `  +${a.ports.length - MAX_PORT_CHIPS}` : '')}
                  </td>
                  <td className="py-1 pr-3">{a.authorized ? <StatusBadge tone="good" label="authorized" /> : <StatusBadge tone="neutral" label="not authorized" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <span className="text-[11.5px] text-ink-3">
          Page {page} of {totalPages}
        </span>
        <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Next
        </Button>
        {canManage ? (
          <>
            <span className="flex-1" />
            <Button variant="primary" busy={busy} disabled={selected.size === 0} onClick={() => void act('authorize')}>
              Authorize selected ({selected.size})
            </Button>
            <Button variant="danger" busy={busy} disabled={selected.size === 0} onClick={() => void act('revoke')}>
              Revoke selected ({selected.size})
            </Button>
          </>
        ) : null}
      </div>
    </Panel>
  );
}
