'use client';

import { Send, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, ErrorNotice, Panel, StatusBadge } from '@/components/ui';
import { type AiChatRequest, type AiChatResponse, type AiModel, apiUrl } from '@/lib/api/client';
import { SseParser } from '@/lib/api/sse';

type Trace = { kind: 'attempt' | 'fallback'; model: string; error?: string };

const selectClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 font-mono text-[11.5px] text-ink';

/** Streams a test prompt through POST /api/v1/ai/chat/stream (SSE over fetch). */
export function ChatConsole({ models, defaultModel, onFinished }: { models: AiModel[]; defaultModel: string | null; onFinished: () => void }) {
  const [model, setModel] = useState('');
  const [fallback, setFallback] = useState('');
  const [system, setSystem] = useState('');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [trace, setTrace] = useState<Trace[]>([]);
  const [result, setResult] = useState<Omit<AiChatResponse, 'text'> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selected = model || (defaultModel && models.some((m) => m.id === defaultModel) ? defaultModel : (models[0]?.id ?? ''));

  const run = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setOutput('');
    setTrace([]);
    setResult(null);
    setError(null);
    const body: AiChatRequest = {
      model: selected,
      fallbackModels: fallback ? [fallback] : [],
      messages: [...(system.trim() ? [{ role: 'system' as const, content: system }] : []), { role: 'user' as const, content: prompt }],
    };
    try {
      const response = await fetch(apiUrl('/ai/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'include',
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
        throw new Error(typeof payload?.message === 'string' ? payload.message : `HTTP ${response.status}`);
      }
      const parser = new SseParser();
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const event of parser.push(value)) {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          if (event.event === 'delta') setOutput((o) => o + String(data.text ?? ''));
          else if (event.event === 'attempt') setTrace((t) => [...t, { kind: 'attempt', model: String(data.model) }]);
          else if (event.event === 'fallback') setTrace((t) => [...t, { kind: 'fallback', model: String(data.model), error: String(data.error) }]);
          else if (event.event === 'done') setResult(data as unknown as Omit<AiChatResponse, 'text'>);
          else if (event.event === 'error') setError(new Error(String(data.message)));
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e);
    } finally {
      setRunning(false);
      abortRef.current = null;
      onFinished();
    }
  };

  const noModels = models.length === 0;

  return (
    <Panel title="Test console" subtitle="Streams through the gateway with optional fallback. Each call is audited (metadata only, never the prompt).">
      {noModels ? (
        <p className="text-[12px] text-ink-3">No available models. Add an API key to the backend .env (or install Ollama), restart the backend, then click Discover.</p>
      ) : (
        <form
          className="grid gap-3 lg:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!running && prompt.trim()) void run();
          }}
        >
          <div className="space-y-2">
            <label className="block text-[11px] text-ink-3">
              Model
              <select className={selectClass} value={selected} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-ink-3">
              Fallback (used only if the first model fails before answering)
              <select className={selectClass} value={fallback} onChange={(e) => setFallback(e.target.value)}>
                <option value="">None</option>
                {models
                  .filter((m) => m.id !== selected)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-[11px] text-ink-3">
              System instructions (optional)
              <textarea className={`${selectClass} h-16 resize-y`} value={system} onChange={(e) => setSystem(e.target.value)} />
            </label>
            <label className="block text-[11px] text-ink-3">
              Prompt
              <textarea className={`${selectClass} h-24 resize-y`} value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" busy={running} disabled={!prompt.trim()}>
                <Send className="size-3.5" aria-hidden /> Send
              </Button>
              <Button onClick={() => abortRef.current?.abort()} disabled={!running}>
                <Square className="size-3.5" aria-hidden /> Stop
              </Button>
            </div>
          </div>
          <div className="flex min-h-48 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {trace.map((t, i) =>
                t.kind === 'attempt' ? (
                  <StatusBadge key={i} tone="pending" label={`→ ${t.model}`} />
                ) : (
                  <StatusBadge key={i} tone="warning" label={`fallback → ${t.model}`} />
                ),
              )}
              {result ? <StatusBadge tone="good" label={`answered by ${result.model}`} /> : null}
            </div>
            {trace
              .filter((t) => t.kind === 'fallback')
              .map((t, i) => (
                <p key={i} className="text-[11px] text-warning">
                  Previous model failed: {t.error}
                </p>
              ))}
            {error ? <ErrorNotice error={error} /> : null}
            <pre className="min-h-32 flex-1 whitespace-pre-wrap break-words rounded border border-edge bg-canvas p-2 font-sans text-[12.5px] leading-relaxed text-ink">
              {output || (running ? '…' : '')}
            </pre>
            {result ? (
              <p className="font-mono text-[11px] text-ink-3">
                tokens in {result.usage.inputTokens ?? '?'} / out {result.usage.outputTokens ?? '?'} · first token {result.latency.firstTokenMs ?? '—'} ms · total{' '}
                {result.latency.totalMs} ms · finish {result.finishReason ?? '—'}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </Panel>
  );
}
