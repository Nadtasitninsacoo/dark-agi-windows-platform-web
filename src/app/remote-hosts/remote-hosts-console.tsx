'use client';

import { Check, KeyRound, Plus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { apiRequest, type RemoteHost, type RemoteHostList } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const send = (method: string, body?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

const STATUS: Record<RemoteHost['status'], { tone: StatusTone; label: string }> = {
  PENDING_APPROVAL: { tone: 'warning', label: 'Pending approval' },
  APPROVED: { tone: 'good', label: 'Approved' },
  REVOKED: { tone: 'critical', label: 'Revoked' },
};

function CreateRemoteHost({ onCreated }: { onCreated: () => Promise<unknown> }) {
  const [host, setHost] = useState('');
  const [label, setLabel] = useState('');
  const [setCredentialNow, setSetCredentialNow] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<RemoteHost>(
        '/remote-hosts',
        send('POST', { host: host.trim(), label: label.trim() || undefined, ...(setCredentialNow ? { username: username.trim(), password } : {}) }),
      );
      setHost('');
      setLabel('');
      setSetCredentialNow(false);
      setUsername('');
      setPassword('');
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
        <input className={inputClass} placeholder="Host or IP, e.g. 10.0.0.12 or dc01.lab.local" value={host} onChange={(e) => setHost(e.target.value)} />
        <input className={inputClass} placeholder="Label (optional), e.g. lab-dc01" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <label className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
        <input type="checkbox" checked={setCredentialNow} onChange={(e) => setSetCredentialNow(e.target.checked)} />
        Set its credential now (optional — can also be set later, from here or when first submitting a job against it)
      </label>
      {setCredentialNow ? (
        <div className="grid gap-2 md:grid-cols-2">
          <input className={inputClass} placeholder="Username, e.g. LAB\svc-dagi" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      ) : null}
      <Button type="submit" variant="primary" busy={busy} disabled={host.trim().length === 0 || (setCredentialNow && (username.trim().length === 0 || password.length === 0))}>
        <Plus className="size-3.5" aria-hidden /> Register host
      </Button>
    </form>
  );
}

function SetCredentialForm({ host, onDone }: { host: RemoteHost; onDone: () => Promise<unknown> }) {
  const [username, setUsername] = useState(host.credentialUsername ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<RemoteHost>(`/remote-hosts/${host.id}/credential`, send('POST', { username: username.trim(), password }));
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mt-1.5 flex flex-wrap items-center gap-1.5" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      <input className={`${inputClass} w-auto`} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input className={`${inputClass} w-auto`} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" variant="primary" busy={busy} disabled={username.trim().length === 0 || password.length === 0}>
        {host.hasCredential ? 'Rotate credential' : 'Set credential'}
      </Button>
    </form>
  );
}

function RemoteHostRow({ host, canManage, onChanged }: { host: RemoteHost; canManage: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editingCredential, setEditingCredential] = useState(false);
  const s = STATUS[host.status];

  const act = async (path: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<RemoteHost>(`/remote-hosts/${host.id}${path}`, send('POST'));
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-edge/60 align-top last:border-0">
      <td className="py-2 pr-3">
        <div className="font-mono font-semibold text-ink">{host.host}</div>
        {host.label ? <div className="text-[11.5px] text-ink-3">{host.label}</div> : null}
        {error ? (
          <div className="mt-1">
            <ErrorNotice error={error} />
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-3">
        <StatusBadge tone={s.tone} label={s.label} />
      </td>
      <td className="py-2 pr-3">
        {host.hasCredential ? (
          <div>
            <StatusBadge tone="good" label="On file" />
            <div className="mt-0.5 font-mono text-[11px] text-ink-3">{host.credentialUsername}</div>
          </div>
        ) : (
          <StatusBadge tone="warning" label="None yet" />
        )}
        {canManage && editingCredential ? <SetCredentialForm host={host} onDone={async () => { setEditingCredential(false); await onChanged(); }} /> : null}
      </td>
      <td className="py-2 pr-3 text-ink-2">{host.createdBy}</td>
      <td className="py-2 pr-3 text-ink-3">{formatDateTime(host.createdAt)}</td>
      <td className="py-2 text-right">
        {canManage ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {!editingCredential ? (
              <Button onClick={() => setEditingCredential(true)}>
                <KeyRound className="size-3.5" aria-hidden /> {host.hasCredential ? 'Rotate' : 'Set'} credential
              </Button>
            ) : null}
            {host.status === 'PENDING_APPROVAL' ? (
              <Button variant="primary" busy={busy} onClick={() => void act('/approve')}>
                <Check className="size-3.5" aria-hidden /> Approve
              </Button>
            ) : null}
            {host.status !== 'REVOKED' ? (
              <Button busy={busy} onClick={() => void act('/revoke')}>
                <X className="size-3.5" aria-hidden /> Revoke
              </Button>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function RemoteHostsConsole() {
  const { can } = useAuth();
  const hosts = useSWR<RemoteHostList>('/remote-hosts');
  const canManage = can('hosts:manage');

  return (
    <div>
      <PageHeader
        title="Remote Hosts"
        summary="A separate authorization from Scope: Scope says an address is OK to touch at all (e.g. port-scan); a Remote Host, once approved and credentialed, says this platform may additionally run PowerShell diagnostics on it. Every remote job still needs the target inside an active scope too, and still pauses for a human to approve it, exactly like any other high-risk job."
      />
      <div className="space-y-3 p-4">
        {hosts.error ? <ErrorNotice error={hosts.error} /> : null}
        <Panel title="Hosts" subtitle={hosts.data ? `${hosts.data.items.filter((h) => h.status === 'APPROVED').length} approved of ${hosts.data.items.length}` : undefined}>
          {!hosts.data && !hosts.error ? <Skeleton className="h-24 w-full" /> : null}
          {hosts.data?.items.length === 0 ? <p className="text-[12px] text-ink-3">No remote hosts registered yet.</p> : null}
          {hosts.data && hosts.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="py-1.5 pr-3 font-medium">Host</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium">Credential</th>
                    <th className="py-1.5 pr-3 font-medium">Registered by</th>
                    <th className="py-1.5 pr-3 font-medium">Registered</th>
                    <th className="py-1.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {hosts.data.items.map((h) => (
                    <RemoteHostRow key={h.id} host={h} canManage={canManage} onChanged={() => hosts.mutate()} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
        {canManage ? (
          <Panel title="Register a remote host" subtitle="Only add machines you own or have written permission to administer — WinRM must be enabled on the target">
            <CreateRemoteHost onCreated={() => hosts.mutate()} />
          </Panel>
        ) : (
          <p className="text-[12px] text-ink-3">Registering, approving and credentialing remote hosts requires the OPERATOR or ADMIN role.</p>
        )}
      </div>
    </div>
  );
}
