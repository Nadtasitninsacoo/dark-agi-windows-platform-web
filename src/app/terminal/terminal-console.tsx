'use client';

import { Bot, CornerDownLeft, Send, SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { RISK } from '@/components/operation-card';
import { useAuth } from '@/components/shell/auth';
import { apiRequest, type Job, type Operation, type OperationList } from '@/lib/api/client';
import { StatusBadge } from '@/components/ui';
import {
  aliasFor,
  CommandError,
  commandHint,
  COMMAND_PREFIX,
  COMMAND_SUFFIX,
  commandTemplate,
  parseCommand,
  suggestCommand,
  tokenizeCommand,
  type Suggestion,
} from '@/lib/commands';
import { JobResult } from '@/app/tasks/job-result';
import { NextSuggestions } from '@/app/tasks/next-suggestions';

/**
 * An interactive console for the DARK AGI command language. It looks and feels
 * like a terminal — a prompt, command history, inline results — but it is not a
 * shell: each line is parsed to a validated job and submitted through the API,
 * so scope, approval and audit still apply. Nothing free-form is ever executed.
 */

const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const FINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED']);

/**
 * Per-session persistence: each terminal (the main page, or one floating window) has its own `sessionId`
 * and its own localStorage slot, so refreshing the browser restores that session's command history and
 * results exactly, and separate windows never see each other's scrollback. Entries are capped at
 * `MAX_PERSISTED_ENTRIES` on write (oldest dropped first) so one long-running session can't grow without
 * bound — this is terminal scrollback, not a record of what actually happened (that's the job audit log).
 */
const SESSION_STORAGE_PREFIX = 'dark-agi:terminal-session:';
const MAX_PERSISTED_ENTRIES = 300;

interface PersistedSession {
  entries: Entry[];
  history: string[];
}

function loadSession(sessionId: string | undefined): PersistedSession | null {
  if (!sessionId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [], history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch {
    return null; // Corrupt or inaccessible storage — start this session fresh rather than failing to render.
  }
}

function saveSession(sessionId: string | undefined, session: PersistedSession): void {
  if (!sessionId || typeof window === 'undefined') return;
  try {
    const trimmed = session.entries.length > MAX_PERSISTED_ENTRIES ? session.entries.slice(session.entries.length - MAX_PERSISTED_ENTRIES) : session.entries;
    window.localStorage.setItem(SESSION_STORAGE_PREFIX + sessionId, JSON.stringify({ entries: trimmed, history: session.history.slice(-100) }));
  } catch {
    // Storage full or unavailable (private browsing, quota) — the session still works in-memory for this tab.
  }
}

/** Removes a closed session's saved scrollback entirely — closing a window, unlike collapsing it, means "done with this". */
export function clearPersistedSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_PREFIX + sessionId);
  } catch {
    /* nothing to clean up if storage is unavailable */
  }
}

type EntryData =
  | { kind: 'cmd'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'banner'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'approval'; text: string }
  | { kind: 'result'; title: string; result: unknown; toolId: string; operationId: string }
  | { kind: 'suggestion'; job: Job };
type Entry = EntryData & { id: number };

const BANNER = `DARK AGI terminal — the platform's own command language.
Type a command, e.g.  ${COMMAND_PREFIX} win:procs ${COMMAND_SUFFIX}
"help" lists commands · "clear" clears the screen · "banner" shows the console banner · ↑/↓ for history.
This is not a shell: every command is validated and audited, and network commands need an approved scope.`;

