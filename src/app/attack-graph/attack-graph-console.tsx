'use client';

import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type AttackPath, type AttackPathPage, type AttackReasonResponse, type GraphSnapshot } from '@/lib/api/client';

/**
 * Attack Graph: a read-only analytical view over entities discovered by past jobs (SharpHound/PingCastle
 * AD objects, vulnerable hosts derived from Findings) and the relationships between them. Nothing on this
 * page submits, approves or runs a job — "Find paths" and "Ask AI" only ever read already-collected data
 * and propose hypothetical paths. Acting on a proposed path still means submitting a normal job through
 * Command Reference / Task Queue, exactly like any other AI recommendation in this platform.
 */

const NODE_TYPE_COLUMN: Record<string, number> = { HOST: 0, SERVICE: 1, AD_USER: 2, AD_COMPUTER: 3, AD_GROUP: 4, VULNERABILITY: 5 };
const NODE_TYPE_COLOR: Record<string, string> = {
  HOST: '#5b8def', SERVICE: '#7c8b9c', AD_USER: '#2ee88f', AD_COMPUTER: '#f5c344', AD_GROUP: '#e8732e', VULNERABILITY: '#e85a5a',
};

function layoutNodes(snapshot: GraphSnapshot): Node[] {
  const columnCounts: Record<number, number> = {};
  return snapshot.nodes.map((n) => {
    const column = NODE_TYPE_COLUMN[n.type] ?? 6;
    const row = columnCounts[column] ?? 0;
    columnCounts[column] = row + 1;
    return {
      id: n.id,
      position: { x: column * 220, y: row * 70 },
      data: { label: n.label },
      style: { background: NODE_TYPE_COLOR[n.type] ?? '#555', color: '#0a0f0d', border: 'none', borderRadius: 6, fontSize: 11, padding: '4px 8px', width: 180 },
    };
  });
}

function layoutEdges(snapshot: GraphSnapshot, highlighted: ReadonlySet<string>): Edge[] {
  return snapshot.edges.map((e) => ({
    id: e.id,
    source: e.fromId,
    target: e.toId,
    label: e.type,
    animated: highlighted.has(e.id),
    style: highlighted.has(e.id) ? { stroke: '#2ee88f', strokeWidth: 2.5 } : { stroke: '#3a4a44' },
    labelStyle: { fontSize: 9, fill: '#9fb0a8' },
  }));
}

function PathSummary({ path, highlight }: { path: AttackPath; highlight: boolean }) {
  return (
    <li className={`rounded border px-2 py-1.5 text-[11.5px] ${highlight ? 'border-accent-strong/60 bg-accent-strong/10' : 'border-edge-strong'}`}>
      <span className="font-mono text-ink-2">{path.nodes.map((n) => n.label).join(' → ')}</span>
      <span className="ml-2 text-ink-3">({path.hops} hop{path.hops === 1 ? '' : 's'})</span>
    </li>
  );
}

