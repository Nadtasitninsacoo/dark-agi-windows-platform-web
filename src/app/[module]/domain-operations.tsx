'use client';

import { Construction } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { OperationCard } from '@/components/operation-card';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import type { OperationList, ToolList } from '@/lib/api/client';

/**
 * A live security-domain page: every executable operation in one tool-registry
 * category, rendered exactly as the Command Reference does, plus the operations
 * still planned for that category. No simulated data — cards reflect real
 * availability from Tool discovery, and running one goes through the queue.
 */
export function DomainOperations({
  title,
  summary,
  phase,
  category,
  planned,
}: {
  title: string;
  summary: string;
  phase: number;
  category: string;
  planned: readonly string[];
}) {
  const { can } = useAuth();
  const operations = useSWR<OperationList>('/operations');
  const tools = useSWR<ToolList>('/tools');

  const ops = useMemo(() => (operations.data?.items ?? []).filter((o) => o.category === category), [operations.data, category]);
  const available = ops.filter((o) => o.available).length;

  const plannedOps = useMemo(
    () =>
      (tools.data?.items ?? [])
        .filter((t) => t.categories.some((c) => c === category))
        .flatMap((t) => t.operations.filter((o) => o.status === 'planned').map((o) => ({ tool: t.name, phase: t.integrationPhase, ...o })))
        .toSorted((a, b) => a.phase - b.phase || a.tool.localeCompare(b.tool)),
    [tools.data, category],
  );

  return (
    <div>
      <title>{`${title} · DARK AGI`}</title>
      <PageHeader
        title={title}
        summary={summary}
        actions={<StatusBadge tone="good" label={`Live · Phase ${phase}`} />}
      />
      <div className="space-y-3 p-4">
        {operations.error ? <ErrorNotice error={operations.error} /> : null}
        {!operations.data && !operations.error ? <Skeleton className="h-48 w-full" /> : null}

        {operations.data ? (
          <Panel title="Executable operations" subtitle={`${ops.length} operation${ops.length === 1 ? '' : 's'} · ${available} ready on this machine`}>
            {ops.length === 0 ? (
              <p className="text-[12px] text-ink-3">No executable operations in this domain yet.</p>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {ops.map((op) => (
                  <OperationCard key={`${op.toolId}:${op.operationId}`} op={op} canSubmit={can('jobs:submit')} />
                ))}
              </div>
            )}
            {available === 0 && ops.length > 0 ? (
              <p className="mt-3 text-[11.5px] text-ink-3">
                None of these are ready yet — open{' '}
                <Link href="/tools" className="text-accent hover:underline">
                  Tool Registry
                </Link>{' '}
                and run <strong>Discover tools</strong> so the platform can find the installed programs.
              </p>
            ) : null}
            {ops.some((o) => o.targetKind === 'network') ? (
              <p className="mt-2 text-[11.5px] text-ink-3">
                Network operations only run against addresses inside one active{' '}
                <Link href="/scopes" className="text-accent hover:underline">
                  approved scope
                </Link>
                .
              </p>
            ) : null}
          </Panel>
        ) : null}

        {planned.length > 0 ? (
          <Panel title="Planned capabilities" subtitle="Scheduled for later phases — listed so the roadmap is explicit">
            <div className="flex items-start gap-3">
              <Construction className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
              <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-2">
                {planned.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Panel>
        ) : null}

        {plannedOps.length > 0 ? (
          <Panel title="Planned operations" subtitle={`${plannedOps.length} operation${plannedOps.length === 1 ? '' : 's'} arrive with their tool adapters`}>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-panel text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Phase</th>
                    <th className="py-1 pr-3 font-medium">Tool</th>
                    <th className="py-1 pr-3 font-medium">Operation</th>
                    <th className="py-1 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-ink-2">
                  {plannedOps.map((o) => (
                    <tr key={`${o.tool}:${o.id}`} className="border-t border-edge/50">
                      <td className="py-1 pr-3 font-mono">P{o.phase}</td>
                      <td className="py-1 pr-3">{o.tool}</td>
                      <td className="py-1 pr-3 font-mono">{o.id}</td>
                      <td className="py-1">{o.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
