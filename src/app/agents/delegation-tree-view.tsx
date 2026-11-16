'use client';

import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect } from 'react';
import type { AgentRun } from '@/lib/api/client';
import type { RunNode } from '@/lib/run-tree';

/**
 * Mission 08: a real delegation-tree visual. `buildRunTree` (src/lib/run-tree.ts) already does the real
 * tree-building work from the backend's own `parentRunId`/depth data — this is only the missing visual
 * layer. Reuses `@xyflow/react` (already a project dependency, already the one real graph-rendering
 * precedent in this codebase — Attack Graph's `attack-graph-console.tsx`) and the same manual column-
 * based layout `layoutNodes` there already established: real backend caps (`MAX_DELEGATION_DEPTH = 2`,
 * `MAX_DELEGATIONS_PER_RUN = 3`) keep this tree small and shallow, so a full auto-layout engine (dagre/
 * elk — neither installed, neither needed) would be solving a problem this tree never actually has.
 */

const STATUS_COLOR: Record<AgentRun['status'], string> = {
  SUCCEEDED: '#2ee88f',
  FAILED: '#ff3b5c',
  RUNNING: '#5b8def',
  CANCELLED: '#6b7577',
};

function layoutRunTree(root: RunNode, names: Record<string, string>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const rowAtDepth: Record<number, number> = {};

  const visit = (node: RunNode, parentId: string | null) => {
    const { run } = node;
    const row = rowAtDepth[run.depth] ?? 0;
    rowAtDepth[run.depth] = row + 1;
    nodes.push({
      id: run.id,
      position: { x: run.depth * 240, y: row * 80 },
      data: { label: `${names[run.agentId] ?? run.agentId}\n${run.status}` },
      style: {
        background: STATUS_COLOR[run.status],
        color: '#0a0f0d',
        border: 'none',
        borderRadius: 6,
        fontSize: 11,
        padding: '6px 10px',
        width: 200,
        whiteSpace: 'pre-line',
        textAlign: 'center',
      },
    });
    if (parentId) edges.push({ id: `${parentId}->${run.id}`, source: parentId, target: run.id, style: { stroke: '#3a4a44' } });
    for (const child of node.children) visit(child, run.id);
  };
  visit(root, null);
  return { nodes, edges };
}

export function DelegationTreeView({ root, names }: { root: RunNode; names: Record<string, string> }) {
  const { nodes: initialNodes, edges: initialEdges } = layoutRunTree(root, names);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    const layout = layoutRunTree(root, names);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  return (
    <div style={{ height: 320 }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView colorMode="dark">
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
