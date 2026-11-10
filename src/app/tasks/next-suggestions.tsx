'use client';

import { Languages, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { ErrorNotice, Toggle } from '@/components/ui';
import { apiRequest, type AgentSuggestNextResult, type Job } from '@/lib/api/client';

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const AUTOPILOT_KEY = 'dark-agi:autopilot';

function readAutopilot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AUTOPILOT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeAutopilot(on: boolean): void {
  try {
    localStorage.setItem(AUTOPILOT_KEY, on ? '1' : '0');
  } catch {
    /* storage may be unavailable */
  }
}

type Suggestion = AgentSuggestNextResult['suggestions'][number];
type Key = readonly [string, string, 'en' | 'th'];

const fetchSuggestions = ([, jobId, language]: Key): Promise<AgentSuggestNextResult> => apiRequest<AgentSuggestNextResult>('/agents/suggest-next', post({ jobId, language }));

/**
 * "What should I run next?" — shown once a job reaches a terminal status, in both the Terminal
 * (terminal-console.tsx) and the Task Queue (task-queue.tsx's JobDetail). The single Autopilot switch is
 * this feature's only on/off control: while it's off, nothing here ever calls the AI gateway at all (no
 * POST /agents/suggest-next, no model usage) — not even to fetch a suggestion to just look at. Turning it
 * on both starts fetching suggestions for each finished job *and* submits the top pick automatically
 * through the exact same POST /jobs path "Run this" uses, so an approval-required pick still waits for a
 * human exactly as it would if submitted by hand. Off is the default for a browser that has never touched
 * this switch, and it stays off across reloads until explicitly turned on.
 */
export function NextSuggestions({ job, onSubmitted }: { job: Job; onSubmitted?: (job: Job) => void }) {
  const [language, setLanguage] = useState<'en' | 'th'>('en');
  const [submittedFor, setSubmittedFor] = useState<Set<number>>(new Set());
  const [autopilot, setAutopilot] = useState(() => readAutopilot());
  const autopilotRanFor = useRef<AgentSuggestNextResult | null>(null);

  const terminal = job.status === 'SUCCEEDED' || job.status === 'FAILED';
  const { data, error, isLoading } = useSWR<AgentSuggestNextResult, unknown, Key | null>(terminal && autopilot ? (['suggest-next', job.id, language] as const) : null, fetchSuggestions);
  const suggestions = data?.suggestions ?? null;

  const run = async (pick: Suggestion, index: number) => {
    const submitted = await apiRequest<Job>('/jobs', post({ toolId: pick.toolId, operationId: pick.operationId, input: pick.input ?? {} }));
    setSubmittedFor((prev) => new Set(prev).add(index));
    onSubmitted?.(submitted);
  };

  // Autopilot: once a fresh suggestions batch arrives, submit the top pick automatically through the exact
  // same path "Run this" uses. Guarded by a ref (not state) keyed on the batch itself, so it fires exactly
  // once per batch regardless of re-renders, and every state update happens inside the promise callback,
  // never synchronously in the effect body.
  useEffect(() => {
    if (!autopilot || !data || data.suggestions.length === 0 || autopilotRanFor.current === data) return;
    autopilotRanFor.current = data;
    const top = data.suggestions[0]!;
    apiRequest<Job>('/jobs', post({ toolId: top.toolId, operationId: top.operationId, input: top.input ?? {} })).then(
      (submitted) => {
        setSubmittedFor((prev) => new Set(prev).add(0));
        onSubmitted?.(submitted);
      },
      () => {
        /* autopilot submission failed silently here; the operator can still click "Run this" by hand */
      },
    );
  }, [autopilot, data, onSubmitted]);

  if (!terminal) return null;

  return (
    <div className="mt-2 rounded border border-edge bg-panel-2/60 p-2.5 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-ink-2">
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          What next?
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <Toggle
              checked={autopilot}
              onChange={(on) => {
                setAutopilot(on);
                writeAutopilot(on);
              }}
              label="Autopilot"
            />
            Autopilot
          </label>
          <button
            type="button"
            onClick={() => setLanguage((l) => (l === 'en' ? 'th' : 'en'))}
            className="flex items-center gap-1 rounded border border-edge-strong px-1.5 py-0.5 text-[11px] text-ink-3 hover:border-accent/60"
          >
            <Languages className="size-3" aria-hidden />
            {language === 'en' ? 'EN' : 'TH'}
          </button>
        </div>
      </div>
      {!autopilot ? <p className="mt-2 text-ink-3">Off — turning this on calls the AI gateway to suggest (and auto-run) a next step.</p> : null}
      {autopilot && isLoading ? (
        <p className="mt-2 flex items-center gap-1.5 text-ink-3">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Thinking…
        </p>
      ) : null}
      {autopilot && error ? (
        <div className="mt-2">
          <ErrorNotice error={error} />
        </div>
      ) : null}
      {autopilot && !isLoading && !error && suggestions && suggestions.length === 0 ? <p className="mt-2 text-ink-3">No obvious next step.</p> : null}
      {autopilot && suggestions && suggestions.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={`${s.toolId}:${s.operationId}:${i}`} className="flex items-start justify-between gap-2 rounded border border-edge bg-canvas/60 px-2 py-1.5">
              <div className="min-w-0">
                <p className="font-mono text-[11.5px] text-ink">
                  {s.toolId}:{s.operationId}
                </p>
                <p className="text-ink-3">{s.reason}</p>
                {s.input ? <p className="truncate font-mono text-[10.5px] text-ink-3">{JSON.stringify(s.input)}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void run(s, i)}
                disabled={submittedFor.has(i)}
                className="shrink-0 rounded border border-edge-strong bg-panel-2 px-2 py-1 text-[11px] font-medium text-ink hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittedFor.has(i) ? 'Submitted' : 'Run this'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