export function AttackGraphConsole() {
  const { can } = useAuth();
  const canReason = can('attack-graph:reason');
  const snapshot = useSWR<GraphSnapshot>('/attack-graph/snapshot', { refreshInterval: 30_000 });

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [goal, setGoal] = useState('');
  const [pathsBusy, setPathsBusy] = useState(false);
  const [pathsError, setPathsError] = useState<unknown>(null);
  const [candidatePaths, setCandidatePaths] = useState<AttackPath[] | null>(null);
  const [reasonBusy, setReasonBusy] = useState(false);
  const [reasonError, setReasonError] = useState<unknown>(null);
  const [rankedPaths, setRankedPaths] = useState<AttackReasonResponse['paths'] | null>(null);

  const highlightedEdgeIds = useMemo(() => {
    const top = rankedPaths?.[0]?.path ?? candidatePaths?.[0];
    return new Set(top?.edges.map((e) => e.id) ?? []);
  }, [rankedPaths, candidatePaths]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(snapshot.data ? layoutNodes(snapshot.data) : []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(snapshot.data ? layoutEdges(snapshot.data, highlightedEdgeIds) : []);

  useEffect(() => {
    if (snapshot.data) setNodes(layoutNodes(snapshot.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.data]);

  useEffect(() => {
    if (snapshot.data) setEdges(layoutEdges(snapshot.data, highlightedEdgeIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.data, highlightedEdgeIds]);

  const findPaths = async () => {
    setPathsBusy(true);
    setPathsError(null);
    setRankedPaths(null);
    try {
      const result = await apiRequest<AttackPathPage>('/attack-graph/paths', { query: { from, to, maxHops: 6, maxPaths: 10 } });
      setCandidatePaths(result.paths);
    } catch (error) {
      setPathsError(error);
      setCandidatePaths(null);
    } finally {
      setPathsBusy(false);
    }
  };

  const reason = async () => {
    setReasonBusy(true);
    setReasonError(null);
    try {
      const result = await apiRequest<AttackReasonResponse>('/attack-graph/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, goal: goal.trim() || 'assess whether this path is a realistic risk', language: 'en' }),
      });
      setRankedPaths(result.paths);
    } catch (error) {
      setReasonError(error);
      setRankedPaths(null);
    } finally {
      setReasonBusy(false);
    }
  };

  return (
    <div>
      <title>Attack Graph · DARK AGI</title>
      <PageHeader
        title="Attack Graph"
        summary="Entities and relationships discovered by past approved jobs (SharpHound/PingCastle AD objects, vulnerable hosts). Read-only: this page never runs a job — acting on a path means submitting it normally from Command Reference."
      />
      <div className="grid gap-3 p-4 lg:grid-cols-[1fr_360px]">
        <Panel
          title="Graph"
          subtitle={snapshot.data ? `${snapshot.data.nodes.length} node${snapshot.data.nodes.length === 1 ? '' : 's'}, ${snapshot.data.edges.length} edge${snapshot.data.edges.length === 1 ? '' : 's'}${snapshot.data.truncated ? ' (truncated)' : ''}` : undefined}
          className="min-h-[520px]"
        >
          {snapshot.error ? <ErrorNotice error={snapshot.error} /> : null}
          {!snapshot.data && !snapshot.error ? <Skeleton className="h-[480px] w-full" /> : null}
          {snapshot.data && snapshot.data.nodes.length === 0 ? (
            <p className="text-[12px] text-ink-3">
              No graph data yet. Run a SharpHound AD collection, PingCastle health check, or a vulnerability scan from their respective pages — nodes and edges appear here automatically once a job succeeds.
            </p>
          ) : null}
          {snapshot.data && snapshot.data.nodes.length > 0 ? (
            <div style={{ height: 480 }}>
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView colorMode="dark">
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-3">
          <Panel title="Find a path">
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-ink-3">From (node key)</label>
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. S-1-5-21-...-1104" className="w-full rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[12px] text-ink" />
              </div>
              <div>
                <label className="block text-[11px] text-ink-3">To (node key)</label>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. S-1-5-21-...-512 (Domain Admins)" className="w-full rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[12px] text-ink" />
              </div>
              <Button variant="primary" busy={pathsBusy} disabled={!from || !to} onClick={() => void findPaths()}>
                Find paths
              </Button>
              {pathsError ? <ErrorNotice error={pathsError} /> : null}
            </div>
          </Panel>

          {candidatePaths ? (
            <Panel title="Candidate paths" subtitle={`${candidatePaths.length} found (graph-theoretic only, no AI yet)`}>
              {candidatePaths.length === 0 ? (
                <p className="text-[12px] text-ink-3">No path found within 6 hops.</p>
              ) : (
                <ul className="space-y-1.5">
                  {candidatePaths.map((p, i) => (
                    <PathSummary key={i} path={p} highlight={!rankedPaths && i === 0} />
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          {candidatePaths && candidatePaths.length > 0 ? (
            <Panel title="Ask AI to rank & explain">
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-ink-3">Goal (plain language)</label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Could this foothold user reach Domain Admins?"
                    className="h-16 w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                  />
                </div>
                {canReason ? (
                  <Button variant="primary" busy={reasonBusy} onClick={() => void reason()}>
                    Ask AI
                  </Button>
                ) : (
                  <StatusBadge tone="neutral" label="Requires attack-graph:reason permission" />
                )}
                {reasonError ? <ErrorNotice error={reasonError} /> : null}
              </div>
            </Panel>
          ) : null}

          {rankedPaths ? (
            <Panel title="AI-ranked paths" subtitle={`${rankedPaths.length} ranked`}>
              {rankedPaths.length === 0 ? (
                <p className="text-[12px] text-ink-3">The AI found none of the candidate paths relevant to this goal.</p>
              ) : (
                <ul className="space-y-2">
                  {rankedPaths.map((r) => (
                    <li key={r.rank} className={`rounded border px-2 py-1.5 text-[11.5px] ${r.rank === 1 ? 'border-accent-strong/60 bg-accent-strong/10' : 'border-edge-strong'}`}>
                      <p className="font-mono text-ink-2">
                        #{r.rank}: {r.path.nodes.map((n) => n.label).join(' → ')}
                      </p>
                      <p className="mt-1 text-ink-2">{r.explanation}</p>
                      {r.attackTechniques.length > 0 ? <p className="mt-1 text-[10.5px] text-ink-3">{r.attackTechniques.join(' · ')}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
