'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Scope } from '@/lib/api/client';

/** POST /sequences caps at 20 steps (SequenceCreateSchema) -- a real, deliberate limit, not a UI choice. */
const MAX_SEQUENCE_STEPS = 20;

export type ScopePickResolution =
  | { readonly mode: 'single'; readonly targets: string[] }
  | { readonly mode: 'sequence'; readonly steps: readonly { readonly label: string; readonly targets: string[] }[] };

/**
 * Shown whenever auto-resolution can't guess a target because more than one Scope is active (see
 * ExecutionService.autoResolveTargets's "one gate, one condition" rule) -- instead of leaving the operator
 * to go find out what's active and retype it by hand, click to pick. Picking exactly one scope with exactly
 * one target behaves like the existing single-scope lock. Picking more gives two ways to proceed (field
 * depending): "together" merges every picked scope's targets into one job; "one at a time" creates a real
 * Job Sequence -- one step per scope for a multi-target ("targets") field, or one step per individual
 * target for a single-host field (which can never hold more than one value at once, so a scope with many
 * targets can still be used, just split into steps). Both are existing, already-reviewed paths: a bigger
 * target list on one job, or POST /sequences, a thin wrapper over the same ExecutionService.submit every
 * hand-typed job goes through. Purely presentational: it never calls the API itself.
 */
export function ScopeTargetPicker({ scopes, fieldType, onResolve }: { scopes: readonly Scope[]; fieldType: 'targets' | 'single'; onResolve: (result: ScopePickResolution) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const selected = scopes.filter((s) => checked.has(s.id));
  const allTargets = selected.flatMap((s) => s.targets);
  // A single-host field holds exactly one value regardless of how many scopes are picked, so "sequence by
  // individual target" is sized by the total target count, not the scope count.
  const perTargetSteps = selected.flatMap((s) => s.targets.map((t) => ({ label: `${s.name}: ${t}`, targets: [t] })));
  const tooManyForSequence = fieldType === 'single' ? perTargetSteps.length > MAX_SEQUENCE_STEPS : selected.length > MAX_SEQUENCE_STEPS;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setChecked(new Set(scopes.map((s) => s.id)));

  const runTogether = () => onResolve({ mode: 'single', targets: [...new Set(allTargets)] });
  const runSequenceByScope = () => onResolve({ mode: 'sequence', steps: selected.map((s) => ({ label: s.name, targets: s.targets })) });
  const runSequenceByTarget = () => onResolve({ mode: 'sequence', steps: perTargetSteps });
  const useSingle = () => onResolve({ mode: 'single', targets: fieldType === 'single' ? [allTargets[0]!] : selected[0]!.targets });

  // fieldType 'single': a lone pick resolves immediately only when it adds up to exactly one target --
  // picking one scope that itself has several targets still needs the sequence path below.
  const singleResolvable = fieldType === 'targets' ? selected.length === 1 : allTargets.length === 1;

  return (
    <div className="space-y-1.5 rounded border border-edge-strong bg-canvas/60 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-3">{scopes.length} scopes active — pick which to use</p>
        <button type="button" className="text-[11px] text-accent hover:underline" onClick={selectAll}>
          Select all
        </button>
      </div>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {scopes.map((s) => (
          <li key={s.id}>
            <label className="flex items-start gap-1.5 text-[11.5px] text-ink-2">
              <input type="checkbox" className="mt-0.5" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
              <span>
                <span className="text-ink">{s.name}</span> — {s.targets.length} target{s.targets.length === 1 ? '' : 's'}: <span className="font-mono text-[11px]">{s.targets.slice(0, 3).join(', ')}{s.targets.length > 3 ? ', …' : ''}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {selected.length === 0 ? null : singleResolvable ? (
        <Button variant="primary" onClick={useSingle}>
          Use this target
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {fieldType === 'targets' ? (
            <Button variant="primary" onClick={runTogether}>
              Run together ({[...new Set(allTargets)].length} targets)
            </Button>
          ) : null}
          {tooManyForSequence ? (
            <span className="text-[11px] text-critical">
              {fieldType === 'single' ? allTargets.length : selected.length} steps needed, but a sequence can hold at most {MAX_SEQUENCE_STEPS} — narrow your selection first.
            </span>
          ) : (
            <Button onClick={fieldType === 'single' ? runSequenceByTarget : runSequenceByScope}>
              Run one at a time ({fieldType === 'single' ? perTargetSteps.length : selected.length}-step sequence)
            </Button>
          )}
          {fieldType === 'single' ? <span className="text-[11px] text-ink-3">A single-host field can&apos;t hold {allTargets.length} hosts at once — only sequencing is offered.</span> : null}
        </div>
      )}
    </div>
  );
}
