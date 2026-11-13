import { useMemo, useState } from 'react';

type Row = Record<string, unknown>;

const cell = (v: unknown): string => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/**
 * A result value is rendered as a picture, not text, when it is a string URL ending in a common image
 * extension (query string allowed) — generic, so any operation that returns an image URL (NASA EPIC today,
 * a future External Intelligence source tomorrow) gets this for free, with no per-operation special-casing.
 */
const IMAGE_URL = /^https?:\/\/\S+\.(?:jpe?g|png|gif|webp)(?:[?#]\S*)?$/i;
const isImageUrl = (v: unknown): v is string => typeof v === 'string' && IMAGE_URL.test(v);

/** Every distinct image URL found directly on `row` or inside its one level of nested objects (e.g. a Row inside `summary`). */
function imageUrlsIn(row: Row): string[] {
  const found = new Set<string>();
  for (const v of Object.values(row)) {
    if (isImageUrl(v)) found.add(v);
    else if (v !== null && typeof v === 'object' && !Array.isArray(v)) for (const nested of Object.values(v as Row)) if (isImageUrl(nested)) found.add(nested);
  }
  return [...found];
}

function ImagePreviews({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded border border-edge" title={`Open full size: ${url}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- an arbitrary external URL from job output, not a local/optimizable asset Next's Image component can process */}
          <img src={url} alt="" loading="lazy" className="h-40 w-auto object-cover transition group-hover:opacity-90" />
        </a>
      ))}
    </div>
  );
}

function ImageCell({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" title={`Open full size: ${url}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- see ImagePreviews */}
      <img src={url} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" />
    </a>
  );
}

interface NmapHost {
  address: string;
  hostnames: string[];
  status: string;
  reason: string;
  ports: { protocol: string; port: number; state: string; service: string | null; product: string | null; version: string | null }[];
  os?: { name: string; accuracy: number }[];
  scripts?: { id: string; output: string }[];
}

function NmapHosts({ hosts }: { hosts: NmapHost[] }) {
  if (hosts.length === 0) return <p className="text-ink-3">No hosts reported.</p>;
  return (
    <div className="space-y-2">
      {hosts.map((h) => (
        <div key={h.address} className="rounded border border-edge p-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-ink">{h.address}</span>
            {h.hostnames.length > 0 ? <span className="text-ink-3">{h.hostnames.join(', ')}</span> : null}
            <span className={h.status === 'up' ? 'text-good' : 'text-ink-3'}>{h.status}</span>
            <span className="text-[11px] text-ink-3">({h.reason})</span>
          </div>
          {h.os && h.os.length > 0 ? (
            <p className="mt-1 text-[11.5px] text-ink-2">
              OS guess:{' '}
              {h.os.map((m, i) => (
                <span key={`${m.name}-${i}`} className="font-mono">
                  {i > 0 ? ', ' : ''}
                  {m.name} ({m.accuracy}%)
                </span>
              ))}
            </p>
          ) : null}
          {h.ports.length > 0 ? (
            <table className="mt-1.5 w-full text-left text-[11.5px]">
              <thead className="text-[10px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="pr-3 font-medium">Port</th>
                  <th className="pr-3 font-medium">State</th>
                  <th className="pr-3 font-medium">Service</th>
                  <th className="font-medium">Product / version</th>
                </tr>
              </thead>
              <tbody className="font-mono text-ink-2">
                {h.ports.map((p) => (
                  <tr key={`${p.protocol}/${p.port}`}>
                    <td className="pr-3">
                      {p.port}/{p.protocol}
                    </td>
                    <td className={`pr-3 ${p.state === 'open' ? 'text-good' : ''}`}>{p.state}</td>
                    <td className="pr-3">{p.service ?? '—'}</td>
                    <td>{[p.product, p.version].filter(Boolean).join(' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {h.scripts && h.scripts.length > 0 ? (
            <div className="mt-1.5 space-y-1">
              {h.scripts.map((s, i) => (
                <details key={`${s.id}-${i}`} className="rounded border border-edge/60 bg-canvas/40 px-2 py-1">
                  <summary className="cursor-pointer font-mono text-[11px] text-ink-2">{s.id}</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-ink-3">{s.output}</pre>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ItemTable({ items }: { items: Row[] }) {
  const [query, setQuery] = useState('');
  const columns = useMemo(() => [...new Set(items.slice(0, 50).flatMap((i) => Object.keys(i)))], [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => Object.values(i).some((v) => String(v ?? '').toLowerCase().includes(q))) : items;
  }, [items, query]);
  const shown = filtered.slice(0, 300);
  return (
    <div>
      <input
        className="mb-1.5 w-64 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
        placeholder={`Filter ${items.length} rows`}
        aria-label="Filter result rows"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-96 overflow-auto rounded border border-edge">
        <table className="w-full text-left text-[11.5px]">
          <thead className="sticky top-0 bg-panel text-[10px] uppercase tracking-wider text-ink-3">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-ink-2">
            {shown.map((row, i) => (
              <tr key={i} className="border-t border-edge/50">
                {columns.map((c) =>
                  isImageUrl(row[c]) ? (
                    <td key={c} className="px-2 py-0.5">
                      <ImageCell url={row[c]} />
                    </td>
                  ) : (
                    <td key={c} className="max-w-[28rem] truncate px-2 py-0.5" title={cell(row[c])}>
                      {cell(row[c])}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > shown.length ? <p className="mt-1 text-[11px] text-ink-3">Showing {shown.length} of {filtered.length} rows.</p> : null}
    </div>
  );
}

/** Renders a job's structured result: Nmap host tables, inventory tables, or JSON. */
export function JobResult({ result }: { result: unknown }) {
  if (result === null || result === undefined) return null;
  const r = result as Row;
  if (Array.isArray(r.hosts)) {
    const summary = r.summary as Row | undefined;
    return (
      <div className="space-y-2">
        {summary ? (
          <p className="text-ink-2">
            Nmap {cell(r.version)} · {cell(summary.up)} up / {cell(summary.total)} hosts · {cell(summary.elapsedSeconds)} s
          </p>
        ) : null}
        <NmapHosts hosts={r.hosts as never} />
      </div>
    );
  }
  if (Array.isArray(r.items)) {
    const previewUrls = [...new Set([...(r.summary ? imageUrlsIn(r.summary as Row) : []), ...(r.items as Row[]).slice(0, 10).flatMap(imageUrlsIn)])];
    return (
      <div className="space-y-2">
        <ImagePreviews urls={previewUrls} />
        {r.summary ? <pre className="whitespace-pre-wrap font-mono text-[11px] text-ink-2">{JSON.stringify(r.summary)}</pre> : null}
        <ItemTable items={r.items as Row[]} />
      </div>
    );
  }
  return <pre className="max-h-96 overflow-auto rounded border border-edge p-2 font-mono text-[11px] text-ink-2">{JSON.stringify(result, null, 2)}</pre>;
}
