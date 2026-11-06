'use client';

import Link from 'next/link';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { apiRequest, type Job, type Operation, type OperationList } from '@/lib/api/client';
import { aliasFor, CommandError, COMMAND_PREFIX, COMMAND_SUFFIX, commandTemplate, parseCommand } from '@/lib/commands';
import { JobResult } from '@/app/tasks/job-result';

/**
 * An interactive console for the DARK AGI command language. It looks and feels
 * like a terminal — a prompt, command history, inline results — but it is not a
 * shell: each line is parsed to a validated job and submitted through the API,
 * so scope, approval and audit still apply. Nothing free-form is ever executed.
 */

const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);

type EntryData =
  | { kind: 'cmd'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'approval'; text: string }
  | { kind: 'result'; title: string; result: unknown };
type Entry = EntryData & { id: number };

const BANNER = `DARK AGI terminal — the platform's own command language.
Type a command, e.g.  ${COMMAND_PREFIX} win:procs ${COMMAND_SUFFIX}
"help" lists commands · "clear" clears the screen · ↑/↓ for history.
This is not a shell: every command is validated and audited, and network commands need an approved scope.`;

export function TerminalConsole({ embedded = false, codeColor }: { embedded?: boolean; codeColor?: string } = {}) {
  const { can } = useAuth();
  const codeStyle = codeColor ? { color: codeColor } : undefined;
  const canSubmit = can('jobs:submit');
  const operations = useSWR<OperationList>('/operations');
  const ops: Operation[] = operations.data?.items ?? [];

  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (entry: EntryData) => setEntries((prev) => [...prev, { ...entry, id: idRef.current++ }]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const printHelp = () => {
    const cmds = ops.filter((o) => aliasFor(o)).toSorted((a, b) => (aliasFor(a) ?? '').localeCompare(aliasFor(b) ?? ''));
    const lines = cmds.length === 0 ? ['(no operations loaded yet)'] : cmds.map((o) => `  ${commandTemplate(o)}`);
    add({ kind: 'info', text: ['Available commands — fill the <values>:', ...lines, '', '  help   this list', '  clear  clear the screen'].join('\n') });
  };

  const poll = async (id: string, first: Job): Promise<Job> => {
    let current = first;
    for (let i = 0; i < 180 && !FINAL.has(current.status) && current.status !== 'AWAITING_APPROVAL'; i++) {
      await sleep(1000);
      current = await apiRequest<Job>(`/jobs/${id}`);
    }
    return current;
  };

  const render = (job: Job) => {
    if (job.status === 'SUCCEEDED') {
      add({ kind: 'result', title: `${job.operationTitle} — succeeded`, result: job.result });
    } else if (job.status === 'AWAITING_APPROVAL') {
      add({ kind: 'approval', text: `${job.operationTitle} is queued and needs human approval before it runs.` });
    } else if (job.status === 'FAILED') {
      add({ kind: 'error', text: `Failed: ${job.error ?? 'unknown error'}` });
    } else {
      add({ kind: 'info', text: `${job.operationTitle} — ${job.status.toLowerCase()}` });
    }
  };

  const runCommand = async (raw: string) => {
    const line = raw.trim();
    if (line === '') return;
    add({ kind: 'cmd', text: line });
    setHistory((h) => [...h, line]);
    setHistIndex(null);

    if (line === 'clear') {
      setEntries([]);
      return;
    }
    if (line === 'help') {
      printHelp();
      return;
    }

    let body: { toolId: string; operationId: string; input: Record<string, unknown> };
    try {
      body = parseCommand(line, ops);
    } catch (e) {
      add({ kind: 'error', text: e instanceof CommandError ? e.message : 'Invalid command' });
      return;
    }

    setBusy(true);
    try {
      const job = await apiRequest<Job>('/jobs', post(body));
      add({ kind: 'info', text: `→ job ${job.id.slice(0, 8)} · ${job.status.toLowerCase()}…` });
      render(await poll(job.id, job));
    } catch (e) {
      add({ kind: 'error', text: e instanceof Error ? e.message : 'Submission failed' });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (busy) return;
      const value = input;
      setInput('');
      void runCommand(value);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIndex === null ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(idx);
      setInput(history[idx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIndex === null) return;
      const idx = histIndex + 1;
      if (idx >= history.length) {
        setHistIndex(null);
        setInput('');
      } else {
        setHistIndex(idx);
        setInput(history[idx] ?? '');
      }
    }
  };

  const box = (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex w-full cursor-text flex-col border-edge-strong bg-[#05080c] p-3 text-left font-mono text-[12px] leading-relaxed text-ink ${
        embedded ? 'h-full' : 'rounded-lg border shadow-inner'
      }`}
    >
      <div className={`${embedded ? 'min-h-0 flex-1' : 'h-[60vh] min-h-72'} overflow-y-auto pr-1`}>
        <p className="whitespace-pre-wrap text-ink-3">{BANNER}</p>
        <div className="mt-2 space-y-1">
          {entries.map((entry) => {
            if (entry.kind === 'cmd') {
              return (
                <div key={entry.id} className="flex gap-2">
                  <span className="shrink-0 select-none text-good" style={codeStyle}>
                    {COMMAND_PREFIX}&gt;
                  </span>
                  <span className="whitespace-pre-wrap break-all text-ink" style={codeStyle}>
                    {entry.text}
                  </span>
                </div>
              );
            }
            if (entry.kind === 'error') {
              return (
                <p key={entry.id} className="whitespace-pre-wrap break-words text-critical">
                  {entry.text}
                </p>
              );
            }
            if (entry.kind === 'approval') {
              return (
                <p key={entry.id} className="whitespace-pre-wrap break-words text-warning">
                  {entry.text}{' '}
                  <Link href="/tasks" className="underline hover:text-ink">
                    open Task Queue
                  </Link>
                </p>
              );
            }
            if (entry.kind === 'result') {
              return (
                <div key={entry.id} className="my-1">
                  <p className="text-good" style={codeStyle}>
                    {entry.title}
                  </p>
                  <div className="mt-1">
                    <JobResult result={entry.result} />
                  </div>
                </div>
              );
            }
            return (
              <p key={entry.id} className="whitespace-pre-wrap break-words text-ink-2">
                {entry.text}
              </p>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-edge pt-2">
        <span className="shrink-0 select-none text-good" style={codeStyle}>
          {COMMAND_PREFIX}&gt;
        </span>
        <input
          ref={inputRef}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-ink-3"
          style={codeStyle}
          placeholder={canSubmit ? `win:procs ${COMMAND_SUFFIX}   (type "help")` : 'you need the jobs:submit permission to run commands'}
          aria-label="DARK AGI terminal input"
          value={input}
          disabled={!canSubmit || busy}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={onKeyDown}
          onChange={(e) => setInput(e.target.value)}
        />
        {busy ? <span className="shrink-0 animate-pulse text-ink-3">running…</span> : null}
      </div>
    </div>
  );

  if (embedded) return box;

  return (
    <div>
      <title>Terminal · DARK AGI</title>
      <PageHeader title="Terminal" summary="An interactive console for the DARK AGI command language. It feels like a shell, but every command is validated, scope-checked, approved where required, and audited." />
      <div className="p-4">{box}</div>
    </div>
  );
}
