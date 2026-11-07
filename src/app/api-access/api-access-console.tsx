'use client';

import { Check, Copy, KeyRound, Trash2, TriangleAlert } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { Button, ErrorNotice, Panel, Skeleton } from '@/components/ui';
import { API_BASE_URL, API_PREFIX, apiRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * API Access — create long-lived API keys so external programs and AI agents
 * can use the platform's tools over HTTP. Keys carry the creating user's
 * permissions; every call still goes through scope, approval and audit.
 */

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}
interface ApiKeyList {
  items: ApiKey[];
}
interface ApiKeyCreated {
  token: string;
  key: ApiKey;
}

const BASE = `${API_BASE_URL}${API_PREFIX}`;
const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-edge-strong px-2 py-0.5 text-[11.5px] text-ink-2 hover:bg-canvas"
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function ApiAccessConsole() {
  const keys = useSWR<ApiKeyList>('/auth/api-keys');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await apiRequest<ApiKeyCreated>('/auth/api-keys', post({ label: label.trim() }));
      setCreated(result);
      setLabel('');
      await keys.mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the key');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await apiRequest(`/auth/api-keys/${id}`, { method: 'DELETE' });
      await keys.mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the key');
    }
  };

  const curlList = `curl -H "Authorization: Bearer YOUR_KEY" ${BASE}/operations`;
  const curlRun = `curl -X POST ${BASE}/jobs \\\n  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\\n  -d '{"toolId":"powershell","operationId":"dns-inspection","input":{"host":"example.com"}}'`;
  const curlMcpList = `curl -X POST ${BASE}/mcp \\\n  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
  const curlMcpCall = `curl -X POST ${BASE}/mcp \\\n  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"powershell__dns-inspection","arguments":{"host":"example.com"}}}'`;

  return (
    <div>
      <title>API Access · DARK AGI</title>
      <PageHeader
        title="API Access"
        summary="Create API keys so your own programs and AI agents can use the platform's tools over HTTP. A key carries your permissions; scope, approval and audit still apply to every call."
      />
      <div className="space-y-3 p-4">
        {error ? <ErrorNotice error={new Error(error)} /> : null}

        <Panel title="Create an API key" subtitle="The secret is shown once. Store it somewhere safe.">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void create(e)}>
            <label className="text-[12px] text-ink-2">
              <span className="mb-1 block text-ink-3">Label</span>
              <input
                className="w-64 rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink"
                placeholder="e.g. my-ai-agent"
                value={label}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary" busy={busy} disabled={label.trim() === ''}>
              <KeyRound className="size-3.5" aria-hidden /> Create key
            </Button>
          </form>

          {created ? (
            <div className="mt-3 rounded-md border border-warning/50 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-[12px] font-medium text-warning">
                <TriangleAlert className="size-4" aria-hidden /> Copy your key now — it will not be shown again.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded border border-edge bg-canvas px-2 py-1 font-mono text-[12px] text-ink">{created.token}</code>
                <CopyButton text={created.token} label="Copy key" />
              </div>
              <p className="mt-1 text-[11.5px] text-ink-3">
                Label: <span className="text-ink-2">{created.key.label}</span>
              </p>
            </div>
          ) : null}
        </Panel>

        <Panel title="Your API keys" subtitle={keys.data ? `${keys.data.items.length} active` : undefined}>
          {keys.error ? <ErrorNotice error={keys.error} /> : null}
          {!keys.data && !keys.error ? <Skeleton className="h-20 w-full" /> : null}
          {keys.data && keys.data.items.length === 0 ? <p className="text-[12px] text-ink-3">No API keys yet.</p> : null}
          {keys.data && keys.data.items.length > 0 ? (
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="py-1 pr-3 font-medium">Label</th>
                  <th className="py-1 pr-3 font-medium">Created</th>
                  <th className="py-1 pr-3 font-medium">Last used</th>
                  <th className="py-1 font-medium" />
                </tr>
              </thead>
              <tbody className="text-ink-2">
                {keys.data.items.map((k) => (
                  <tr key={k.id} className="border-t border-edge/50">
                    <td className="py-1.5 pr-3 text-ink">{k.label}</td>
                    <td className="py-1.5 pr-3">{formatDateTime(k.createdAt)}</td>
                    <td className="py-1.5 pr-3">{formatDateTime(k.lastSeenAt)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => void revoke(k.id)}
                        className="inline-flex items-center gap-1 rounded border border-edge-strong px-2 py-0.5 text-[11.5px] text-critical hover:bg-canvas"
                      >
                        <Trash2 className="size-3" aria-hidden /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>

        <Panel title="Connect your AI / program" subtitle="Any language, any machine — just send the key in a header">
          <div className="space-y-3 text-[12px] text-ink-2">
            <div>
              <p className="mb-1 text-ink-3">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded border border-edge bg-canvas px-2 py-1 font-mono text-ink">{BASE}</code>
                <CopyButton text={BASE} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-ink-3">List the available tools (and their input/output schemas)</p>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-edge bg-canvas p-2 font-mono text-[11px] text-ink">{curlList}</pre>
                <CopyButton text={curlList} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-ink-3">Run a tool (returns a job; poll GET /jobs/&lt;id&gt; for the result)</p>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-edge bg-canvas p-2 font-mono text-[11px] text-ink">{curlRun}</pre>
                <CopyButton text={curlRun} />
              </div>
            </div>
            <p className="text-[11.5px] text-ink-3">
              The header may be <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> or <code className="font-mono">x-api-key: &lt;key&gt;</code>. A key has the permissions of the user who created it. Network
              operations still require an approved scope, and operations marked “needs approval” wait for a human — exactly as in the console.
            </p>
          </div>
        </Panel>

        <Panel title="Connect another agent system (MCP)" subtitle="Model Context Protocol — JSON-RPC 2.0 over HTTP, same API key">
          <div className="space-y-3 text-[12px] text-ink-2">
            <p>
              <code className="font-mono text-ink">{BASE}/mcp</code> speaks the Model Context Protocol, so any MCP-compatible agent framework can discover and call every operation above as a tool — in real time, not a one-off
              export. It is not a second, looser door into the engine: a tool call is <code className="font-mono">POST /jobs</code> under the hood, through the same scope, approval and audit path, as the calling key’s own
              user. <code className="font-mono">tools/call</code> waits briefly for a quick operation to finish and reports the result inline; an operation that needs approval returns its job id immediately instead of
              blocking, to be checked again with the built-in <code className="font-mono">dark-agi__job_status</code> tool once a human has approved it.
            </p>
            <div>
              <p className="mb-1 text-ink-3">List tools (name, description, input schema — one per operation)</p>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-edge bg-canvas p-2 font-mono text-[11px] text-ink">{curlMcpList}</pre>
                <CopyButton text={curlMcpList} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-ink-3">Call a tool</p>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-edge bg-canvas p-2 font-mono text-[11px] text-ink">{curlMcpCall}</pre>
                <CopyButton text={curlMcpCall} />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
