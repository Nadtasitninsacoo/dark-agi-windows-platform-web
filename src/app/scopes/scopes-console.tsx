'use client';

import { Eye, Plus } from 'lucide-react';
import { Fragment, type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type Scope, type ScopeCreateRequest, type ScopeList, type ScopePreviewSyncResult, type ScopeSyncConfig } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const send = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const splitTargets = (text: string): string[] => text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
const TARGETS_PAGE_SIZE = 50;

function CreateScope({ onCreated }: { onCreated: () => Promise<unknown> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targets, setTargets] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: ScopeCreateRequest = { name, description, targets: splitTargets(targets), expiresAt: expires ? new Date(expires).toISOString() : null };
      await apiRequest<Scope>('/scopes', send('POST', body));
      setName('');
      setDescription('');
      setTargets('');
      setExpires('');
      await onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-2" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <input className={inputClass} placeholder="Name, e.g. Office lab" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center gap-2 text-[11.5px] text-ink-3">
          Expires
          <input className={inputClass} type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </label>
      </div>
      <input className={inputClass} placeholder="Description / authorization reference (who approved testing, ticket number…)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <textarea
        className={`${inputClass} h-20 font-mono`}
        placeholder={'One per line: 192.168.10.0/24, 10.0.0.5, intranet.example.com, *.lab.example\nRanges larger than /16 are refused.'}
        value={targets}
        onChange={(e) => setTargets(e.target.value)}
      />
      <Button type="submit" variant="primary" busy={busy} disabled={name.trim().length < 2 || splitTargets(targets).length === 0}>
        <Plus className="size-3.5" aria-hidden /> Create scope
      </Button>
    </form>
  );
}

