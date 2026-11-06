'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULE_ICONS } from '@/components/icons';
import { MODULES, type ConsoleModule } from '@/lib/modules';

const GROUPS: ConsoleModule['group'][] = ['Operations', 'AI', 'Security Domains', 'Execution', 'Governance'];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Console" className="flex h-full flex-col gap-3 overflow-y-auto px-2 py-3">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-3">{group}</p>
          <ul className="space-y-px">
            {MODULES.filter((m) => m.group === group).map((m) => {
              const Icon = MODULE_ICONS[m.icon];
              const active = m.href === '/' ? pathname === '/' : pathname === m.href || pathname.startsWith(`${m.href}/`);
              return (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px] transition-colors ${
                      active ? 'bg-accent-strong/15 text-ink' : 'text-ink-2 hover:bg-panel-2 hover:text-ink'
                    }`}
                  >
                    <Icon className={`size-3.5 shrink-0 ${active ? 'text-accent' : ''}`} aria-hidden />
                    <span className="truncate">{m.title}</span>
                    {m.status === 'planned' ? (
                      <span className="ml-auto rounded border border-edge px-1 text-[9px] text-ink-3" title={`Delivered in phase ${m.phase}`}>
                        P{m.phase}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
