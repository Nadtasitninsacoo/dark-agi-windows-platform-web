'use client';

import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type Scope, type ScopeCreateRequest, type ScopeList } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const send = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const splitTargets = (text: string): string[] => text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);

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

function ScopeRow({ scope, canManage, onChanged }: { scope: Scope; canManage: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState(scope.targets.join('\n'));

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

  return (
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
          <ul className="font-mono text-[11.5px] text-ink-2">
            {scope.targets.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
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
          <div className="flex justify-end gap-1.5">
            <Button onClick={() => setEditing(true)}>Edit targets</Button>
            <Button busy={busy} onClick={() => void update({ enabled: !scope.enabled })}>
              {scope.enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function ScopesConsole() {
  const { can } = useAuth();
  const scopes = useSWR<ScopeList>('/scopes');
  const canManage = can('scopes:manage');

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
                    <ScopeRow key={s.id} scope={s} canManage={canManage} onChanged={() => scopes.mutate()} />
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
