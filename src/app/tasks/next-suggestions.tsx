'use client';

import { Languages, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'th'>('en');
  const [submittedFor, setSubmittedFor] = useState<Set<number>>(new Set());
  const [autopilot, setAutopilot] = useState(() => readAutopilot());
  // This component is permanently tied to one (already-terminal) job, so "has autopilot already acted
  // for this job" is a single boolean, not a batch identity -- robust even if something upstream ever
  // hands this a re-created (but equivalent) suggestions object.
  const autopilotFired = useRef(false);

  const terminal = job.status === 'SUCCEEDED' || job.status === 'FAILED';
  // A finished job's suggestions never change, so this never needs to revalidate -- critical for
  // autopilot: SWR's default revalidate-on-focus would otherwise hand the effect below a new `data`
  // object (same content, different reference) every time the window regains focus, and the ref-identity
  // guard would treat that as a fresh batch and submit the same top pick a second time for real.
  const { data, error, isLoading } = useSWR<AgentSuggestNextResult, unknown, Key | null>(terminal && autopilot ? (['suggest-next', job.id, language] as const) : null, fetchSuggestions, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
  const suggestions = data?.suggestions ?? null;

  const run = async (pick: Suggestion, index: number) => {
    const submitted = await apiRequest<Job>('/jobs', post({ toolId: pick.toolId, operationId: pick.operationId, input: pick.input ?? {} }));
    setSubmittedFor((prev) => new Set(prev).add(index));
    onSubmitted?.(submitted);
  };

  // Autopilot: once suggestions arrive, submit the top pick automatically through the exact same path
  // "Run this" uses. Guarded by a ref (not state) so it fires at most once for this job regardless of
  // re-renders or re-fetches, and every state update happens inside the promise callback, never
  // synchronously in the effect body. If that pick itself needs a human (most do, by design -- see
  // ExecutionService.submit), autopilot carries the operator to it instead of stalling silently: it jumps
  // to the Task Queue and opens that job's row, the same deep link every other approval notice uses, but
  // never clicks Approve itself -- that click stays a human's, on purpose.
  useEffect(() => {
    if (!autopilot || !data || data.suggestions.length === 0 || autopilotFired.current) return;
    autopilotFired.current = true;
    const top = data.suggestions[0]!;
    apiRequest<Job>('/jobs', post({ toolId: top.toolId, operationId: top.operationId, input: top.input ?? {} })).then(
      (submitted) => {
        setSubmittedFor((prev) => new Set(prev).add(0));
        onSubmitted?.(submitted);
        if (submitted.status === 'AWAITING_APPROVAL') router.push(`/tasks?job=${submitted.id}`);
      },
      () => {
        /* autopilot submission failed silently here; the operator can still click "Run this" by hand */
      },
    );
  }, [autopilot, data, onSubmitted, router]);

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
