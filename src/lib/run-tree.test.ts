import { describe, expect, it } from 'vitest';
import type { AgentRun } from './api/client';
import { buildRunTree } from './run-tree';

const run = (id: string, parentRunId: string | null): AgentRun => ({
  id,
  parentRunId,
  agentId: 'oracle',
  depth: 0,
  status: 'SUCCEEDED',
  task: 't',
  allowDelegation: true,
  output: null,
  error: null,
  model: null,
  failedAttempts: [],
  requests: [],
  usage: { inputTokens: null, outputTokens: null },
  firstTokenMs: null,
  totalMs: null,
  createdAt: '2026-11-06T00:00:00.000Z',
  finishedAt: null,
});

describe('buildRunTree', () => {
  it('nests descendants under their parents in order', () => {
    const tree = buildRunTree(run('r', null), [run('a', 'r'), run('b', 'r'), run('a1', 'a')]);
    expect(tree.children.map((c) => c.run.id)).toEqual(['a', 'b']);
    expect(tree.children[0]!.children.map((c) => c.run.id)).toEqual(['a1']);
    expect(tree.children[1]!.children).toEqual([]);
  });

  it('ignores runs that do not belong to the tree', () => {
    expect(buildRunTree(run('r', null), [run('x', 'other')]).children).toEqual([]);
  });
});
