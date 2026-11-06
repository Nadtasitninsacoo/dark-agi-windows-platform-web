import type { ReactNode } from 'react';

export function PageHeader({ title, summary, actions }: { title: string; summary: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-edge px-5 py-4">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 max-w-3xl text-[12.5px] text-ink-2">{summary}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
