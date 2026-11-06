import { Construction } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { Panel, StatusBadge } from '@/components/ui';
import { MODULES, moduleBySlug } from '@/lib/modules';
import { DomainOperations } from './domain-operations';

/**
 * Security-domain and other catch-all module pages.
 *
 * A `live` domain with a tool-registry `category` renders its real executable
 * operations (DomainOperations). Everything else `planned` renders an honest
 * "not operational yet" placeholder — no simulated data, no inert controls.
 * Unknown slugs fall through to notFound().
 *
 * Metadata is static: the console sits behind the client-side sign-in gate, so a
 * params-dependent generateMetadata() would be the only request-time work in the
 * route. The per-module tab title is rendered as a React <title> (hoisted to <head>).
 */
export const metadata: Metadata = { title: 'Module' };

export function generateStaticParams() {
  return MODULES.filter((m) => m.group === 'Security Domains' || m.status === 'planned').map((m) => ({ module: m.slug }));
}

export default function ModulePage({ params }: PageProps<'/[module]'>) {
  return (
    <Suspense fallback={null}>
      <ModuleRouter params={params} />
    </Suspense>
  );
}

async function ModuleRouter({ params }: { params: PageProps<'/[module]'>['params'] }) {
  const { module } = await params;
  const mod = moduleBySlug(module);
  if (!mod) notFound();

  if (mod.status === 'live' && mod.category) {
    return <DomainOperations title={mod.title} summary={mod.summary} phase={mod.phase} category={mod.category} planned={mod.planned ?? []} />;
  }
  if (mod.status !== 'planned') notFound();

  return (
    <div>
      <title>{`${mod.title} · DARK AGI`}</title>
      <PageHeader title={mod.title} summary={mod.summary} actions={<StatusBadge tone="neutral" label={`Planned · Phase ${mod.phase}`} />} />
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <Panel title="Status">
          <div className="flex items-start gap-3">
            <Construction className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              This module is not operational yet. Its backend services are scheduled for <strong className="text-ink">Phase {mod.phase}</strong> of the
              delivery roadmap. Nothing on this page is simulated: once the backend APIs exist, this view will be connected to them.
            </p>
          </div>
        </Panel>
        <Panel title="Planned capabilities">
          <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-2">
            {mod.planned?.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
