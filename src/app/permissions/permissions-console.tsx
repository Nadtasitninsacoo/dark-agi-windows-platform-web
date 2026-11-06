'use client';

import { Check, Minus, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type User, type UserCreateRequest, type UserList, type UserUpdateRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const ROLES: User['role'][] = ['ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER'];
const send = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function RoleMatrix({ roles }: { roles: UserList['roles'] }) {
  const permissions = roles.find((r) => r.role === 'ADMIN')?.permissions ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr className="border-b border-edge">
            <th className="py-1.5 pr-3 font-medium">Permission</th>
            {roles.map((r) => (
              <th key={r.role} className="py-1.5 pr-3 text-center font-medium">
                {r.role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p} className="border-b border-edge/60 last:border-0">
              <td className="py-1 pr-3 font-mono text-ink-2">{p}</td>
              {roles.map((r) => (
                <td key={r.role} className="py-1 pr-3 text-center">
                  {r.permissions.includes(p) ? (
                    <Check className="mx-auto size-3.5 text-good" aria-label="granted" />
                  ) : (
                    <Minus className="mx-auto size-3.5 text-ink-3" aria-label="not granted" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 space-y-0.5 text-[11.5px] text-ink-2">
        {roles.map((r) => (
          <li key={r.role}>
            <span className="font-semibold text-ink">{r.role}</span> — {r.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateUser({ onCreated }: { onCreated: () => Promise<unknown> }) {
  const empty: UserCreateRequest = { username: '', displayName: '', role: 'VIEWER', password: '' };
  const [form, setForm] = useState<UserCreateRequest>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<User>('/users', send('POST', form));
      setForm(empty);
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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <input className={inputClass} placeholder="username" autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className={inputClass} placeholder="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input className={inputClass} type="password" placeholder="Initial password (12+ chars)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button type="submit" variant="primary" busy={busy} disabled={!form.username || !form.displayName || form.password.length < 12}>
        <UserPlus className="size-3.5" aria-hidden /> Create user
      </Button>
    </form>
  );
}

function UserRow({ user, self, onChanged }: { user: User; self: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');

  const update = async (body: UserUpdateRequest) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<User>(`/users/${user.id}`, send('PATCH', body));
      await onChanged();
      setResetting(false);
      setPassword('');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-edge/60 align-top last:border-0">
      <td className="py-1.5 pr-3">
        <div className="text-ink">{user.displayName}</div>
        <div className="font-mono text-[11px] text-ink-3">
          {user.username}
          {self ? ' (you)' : ''}
        </div>
        {error ? (
          <div className="mt-1">
            <ErrorNotice error={error} />
          </div>
        ) : null}
      </td>
      <td className="py-1.5 pr-3">
        <select
          className={`${inputClass} w-auto`}
          value={user.role}
          disabled={busy || self}
          aria-label={`Role of ${user.username}`}
          onChange={(e) => void update({ role: e.target.value as User['role'] })}
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-3">
        <div className="flex flex-wrap gap-1">
          {user.disabled ? <StatusBadge tone="neutral" label="Disabled" /> : <StatusBadge tone="good" label="Active" />}
          {user.locked ? <StatusBadge tone="warning" label="Locked" /> : null}
        </div>
      </td>
      <td className="py-1.5 pr-3 font-mono text-ink-2">{user.activeSessions}</td>
      <td className="py-1.5 pr-3 text-ink-3">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'never'}</td>
      <td className="py-1.5 text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          {user.locked ? (
            <Button busy={busy} onClick={() => void update({ unlock: true })}>
              Unlock
            </Button>
          ) : null}
          {!self ? (
            <Button busy={busy} onClick={() => void update({ disabled: !user.disabled })}>
              {user.disabled ? 'Enable' : 'Disable'}
            </Button>
          ) : null}
          {resetting ? (
            <span className="flex gap-1.5">
              <input className={`${inputClass} w-44`} type="password" placeholder="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button variant="primary" busy={busy} disabled={password.length < 12} onClick={() => void update({ password })}>
                Set
              </Button>
              <Button onClick={() => setResetting(false)}>Cancel</Button>
            </span>
          ) : (
            <Button onClick={() => setResetting(true)}>Reset password</Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PermissionsConsole() {
  const { user: me, can } = useAuth();
  const allowed = can('users:manage');
  const users = useSWR<UserList>(allowed ? '/users' : null);

  return (
    <div>
      <PageHeader
        title="Permissions"
        summary="Local accounts and role-based access control. Every API route requires a specific permission, enforced by the backend; changes to roles, passwords and account state end the user's sessions and are audited."
      />
      <div className="space-y-3 p-4">
        {!allowed ? (
          <Panel title="Your access">
            <p className="text-[12px] text-ink-2">
              You are signed in as <span className="font-semibold text-ink">{me.username}</span> with the <span className="font-semibold text-ink">{me.role}</span> role. User
              management requires an administrator.
            </p>
            <p className="mt-2 flex flex-wrap gap-1">
              {me.permissions.map((p) => (
                <span key={p} className="rounded border border-edge px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
                  {p}
                </span>
              ))}
            </p>
          </Panel>
        ) : (
          <>
            {users.error ? <ErrorNotice error={users.error} /> : null}
            <Panel title="Users" subtitle={users.data ? `${users.data.items.length} accounts` : undefined}>
              {!users.data && !users.error ? <Skeleton className="h-24 w-full" /> : null}
              {users.data ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                      <tr className="border-b border-edge">
                        <th className="py-1.5 pr-3 font-medium">User</th>
                        <th className="py-1.5 pr-3 font-medium">Role</th>
                        <th className="py-1.5 pr-3 font-medium">State</th>
                        <th className="py-1.5 pr-3 font-medium">Sessions</th>
                        <th className="py-1.5 pr-3 font-medium">Last sign-in</th>
                        <th className="py-1.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.data.items.map((u) => (
                        <UserRow key={u.id} user={u} self={u.id === me.id} onChanged={() => users.mutate()} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Panel>
            <Panel title="Add user">
              <CreateUser onCreated={() => users.mutate()} />
            </Panel>
            {users.data ? (
              <Panel title="Role permissions" subtitle="Fixed in the backend; reviewed with the code">
                <RoleMatrix roles={users.data.roles} />
              </Panel>
            ) : null}
          </>
        )}
        <Panel title="Not yet available" subtitle="Delivered with the execution engine (Phase 4)">
          <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-ink-2">
            <li>Operation allow-lists per role and per agent</li>
            <li>Human approval workflow for sensitive operations</li>
            <li>Authorized target scopes enforced on every tool execution</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
