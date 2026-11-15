'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Scope } from '@/lib/api/client';

export type ScopePickResolution =
  | { readonly mode: 'single'; readonly targets: string[] }
  | { readonly mode: 'sequence'; readonly perScope: readonly { scope: Scope; targets: string[] }[] };

/**
 * Shown whenever auto-resolution can't guess a target because more than one Scope is active (see
 * ExecutionService.autoResolveTargets's "one gate, one condition" rule) -- instead of leaving the operator
 * to go find out what's active and retype it by hand, click to pick. Picking exactly one behaves like the
 * existing single-scope lock. Picking several asks one more question: run together (one job, merged
 * targets) or one at a time (a real Job Sequence, scope by scope) -- both already fully supported paths,
 * nothing new on the backend. Purely presentational: it never calls the API itself, the caller decides
 * what "resolved" means (fill a field vs. submit immediately).
 */
export function ScopeTargetPicker({ scopes, fieldType, onResolve }: { scopes: readonly Scope[]; fieldType: 'targets' | 'single'; onResolve: (result: ScopePickResolution) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const selectable = (s: Scope) => fieldType === 'targets' || s.targets.length === 1;
  const selected = scopes.filter((s) => checked.has(s.id));

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setChecked(new Set(scopes.filter(selectable).map((s) => s.id)));

  const runTogether = () => onResolve({ mode: 'single', targets: [...new Set(selected.flatMap((s) => s.targets))] });
  const runSequence = () => onResolve({ mode: 'sequence', perScope: selected.map((s) => ({ scope: s, targets: s.targets })) });
  const useSingle = () => onResolve({ mode: 'single', targets: selected[0]!.targets });

  return (
    <div className="space-y-1.5 rounded border border-edge-strong bg-canvas/60 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-3">{scopes.length} scopes active — pick which to use</p>
        <button type="button" className="text-[11px] text-accent hover:underline" onClick={selectAll}>
          Select all
        </button>
      </div>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {scopes.map((s) => {
          const disabled = !selectable(s);
          return (
            <li key={s.id}>
              <label className={`flex items-start gap-1.5 text-[11.5px] ${disabled ? 'text-ink-3 opacity-60' : 'text-ink-2'}`}>
                <input type="checkbox" className="mt-0.5" disabled={disabled} checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                <span>
                  <span className="text-ink">{s.name}</span> — {s.targets.length} target{s.targets.length === 1 ? '' : 's'}: <span className="font-mono text-[11px]">{s.targets.slice(0, 3).join(', ')}{s.targets.length > 3 ? ', …' : ''}</span>
                  {disabled ? <span className="block text-[10.5px]">has {s.targets.length} targets — needs a multi-target field</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {selected.length === 1 ? (
        <Button variant="primary" onClick={useSingle}>
          Use this scope&apos;s targets
        </Button>
      ) : selected.length >= 2 ? (
        <div className="flex flex-wrap items-center gap-2">
          {fieldType === 'targets' ? (
            <Button variant="primary" onClick={runTogether}>
              Run together ({[...new Set(selected.flatMap((s) => s.targets))].length} targets)
            </Button>
          ) : null}
          <Button onClick={runSequence}>Run one at a time ({selected.length}-step sequence)</Button>
          {fieldType === 'single' ? <span className="text-[11px] text-ink-3">A single-host field can&apos;t hold {selected.length} hosts at once — only sequencing is offered.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