/** Same artwork the PowerShell launcher prints (scripts/banner.ps1) — static here, not regenerated, so it stays pixel-identical. */
const SKULL_BANNER = `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%        %%%%%%      %%%%        %%%%  %%%%%%  %%%%%%%%%%%%      %%%%%%        %%          %%%%%%
%%%%  %%%%%%  %%  %%%%%%  %%  %%%%%%  %%  %%%%  %%%%%%%%%%%%  %%%%%%  %%  %%%%%%%%%%%%%%  %%%%%%%%%%
%%%%  %%%%%%  %%          %%        %%%%      %%%%%%%%%%%%%%          %%  %%      %%%%%%  %%%%%%%%%%
%%%%  %%%%%%  %%  %%%%%%  %%  %%%%  %%%%  %%%%  %%%%%%%%%%%%  %%%%%%  %%  %%%%%%  %%%%%%  %%%%%%%%%%
%%%%        %%%%  %%%%%%  %%  %%%%%%  %%  %%%%%%  %%%%%%%%%%  %%%%%%  %%%%        %%          %%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%  %%%%%%  %%          %%  %%%%%%  %%        %%%%%%      %%%%  %%%%%%  %%%%        %%%%%%%%%%
%%%%%%%%  %%%%%%  %%%%%%  %%%%%%    %%%%  %%  %%%%%%  %%  %%%%%%  %%  %%%%%%  %%  %%%%%%%%%%%%%%%%%%
%%%%%%%%  %%  %%  %%%%%%  %%%%%%  %%  %%  %%  %%%%%%  %%  %%%%%%  %%  %%  %%  %%%%      %%%%%%%%%%%%
%%%%%%%%    %%    %%%%%%  %%%%%%  %%%%    %%  %%%%%%  %%  %%%%%%  %%    %%    %%%%%%%%%%  %%%%%%%%%%
%%%%%%%%  %%%%%%  %%          %%  %%%%%%  %%        %%%%%%      %%%%  %%%%%%  %%        %%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

                            _.--""""""""""""""""--._
                         .-"                        "-.
                        /                              \\
                       |                                |
                       |    .--------.    .--------.    |
                       |   /   .--.   \\  /   .--.   \\   |
                       |   |  ( () )  |  |  ( () )  |   |
                       |   \\   '--'   /  \\   '--'   /   |
                        \\   '--------'    '--------'   /
                         \\             /\\             /
                          '.          /__\\          .'
                          |  .--.--.--.--.--.--.--.  |
              ()==[]=====[|==|==|==|==|==|==|==|==|==|]==============================>
                          |  '--'--'--'--'--'--'--'  |
                           '-.____________________.-'

    %%%%   %%%  %%%%  %   %      %%%   %%%% %%%%%     %   % %%%%% %   % %%%%   %%%  %   %  %%%%
    %   % %   % %   % %  %      %   % %       %       %   %   %   %%  % %   % %   % %   % %
    %   % %%%%% %%%%  %%%       %%%%% % %%%   %       % % %   %   % % % %   % %   % % % %  %%%
    %   % %   % %  %  %  %      %   % %   %   %       %% %%   %   %  %% %   % %   % %% %%     %
    %%%%  %   % %   % %   %     %   %  %%%% %%%%%     %   % %%%%% %   % %%%%   %%%  %   % %%%%

       =[ DARK AGI WINDOWS :: Windows Cyber Intelligence Platform
+ -- --=[ 10 AI agents :: cloud + local models :: audited, authorized execution`;

const AI_BANNER_NOTE = `AI mode: type what you want in plain language (Thai or English), e.g. "ดูโปรเซสที่รันอยู่"
The AI picks one reviewed operation and fills its input; the same scope and approval rules still apply before anything runs.`;

/** Purely cosmetic: colours a submitted line by token (verb, key=value, prefix/suffix). Parsing/validation is unchanged elsewhere. */
function HighlightedCommand({ text }: { text: string }) {
  const tokens = tokenizeCommand(text);
  if (tokens.length === 0) return <span className="text-ink">{text}</span>;
  return (
    <>
      {tokens.map((token, i) => {
        const isFirst = i === 0;
        const isLast = i === tokens.length - 1 && tokens.length > 1;
        const eq = token.indexOf('=');
        let node: ReactNode;
        if (isFirst || isLast) {
          node = <span className="text-ink-3">{token}</span>;
        } else if (i === 1) {
          node = <span className="font-semibold text-cyan">{token}</span>;
        } else if (eq > 0) {
          node = (
            <>
              <span className="text-ink-2">{token.slice(0, eq)}</span>
              <span className="text-ink-3">=</span>
              <span className="text-ink">{token.slice(eq + 1)}</span>
            </>
          );
        } else {
          node = <span className="text-ink-2">{token}</span>;
        }
        return (
          <span key={i}>
            {i > 0 ? ' ' : ''}
            {node}
          </span>
        );
      })}
    </>
  );
}

