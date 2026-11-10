'use client';

import { LogOut, SquareTerminal, Target, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { StatusBadge } from '@/components/ui';
import { API_BASE_URL, apiRequest, type EngineStatus, type HealthReport, type ScopeList } from '@/lib/api/client';
import { useAuth } from './auth';
import { OPEN_TERMINAL_EVENT } from './floating-terminal';

/** Shows a prominent badge while the execution engine is emergency-stopped. */
function EngineBadge() {
  const { can } = useAuth();
  const { data } = useSWR<EngineStatus>(can('jobs:read') ? '/engine' : null, { refreshInterval: 10_000 });
  if (!data?.paused) return null;
  return (
    <Link href="/tasks">
      <StatusBadge tone="critical" label="ENGINE STOPPED" />
    </Link>
  );
}

/** A live "N awaiting approval" badge, visible on every page, plus a browser notification when
 * the count rises — a job can start waiting at any moment (an AI agent, an external API key,
 * someone else's session), not only while an approver happens to have Task Queue open. */
function ApprovalBadge() {
  const { can } = useAuth();
  const { data } = useSWR<EngineStatus>(can('jobs:approve') ? '/engine' : null, { refreshInterval: 10_000 });
  const count = data?.counts.AWAITING_APPROVAL ?? 0;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') void Notification.requestPermission();
      if (Notification.permission === 'granted') {
        new Notification('DARK AGI — approval needed', { body: `${count} job${count === 1 ? '' : 's'} awaiting approval`, tag: 'dagi-approval' });
      }
    }
    prevCount.current = count;
  }, [count]);

  if (count === 0) return null;
  return (
    <Link href="/tasks">
      <StatusBadge tone="warning" label={`${count} awaiting approval`} />
    </Link>
  );
}

/** One-click master switch for every Scope — by request, instead of visiting Scope Management and
 * disabling rows one at a time to get down to the single active scope auto-target resolution needs. */
function ScopesToggle() {
  const { can } = useAuth();
  const { data, mutate } = useSWR<ScopeList>(can('scopes:manage') ? '/scopes' : null, { refreshInterval: 15_000 });
  const [busy, setBusy] = useState(false);
  if (!data || data.items.length === 0) return null;
  const allEnabled = data.items.every((s) => s.enabled);
  const activeCount = data.items.filter((s) => s.active).length;

  const toggle = async () => {
    setBusy(true);
    try {
      await apiRequest('/scopes/set-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !allEnabled }) });
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      title={allEnabled ? `Disable all ${data.items.length} scopes` : `Enable all ${data.items.length} scopes`}
      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[12px] disabled:opacity-50 ${
        allEnabled ? 'border-accent-strong/60 bg-accent-strong/10 text-ink hover:bg-accent-strong/20' : 'border-edge-strong text-ink-3 hover:bg-panel-2'
      }`}
    >
      <Target className={`size-3.5 ${allEnabled ? 'text-accent' : ''}`} aria-hidden />
      <span className="hidden sm:inline">
        Scopes: {activeCount}/{data.items.length} active
      </span>
    </button>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex items-center gap-2 border-l border-edge pl-3">
      <Link href="/account" className="flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink" title="Account">
        <UserRound className="size-3.5" aria-hidden />
        <span>{user.displayName}</span>
        <span className="rounded border border-edge px-1 text-[10px] text-ink-3">{user.role}</span>
      </Link>
      <button type="button" onClick={() => void signOut()} className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink" title="Sign out">
        <LogOut className="size-3.5" aria-hidden />
        <span className="sr-only md:not-sr-only">Sign out</span>
      </button>
    </div>
  );
}

/** Backend + database status from GET /api/v1/health, polled every 10 s. */
export function TopBar() {
  const { data, error, isLoading } = useSWR<HealthReport>('/health', { refreshInterval: 10_000 });

  let api = <StatusBadge tone="pending" label="API: connecting" />;
  let db = null;
  if (error) {
    api = <StatusBadge tone="critical" label="API: unreachable" />;
  } else if (data) {
    api = <StatusBadge tone="good" label={`API v${data.version}`} />;
    db = data.checks.database.reachable ? (
      <StatusBadge tone="good" label={`PostgreSQL ${data.checks.database.serverVersion ?? ''}`.trim()} />
    ) : (
      <StatusBadge tone="critical" label="Database down" />
    );
  } else if (!isLoading) {
    api = <StatusBadge tone="neutral" label="API: unknown" />;
  }

  return (
    <header className="flex h-11 items-center gap-3 border-b border-edge bg-panel px-4">
      <div
        className="rounded-md p-px"
        style={{
          background:
            'conic-gradient(from var(--dagi-angle), transparent 0%, transparent 78%, rgb(46 232 143 / 0.9) 92%, rgb(190 255 225) 95%, rgb(46 232 143 / 0.9) 98%, transparent 100%)',
          animation: 'dagi-border-spin 3.5s linear infinite',
        }}
      >
        <Image
          src="/dark-agi-logo-small.png"
          alt=""
          width={99}
          height={72}
          className="h-7 w-auto rounded-[calc(0.375rem-1px)] bg-canvas/60"
          priority
        />
      </div>
      <span className="text-[13px] font-semibold tracking-wide">
        DARK AGI <span className="font-normal text-ink-3">· Windows Cyber Intelligence Platform</span>
      </span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_TERMINAL_EVENT))}
        className="flex items-center gap-1.5 rounded border border-accent-strong/60 bg-accent-strong/10 px-2 py-1 text-[12px] text-ink hover:bg-accent-strong/20"
        title="Open the DARK AGI terminal (floating window)"
      >
        <SquareTerminal className="size-3.5 text-accent" aria-hidden />
        <span className="hidden sm:inline">Terminal</span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <ScopesToggle />
        <EngineBadge />
        <ApprovalBadge />
        {api}
        {db}
        <span className="hidden font-mono text-[11px] text-ink-3 lg:inline">{API_BASE_URL}</span>
        <UserMenu />
      </div>
    </header>
  );
}
