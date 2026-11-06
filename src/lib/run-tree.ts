import type { AgentRun } from './api/client';

export interface RunNode {
  readonly run: AgentRun;
  readonly children: RunNode[];
}

/** Builds the delegation tree from a root run and its flat descendant list (ordered by parentRunId). */
export function buildRunTree(root: AgentRun, descendants: readonly AgentRun[]): RunNode {
  const byParent = new Map<string, AgentRun[]>();
  for (const run of descendants) {
    if (!run.parentRunId) continue;
    const siblings = byParent.get(run.parentRunId) ?? [];
    siblings.push(run);
    byParent.set(run.parentRunId, siblings);
  }
  const visit = (run: AgentRun, seen: Set<string>): RunNode => {
    seen.add(run.id);
    const children = (byParent.get(run.id) ?? []).filter((c) => !seen.has(c.id)).map((c) => visit(c, seen));
    return { run, children };
  };
  return visit(root, new Set());
}
