'use client';

import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { Button, ErrorNotice } from '@/components/ui';
import { apiRequest, type RemoteHost, type RemoteHostList } from '@/lib/api/client';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/**
 * Asked only the moment an operator picks an approved host that has no credential on file yet — a host
 * that already has one just works, no popup at all. Submitting here calls the same
 * POST /remote-hosts/:id/credential the Remote Hosts admin page itself uses, so the stored credential is
 * identical either way; this is purely a convenience for not having to leave the submit form first.
 */
function CredentialPrompt({ host, onDone, onCancel }: { host: RemoteHost; onDone: () => void; onCancel: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<RemoteHost>(`/remote-hosts/${host.id}/credential`, post({ username: username.trim(), password }));
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded border border-edge-strong bg-panel-2 p-4 shadow-xl">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <KeyRound className="size-4 text-accent" aria-hidden />
          Credential needed for {host.label ?? host.host}
        </p>
        <p className="mt-1 text-[11.5px] text-ink-3">
          This host (<span className="font-mono">{host.host}</span>) has no stored credential yet. Enter one now — it&apos;s saved for this host and reused next time, so this only
          happens once per host.
        </p>
        <form className="mt-3 space-y-2" onSubmit={(e) => void submit(e)}>
          {error ? <ErrorNotice error={error} /> : null}
          <input className={inputClass} placeholder="Username, e.g. LAB\svc-dagi" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex justify-end gap-1.5">
            <Button type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" busy={busy} disabled={username.trim().length === 0 || password.length === 0}>
              Save and continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Renders an operation's `remoteHost` field as a picker over the operator's own APPROVED hosts — never
 * free text, so a job can only ever reference a host that's actually been through the approval step.
 * Picking one without a credential on file pops the prompt above before the pick actually takes; picking
 * one that already has a credential just works immediately, no popup.
 */
export function RemoteHostField({ value, onChange }: { value: string; onChange: (remoteHostId: string) => void }) {
  const hosts = useSWR<RemoteHostList>('/remote-hosts?status=APPROVED');
  const [pendingCredential, setPendingCredential] = useState<RemoteHost | null>(null);

  const pick = (id: string) => {
    const host = hosts.data?.items.find((h) => h.id === id);
    if (host && !host.hasCredential) {
      setPendingCredential(host);
      return;
    }
    onChange(id);
  };

  return (
    <>
      <select className={inputClass} value={value} onChange={(e) => pick(e.target.value)}>
        <option value="" disabled>
          {hosts.data ? 'Pick an approved host…' : 'Loading hosts…'}
        </option>
        {hosts.data?.items.map((h) => (
          <option key={h.id} value={h.id}>
            {h.label ?? h.host} ({h.host}){h.hasCredential ? '' : ' — needs a credential'}
          </option>
        ))}
      </select>
      {hosts.data && hosts.data.items.length === 0 ? <p className="text-[11px] text-ink-3">No approved remote hosts yet — register and approve one on the Remote Hosts page first.</p> : null}
      {pendingCredential ? (
        <CredentialPrompt
          host={pendingCredential}
          onCancel={() => setPendingCredential(null)}
          onDone={() => {
            onChange(pendingCredential.id);
            setPendingCredential(null);
            void hosts.mutate();
          }}
        />
      ) : null}
    </>
  );
}
