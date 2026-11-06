'use client';

import { LogOut, ShieldHalf, UserRound } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import { StatusBadge } from '@/components/ui';
import { API_BASE_URL, type EngineStatus, type HealthReport } from '@/lib/api/client';
import { useAuth } from './auth';

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
      <ShieldHalf className="size-4 text-accent" aria-hidden />
      <span className="text-[13px] font-semibold tracking-wide">
        DARK AGI <span className="font-normal text-ink-3">· Windows Cyber Intelligence Platform</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <EngineBadge />
        {api}
        {db}
        <span className="hidden font-mono text-[11px] text-ink-3 lg:inline">{API_BASE_URL}</span>
        <UserMenu />
      </div>
    </header>
  );
}
