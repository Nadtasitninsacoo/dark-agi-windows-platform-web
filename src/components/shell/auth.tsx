'use client';

import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Button, ErrorNotice } from '@/components/ui';
import { ApiError, apiRequest, type AuthStatus, type CurrentUser, type Permission, UNAUTHORIZED_EVENT } from '@/lib/api/client';

interface AuthContextValue {
  readonly user: CurrentUser;
  readonly can: (permission: Permission) => boolean;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in user. Only usable below <AuthGate>. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthGate>');
  return value;
}

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2.5 py-1.5 text-[13px] text-ink';
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function Card({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-canvas p-6">
      {/* Decorative background only — never a stand-in for real system activity. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(46 232 143 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(46 232 143 / 0.05) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(46 232 143 / 0.16), transparent 65%)', animation: 'dagi-pulse 6s ease-in-out infinite' }}
        />
        <div
          className="absolute inset-x-0 h-32"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgb(46 232 143 / 0.06) 42%, rgb(46 232 143 / 0.1) 50%, rgb(46 232 143 / 0.06) 58%, transparent)',
            animation: 'dagi-scanline 7s linear infinite',
          }}
        />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <Image src="/dark-agi-logo.png" alt="DARK AGI WINDOWS" width={1001} height={725} priority className="mb-2 h-auto w-64 drop-shadow-[0_0_28px_rgba(46,232,143,0.35)]" />
        <div className="w-full rounded-md border border-edge-strong bg-panel/90 p-5 shadow-[0_0_40px_-12px_rgb(46_232_143_/_0.25)] backdrop-blur-sm">
          <div className="mb-4">
            <h1 className="text-[15px] font-semibold tracking-wide text-ink">{title}</h1>
            <p className="font-mono text-[11px] tracking-wider text-ink-3 uppercase">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[11.5px] text-ink-2">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** A password input with a show/hide toggle — masked fields hide typos, and this was the actual cause of more than one "wrong password" report. */
function PasswordInput({ value, onChange, autoComplete, autoFocus }: { value: string; onChange: (value: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-9`}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-ink-3 hover:text-ink-2"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
      </button>
    </div>
  );
}

function LoginScreen({ onSignedIn }: { onSignedIn: () => Promise<unknown> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<CurrentUser>('/auth/login', json({ username, password }));
      setPassword('');
      await onSignedIn();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Sign in" subtitle="DARK AGI · Windows Cyber Intelligence Platform">
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        {error ? <ErrorNotice error={error} /> : null}
        <Field label="Username">
          <input className={inputClass} autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password">
          <PasswordInput autoComplete="current-password" value={password} onChange={setPassword} />
        </Field>
        <Button type="submit" variant="primary" busy={busy}>
          Sign in
        </Button>
      </form>
    </Card>
  );
}

function SetupScreen({ tokenFile, onDone }: { tokenFile: string | null; onDone: () => Promise<unknown> }) {
  const [form, setForm] = useState({ token: '', username: '', displayName: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mismatch = form.confirm !== '' && form.password !== form.confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, username, displayName, password } = form;
      await apiRequest<CurrentUser>('/auth/setup', json({ token: token.trim(), username, displayName, password }));
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Create the administrator account" subtitle="First-run setup — there are no default credentials">
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div className="flex gap-2 rounded border border-edge bg-canvas/60 p-2.5 text-[11.5px] text-ink-2">
          <KeyRound className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            Paste the one-time setup token from{' '}
            <code className="break-all font-mono text-ink">{tokenFile ?? 'the backend data directory (setup-token.txt)'}</code>. The launcher also prints it on start.
          </span>
        </div>
        {error ? <ErrorNotice error={error} /> : null}
        <Field label="Setup token">
          <input className={`${inputClass} font-mono`} autoComplete="off" value={form.token} onChange={set('token')} />
        </Field>
        <Field label="Username (3–32 characters)">
          <input className={inputClass} autoComplete="username" value={form.username} onChange={set('username')} />
        </Field>
        <Field label="Display name">
          <input className={inputClass} value={form.displayName} onChange={set('displayName')} />
        </Field>
        <Field label="Password (at least 12 characters)">
          <PasswordInput autoComplete="new-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />
        </Field>
        <Field label="Confirm password">
          <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(v) => setForm((f) => ({ ...f, confirm: v }))} />
        </Field>
        {mismatch ? <p className="text-[11.5px] text-critical">Passwords do not match.</p> : null}
        <Button
          type="submit"
          variant="primary"
          busy={busy}
          disabled={!form.token || !form.username || !form.displayName || form.password.length < 12 || form.password !== form.confirm}
        >
          Create administrator
        </Button>
      </form>
    </Card>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full items-center justify-center p-6 text-[12.5px] text-ink-3">{children}</div>;
}

/**
 * Renders the console only for a signed-in user; otherwise first-run setup or
 * sign-in. Authorization is enforced by the backend — this only decides what to show.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mutate: mutateAll } = useSWRConfig();
  const me = useSWR<CurrentUser>('/auth/me', { shouldRetryOnError: false, revalidateOnFocus: true });
  const unauthenticated = me.error instanceof ApiError && me.error.status === 401;
  const status = useSWR<AuthStatus>(unauthenticated ? '/auth/status' : null);

  useEffect(() => {
    const onUnauthorized = () => void me.mutate();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [me]);

  const signedIn = useCallback(async () => {
    // Drop every cached response from a previous session, then load the new user.
    await mutateAll(() => true, undefined, { revalidate: false });
    await Promise.all([me.mutate(), status.mutate()]);
  }, [mutateAll, me, status]);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      await mutateAll(() => true, undefined, { revalidate: false });
      await me.mutate();
    }
  }, [mutateAll, me]);

  const value = useMemo<AuthContextValue | null>(
    () => (me.data ? { user: me.data, can: (p) => me.data!.permissions.includes(p), signOut } : null),
    [me.data, signOut],
  );

  if (value && !unauthenticated) return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  if (me.error && !unauthenticated) {
    return (
      <CenteredMessage>
        <div className="w-full max-w-md">
          <ErrorNotice error={me.error} />
        </div>
      </CenteredMessage>
    );
  }
  if (unauthenticated && status.data) {
    return status.data.setupRequired ? <SetupScreen tokenFile={status.data.setupTokenFile} onDone={signedIn} /> : <LoginScreen onSignedIn={signedIn} />;
  }
  return (
    <CenteredMessage>
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Checking session…
    </CenteredMessage>
  );
}
