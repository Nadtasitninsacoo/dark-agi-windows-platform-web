'use client';

import { type FormEvent, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, KeyValue, Panel } from '@/components/ui';
import { apiRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink';

export function AccountConsole() {
  const { user, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await apiRequest('/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Account" summary="Your profile, permissions and password." actions={<Button onClick={() => void signOut()}>Sign out</Button>} />
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <Panel title="Profile">
          <dl className="text-[12px]">
            <KeyValue label="Username">{user.username}</KeyValue>
            <KeyValue label="Display name">{user.displayName}</KeyValue>
            <KeyValue label="Role">{user.role}</KeyValue>
            <KeyValue label="Session expires">{formatDateTime(user.sessionExpiresAt)}</KeyValue>
          </dl>
          <p className="mt-2 flex flex-wrap gap-1">
            {user.permissions.map((p) => (
              <span key={p} className="rounded border border-edge px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
                {p}
              </span>
            ))}
          </p>
        </Panel>
        <Panel title="Change password" subtitle="Signs out your other sessions">
          <form className="space-y-2" onSubmit={(e) => void submit(e)}>
            {error ? <ErrorNotice error={error} /> : null}
            {done ? <p className="text-[12px] text-good">Password changed. Other sessions were signed out.</p> : null}
            <input className={inputClass} type="password" placeholder="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <input className={inputClass} type="password" placeholder="New password (12+ characters)" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm !== '' && confirm !== next ? <p className="text-[11.5px] text-critical">Passwords do not match.</p> : null}
            <Button type="submit" variant="primary" busy={busy} disabled={!current || next.length < 12 || next !== confirm}>
              Change password
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