function ScopeRow({ scope, canManage, onChanged, defaultSyncUrl }: { scope: Scope; canManage: boolean; onChanged: () => Promise<unknown>; defaultSyncUrl: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState(scope.targets.join('\n'));
  const [targetsPage, setTargetsPage] = useState(1);
  const targetsTotalPages = Math.max(1, Math.ceil(scope.targets.length / TARGETS_PAGE_SIZE));
  const targetsPageSafe = Math.min(targetsPage, targetsTotalPages);
  const targetsPageItems = scope.targets.slice((targetsPageSafe - 1) * TARGETS_PAGE_SIZE, targetsPageSafe * TARGETS_PAGE_SIZE);

  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  // Falls back to this machine's own configured ASSET_SYNC_URL (set once per deployment in .env) whenever
  // the field is still untouched, so nobody has to retype the same endpoint by hand on every machine —
  // derived at render time, not an effect, so it never clobbers a URL the operator is deliberately typing.
  const effectiveUrl = previewUrl !== '' ? previewUrl : (defaultSyncUrl ?? '');
  const [previewToken, setPreviewToken] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [previewResult, setPreviewResult] = useState<ScopePreviewSyncResult | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<unknown>(null);

  const update = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<Scope>(`/scopes/${scope.id}`, send('PATCH', body));
      await onChanged();
      setEditing(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const addSelectedToScope = async () => {
    setAddBusy(true);
    setAddError(null);
    try {
      const merged = [...new Set([...scope.targets, ...selected])];
      await apiRequest<Scope>(`/scopes/${scope.id}`, send('PATCH', { targets: merged }));
      setSelected(new Set());
      await onChanged();
    } catch (err) {
      setAddError(err);
    } finally {
      setAddBusy(false);
    }
  };

  const preview = async (e: FormEvent) => {
    e.preventDefault();
    setPreviewBusy(true);
    setPreviewError(null);
    setPreviewResult(null);
    setSelected(new Set());
    try {
      setPreviewResult(await apiRequest<ScopePreviewSyncResult>('/scopes/preview-sync', send('POST', { url: effectiveUrl, token: previewToken.trim() || undefined })));
    } catch (err) {
      setPreviewError(err);
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <Fragment>
      <tr className="border-b border-edge/60 align-top last:border-0">
        <td className="py-2 pr-3">
          <div className="font-semibold text-ink">{scope.name}</div>
          {scope.description ? <div className="max-w-xs text-[11.5px] text-ink-3">{scope.description}</div> : null}
          {error ? (
            <div className="mt-1">
              <ErrorNotice error={error} />
            </div>
          ) : null}
        </td>
        <td className="py-2 pr-3">
          {editing ? (
            <div className="space-y-1.5">
              <textarea className={`${inputClass} h-20 w-64 font-mono`} value={targets} onChange={(e) => setTargets(e.target.value)} />
              <div className="flex gap-1.5">
                <Button variant="primary" busy={busy} onClick={() => void update({ targets: splitTargets(targets) })}>
                  Save
                </Button>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <ul className="font-mono text-[11.5px] text-ink-2">
                {targetsPageItems.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {scope.targets.length > TARGETS_PAGE_SIZE ? (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
                  <Button disabled={targetsPageSafe <= 1} onClick={() => setTargetsPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <span>
                    Page {targetsPageSafe} of {targetsTotalPages} ({scope.targets.length.toLocaleString()} total)
                  </span>
                  <Button disabled={targetsPageSafe >= targetsTotalPages} onClick={() => setTargetsPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </td>
        <td className="py-2 pr-3 font-mono text-ink-2">{scope.addressCount.toLocaleString()}</td>
        <td className="py-2 pr-3">
          <StatusBadge tone={scope.active ? 'good' : 'neutral'} label={scope.active ? 'Active' : scope.enabled ? 'Expired' : 'Disabled'} />
          {scope.expiresAt ? <div className="mt-0.5 text-[11px] text-ink-3">until {formatDateTime(scope.expiresAt)}</div> : null}
        </td>
        <td className="py-2 pr-3 text-ink-2">{scope.owner.username}</td>
        <td className="py-2 pr-3 font-mono text-ink-2">{scope.jobCount}</td>
        <td className="py-2 text-right">
          {canManage && !editing ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              <Button onClick={() => setPreviewing((v) => !v)}>
                <Eye className="size-3.5" aria-hidden /> {previewing ? 'Hide preview' : 'Preview source'}
              </Button>
              <Button onClick={() => setEditing(true)}>Edit targets</Button>
              <Button busy={busy} onClick={() => void update({ enabled: !scope.enabled })}>
                {scope.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          ) : null}
        </td>
      </tr>
      {previewing ? (
        <tr className="border-b border-edge/60 bg-canvas/40">
          <td colSpan={7} className="p-3">
            <p className="mb-2 text-[11.5px] text-ink-3">
              Read-only — fetches and validates a target list from any URL, but never creates or changes <span className="text-ink-2">{scope.name}</span> or any other scope.
            </p>
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void preview(e)}>
              <label className="min-w-64 flex-1 text-[11.5px] text-ink-3">
                Endpoint URL
                <input className={`${inputClass} mt-0.5`} placeholder="http://127.0.0.1:3001/api/saved-ips" autoComplete="off" value={effectiveUrl} onChange={(e) => setPreviewUrl(e.target.value)} />
              </label>
              <label className="min-w-48 text-[11.5px] text-ink-3">
                Bearer token — never your own DARK AGI password
                <input
                  className={`${inputClass} mt-0.5 font-mono`}
                  type="password"
                  autoComplete="new-password"
                  placeholder={effectiveUrl === defaultSyncUrl ? 'Leave blank — this machine already has one configured' : 'Required for this URL'}
                  value={previewToken}
                  onChange={(e) => setPreviewToken(e.target.value)}
                />
              </label>
              <Button type="submit" busy={previewBusy} disabled={effectiveUrl.trim() === ''}>
                <Eye className="size-3.5" aria-hidden /> Preview
              </Button>
            </form>
            {previewError ? (
              <div className="mt-2">
                <ErrorNotice error={previewError} />
              </div>
            ) : null}
            {previewResult ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11.5px] text-ink-3">
                  {previewResult.total} entr{previewResult.total === 1 ? 'y' : 'ies'} returned · <span className="text-good">{previewResult.valid.length} valid</span> ·{' '}
                  <span className="text-critical">{previewResult.invalid.length} invalid</span> — nothing here has been saved as a scope. Tick the ones you personally vouch
                  for as actually authorized, then add just those to {scope.name}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11.5px] text-ink-3">{selected.size} selected</span>
                  <Button
                    variant="primary"
                    busy={addBusy}
                    disabled={selected.size === 0}
                    onClick={() => void addSelectedToScope()}
                  >
                    Add {selected.size || ''} selected to {scope.name}
                  </Button>
                  {selected.size > 0 ? (
                    <Button onClick={() => setSelected(new Set())}>Clear selection</Button>
                  ) : previewResult.valid.length > 0 ? (
                    <Button onClick={() => setSelected(new Set(previewResult.valid))}>Select all valid</Button>
                  ) : null}
                </div>
                {addError ? (
                  <div>
                    <ErrorNotice error={addError} />
                  </div>
                ) : null}
                <div className="max-h-96 overflow-auto rounded border border-edge">
                  <table className="w-full text-left text-[12px]">
                    <thead className="sticky top-0 bg-panel text-[10.5px] uppercase tracking-wider text-ink-3">
                      <tr>
                        <th className="w-8 py-1 pl-2 pr-1 font-medium" />
                        <th className="py-1 pr-3 font-medium">#</th>
                        <th className="py-1 pr-3 font-medium">Value</th>
                        <th className="py-1 pr-3 font-medium">Status</th>
                        <th className="py-1 pr-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.valid.map((v, i) => (
                        <tr key={`v-${v}`} className="border-t border-edge/50">
                          <td className="py-1 pl-2 pr-1">
                            <input type="checkbox" checked={selected.has(v)} onChange={() => toggleSelected(v)} aria-label={`Select ${v}`} />
                          </td>
                          <td className="py-1 pr-3 font-mono text-ink-3">{i + 1}</td>
                          <td className="py-1 pr-3 font-mono text-ink">{v}</td>
                          <td className="py-1 pr-3">
                            <StatusBadge tone="good" label="valid" />
                          </td>
                          <td className="py-1 pr-3 text-ink-3">—</td>
                        </tr>
                      ))}
                      {previewResult.invalid.map((v, i) => (
                        <tr key={`i-${v.value}-${i}`} className="border-t border-edge/50">
                          <td className="py-1 pl-2 pr-1" />
                          <td className="py-1 pr-3 font-mono text-ink-3">{previewResult.valid.length + i + 1}</td>
                          <td className="py-1 pr-3 font-mono text-ink">{v.value}</td>
                          <td className="py-1 pr-3">
                            <StatusBadge tone="critical" label="invalid" />
                          </td>
                          <td className="py-1 pr-3 text-ink-2">{v.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export function ScopesConsole() {
  const { can } = useAuth();
  const scopes = useSWR<ScopeList>('/scopes');
  const canManage = can('scopes:manage');
  const syncConfig = useSWR<ScopeSyncConfig>(canManage ? '/scopes/sync-config' : null);
  const defaultSyncUrl = syncConfig.data?.url ?? null;

  return (
    <div>
      <PageHeader
        title="Scope Management"
        summary="Network operations may only target hosts inside one active scope. Every job is checked against these scopes on the server, again at approval time, and the scope is recorded on the job."
      />
      <div className="space-y-3 p-4">
        {scopes.error ? <ErrorNotice error={scopes.error} /> : null}
        <Panel title="Scopes" subtitle={scopes.data ? `${scopes.data.items.filter((s) => s.active).length} active of ${scopes.data.items.length}` : undefined}>
          {!scopes.data && !scopes.error ? <Skeleton className="h-24 w-full" /> : null}
          {scopes.data?.items.length === 0 ? <p className="text-[12px] text-ink-3">No scopes yet. Network operations are refused until an approved scope covers their targets.</p> : null}
          {scopes.data && scopes.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="py-1.5 pr-3 font-medium">Scope</th>
                    <th className="py-1.5 pr-3 font-medium">Targets</th>
                    <th className="py-1.5 pr-3 font-medium">Addresses</th>
                    <th className="py-1.5 pr-3 font-medium">State</th>
                    <th className="py-1.5 pr-3 font-medium">Owner</th>
                    <th className="py-1.5 pr-3 font-medium">Jobs</th>
                    <th className="py-1.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {scopes.data.items.map((s) => (
                    <ScopeRow key={s.id} scope={s} canManage={canManage} onChanged={() => scopes.mutate()} defaultSyncUrl={defaultSyncUrl} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
        {canManage ? (
          <Panel title="New scope" subtitle="Only add systems you own or have written permission to test">
            <CreateScope onCreated={() => scopes.mutate()} />
          </Panel>
        ) : (
          <p className="text-[12px] text-ink-3">Creating and changing scopes requires the OPERATOR or ADMIN role.</p>
        )}
      </div>
    </div>
  );
}