export function TerminalConsole({ embedded = false, codeColor, sessionId }: { embedded?: boolean; codeColor?: string; sessionId?: string } = {}) {
  const { can } = useAuth();
  const codeStyle = codeColor ? { color: codeColor } : undefined;
  const canSubmit = can('jobs:submit');
  const operations = useSWR<OperationList>('/operations');
  const ops = useMemo<Operation[]>(() => operations.data?.items ?? [], [operations.data]);

  // Lazy initializers run once, synchronously, before first paint — the restored session is what the user
  // sees immediately, not an empty console that then "pops" full a moment later.
  const [entries, setEntries] = useState<Entry[]>(() => loadSession(sessionId)?.entries ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [history, setHistory] = useState<string[]>(() => loadSession(sessionId)?.history ?? []);
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const idRef = useRef(Math.max(0, ...entries.map((e) => e.id + 1)));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (entry: EntryData) => setEntries((prev) => [...prev, { ...entry, id: idRef.current++ }]);

  // Persist this session's own scrollback/history whenever either changes, so a refresh (or reopening a
  // floating window closed only by navigation, not by its own × button) restores exactly where it was.
  useEffect(() => {
    saveSession(sessionId, { entries, history });
  }, [sessionId, entries, history]);

  const suggestions = useMemo<readonly Suggestion[]>(() => (aiMode || input.trim() === '' ? [] : suggestCommand(input, ops)), [aiMode, input, ops]);
  const hint = useMemo(() => (aiMode || input.trim() === '' ? null : commandHint(input, ops)), [aiMode, input, ops]);
  const showDropdown = !suggestDismissed && suggestions.length > 0;
  const activeIndex = Math.min(suggestIndex, Math.max(0, suggestions.length - 1));

  const changeInput = (value: string) => {
    setInput(value);
    setSuggestIndex(0);
    setSuggestDismissed(false);
  };

  const acceptSuggestion = (s: Suggestion) => {
    changeInput(s.completion);
    inputRef.current?.focus();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const printHelp = () => {
    const cmds = ops.filter((o) => aliasFor(o)).toSorted((a, b) => (aliasFor(a) ?? '').localeCompare(aliasFor(b) ?? ''));
    const lines = cmds.length === 0 ? ['(no operations loaded yet)'] : cmds.map((o) => `  ${commandTemplate(o)}`);
    add({ kind: 'info', text: ['Available commands — fill the <values>:', ...lines, '', '  help    this list', '  clear   clear the screen', '  banner  show the console banner'].join('\n') });
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
      add({ kind: 'result', title: `${job.operationTitle} — succeeded`, result: job.result, toolId: job.toolId, operationId: job.operationId });
    } else if (job.status === 'AWAITING_APPROVAL') {
      add({ kind: 'approval', text: `${job.operationTitle} is queued and needs human approval before it runs.` });
    } else if (job.status === 'FAILED') {
      add({ kind: 'error', text: `Failed: ${job.error ?? 'unknown error'}` });
    } else {
      add({ kind: 'info', text: `${job.operationTitle} — ${job.status.toLowerCase()}` });
    }
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') add({ kind: 'suggestion', job });
  };

  /** A suggestion's "Run this" (or autopilot) submits a new job the same way a typed command does. */
  const onSuggestionSubmitted = async (job: Job) => {
    add({ kind: 'info', text: `→ ${job.operationTitle} · job ${job.id.slice(0, 8)} · ${job.status.toLowerCase()}…` });
    render(await poll(job.id, job));
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
    if (line === 'banner') {
      add({ kind: 'banner', text: SKULL_BANNER });
      return;
    }

    if (aiMode) {
      setBusy(true);
      try {
        const job = await apiRequest<Job>('/agents/command', post({ instruction: line }));
        add({ kind: 'info', text: `→ ${job.operationTitle} · job ${job.id.slice(0, 8)} · ${job.status.toLowerCase()}…` });
        render(await poll(job.id, job));
      } catch (e) {
        add({ kind: 'error', text: e instanceof Error ? e.message : 'The AI could not run that instruction' });
      } finally {
        setBusy(false);
      }
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

  const submitCurrent = () => {
    if (busy || input.trim() === '') return;
    const value = input;
    changeInput('');
    void runCommand(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion(suggestions[activeIndex]!);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestDismissed(true);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCurrent();
      return;
    }
    if (showDropdown) return; // Enter already handled above; don't fall through to history nav while the dropdown is open.
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIndex === null ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(idx);
      changeInput(history[idx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIndex === null) return;
      const idx = histIndex + 1;
      if (idx >= history.length) {
        setHistIndex(null);
        changeInput('');
      } else {
        setHistIndex(idx);
        changeInput(history[idx] ?? '');
      }
    }
  };

  const box = (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex w-full cursor-text flex-col border-edge-strong bg-canvas p-3 text-left font-mono text-[12px] leading-relaxed text-ink ${
        embedded ? 'h-full' : 'rounded-lg border shadow-inner'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-edge pb-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] text-ink-3">{aiMode ? 'AI command mode — describe what you want' : 'Command mode — type a dagi command'}</span>
        <button
          type="button"
          onClick={() => {
            setAiMode((m) => !m);
            inputRef.current?.focus();
          }}
          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${
            aiMode ? 'border-accent-strong bg-accent-strong/20 text-ink' : 'border-edge-strong text-ink-2 hover:bg-canvas'
          }`}
          title="Toggle between the dagi command language and natural-language AI command mode"
        >
          {aiMode ? <Bot className="size-3.5" aria-hidden /> : <SquareTerminal className="size-3.5" aria-hidden />}
          {aiMode ? 'AI mode' : 'Command mode'}
        </button>
      </div>
      <div className={`${embedded ? 'min-h-0 flex-1' : 'h-[60vh] min-h-72'} overflow-y-auto pr-1`}>
        <p className="whitespace-pre-wrap text-ink-3">{BANNER}</p>
        {aiMode ? <p className="mt-2 whitespace-pre-wrap text-accent">{AI_BANNER_NOTE}</p> : null}
        <div className="mt-2 space-y-1">
          {entries.map((entry) => {
            if (entry.kind === 'cmd') {
              return (
                <div key={entry.id} className="flex gap-2">
                  <span className="shrink-0 select-none text-good" style={codeStyle}>
                    {COMMAND_PREFIX}&gt;
                  </span>
                  <span className="whitespace-pre-wrap break-all">
                    <HighlightedCommand text={entry.text} />
                  </span>
                </div>
              );
            }
            if (entry.kind === 'banner') {
              return (
                <p key={entry.id} className="whitespace-pre-wrap break-words text-accent" style={{ textShadow: '0 0 6px rgb(46 232 143 / 0.35)' }}>
                  {entry.text}
                </p>
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
                    <JobResult result={entry.result} toolId={entry.toolId} operationId={entry.operationId} />
                  </div>
                </div>
              );
            }
            if (entry.kind === 'suggestion') {
              return (
                <div key={entry.id} className="my-1">
                  <NextSuggestions job={entry.job} onSubmitted={(j) => void onSuggestionSubmitted(j)} />
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

      <div className="relative mt-2 border-t border-edge pt-2">
        {showDropdown ? (
          <div
            className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-48 overflow-y-auto rounded border border-edge-strong bg-panel-2 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((s, i) => (
              <button
                key={`${s.label}-${i}`}
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-2 py-1 text-left text-[11.5px] ${
                  i === activeIndex ? 'bg-accent-strong/20 text-ink' : 'text-ink-2 hover:bg-canvas'
                }`}
                onMouseEnter={() => setSuggestIndex(i)}
                onClick={() => acceptSuggestion(s)}
              >
                <span className="shrink-0 font-mono text-cyan">{s.label}</span>
                {s.detail ? <span className="truncate text-ink-3">{s.detail}</span> : null}
              </button>
            ))}
            <p className="border-t border-edge px-2 py-1 text-[10.5px] text-ink-3">Tab to accept · ↑/↓ to choose · Esc to dismiss</p>
          </div>
        ) : null}

        {hint && !showDropdown ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {hint.operation ? (
              <>
                <span className="text-ink-2">{hint.operation.title}</span>
                <StatusBadge tone={RISK[hint.operation.risk] ?? 'neutral'} label={`${hint.operation.risk} risk`} />
                {hint.missingRequiredFields.length > 0 ? (
                  <span className="text-warning">missing: {hint.missingRequiredFields.join(', ')}</span>
                ) : hint.ready ? (
                  <span className="flex items-center gap-1 text-good">
                    <CornerDownLeft className="size-3" aria-hidden /> ready — press Enter
                  </span>
                ) : (
                  <span className="text-ink-3">type &quot;{COMMAND_SUFFIX}&quot; to finish</span>
                )}
              </>
            ) : hint.alias ? (
              <span className="text-critical">Unknown command &quot;{hint.alias}&quot;</span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <span className="shrink-0 select-none text-good" style={codeStyle}>
            {COMMAND_PREFIX}&gt;
          </span>
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-ink-3"
            style={codeStyle}
            placeholder={
              !canSubmit
                ? 'you need the jobs:submit permission to run commands'
                : aiMode
                  ? 'พิมพ์สิ่งที่ต้องการเป็นภาษาไทยหรืออังกฤษ เช่น "ดูโปรเซสที่รันอยู่"'
                  : `win:procs ${COMMAND_SUFFIX}   (type "help")`
            }
            aria-label="DARK AGI terminal input"
            value={input}
            disabled={!canSubmit || busy}
            spellCheck={false}
            autoComplete="off"
            onKeyDown={onKeyDown}
            onChange={(e) => changeInput(e.target.value)}
          />
          {busy ? (
            <span className="shrink-0 animate-pulse text-ink-3">running…</span>
          ) : (
            <button
              type="button"
              onClick={submitCurrent}
              disabled={!canSubmit || input.trim() === ''}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-accent-strong bg-accent-strong/90 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              title="Run (or press Enter)"
            >
              <Send className="size-3" aria-hidden /> Run
            </button>
          )}
        </div>
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
