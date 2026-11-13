'use client';

import { ChevronDown, Maximize2, Minimize2, Minus, Plus, SquareTerminal, X } from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { clearPersistedSession, TerminalConsole } from '@/app/terminal/terminal-console';

/** The event the top-bar button (and anything else) dispatches to open a floating terminal window. Each dispatch opens a NEW window — like launching another cmd.exe — rather than toggling one. */
export const OPEN_TERMINAL_EVENT = 'dark-agi:open-terminal';
const COLOR_KEY = 'dark-agi:terminal-color';
const WINDOWS_KEY = 'dark-agi:terminal-windows';
const DEFAULT_COLOR = '#2ee88f';
const PRESETS = ['#2ee88f', '#22d3ee', '#f5a623', '#ff3b5c', '#e6e9ea', '#a78bfa'];
/** How far each newly opened window is offset from the last one, so stacked windows visibly cascade like real OS windows instead of landing exactly on top of each other. */
const CASCADE_PX = 28;

interface FloatingWindow {
  id: string;
  x: number;
  y: number;
  collapsed: boolean;
  maximized: boolean;
}

const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function loadWindows(): FloatingWindow[] {
  try {
    const raw = localStorage.getItem(WINDOWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FloatingWindow[]) : [];
  } catch {
    return [];
  }
}

function saveWindows(windows: readonly FloatingWindow[]): void {
  try {
    localStorage.setItem(WINDOWS_KEY, JSON.stringify(windows));
  } catch {
    /* storage may be unavailable (private browsing, quota) — windows still work for this page load */
  }
}

function loadColor(): string {
  try {
    return localStorage.getItem(COLOR_KEY) ?? DEFAULT_COLOR;
  } catch {
    return DEFAULT_COLOR;
  }
}

/**
 * Multiple independent, draggable, resizable floating terminal windows — like opening several cmd.exe
 * windows at once, not one toggled singleton. Each dispatch of `OPEN_TERMINAL_EVENT` adds a new window,
 * cascaded from the last so they're visibly distinct. The open-window list (position, collapsed/maximized)
 * and each window's own terminal session (command history, results) both persist to localStorage, so a
 * browser refresh restores every open window exactly as it was — closing a window's × button is the only
 * thing that discards its session; collapsing/hiding keeps it.
 */
export function FloatingTerminal() {
  // Lazy initializers (same pattern as next-suggestions.tsx's autopilot toggle): restored synchronously on
  // first render rather than via a post-mount effect, so a page that previously had open windows shows them
  // immediately instead of flashing empty-then-restored. `loadWindows`/`loadColor` are SSR-safe (they
  // try/catch the missing `localStorage` global on the server and return the empty/default value), so this
  // never throws during server rendering — the only cost is a client hydration diff on the rare reload that
  // actually has saved windows, which React resolves by using the client's (correct, restored) output.
  const [windows, setWindows] = useState<FloatingWindow[]>(loadWindows);
  const [color, setColor] = useState<string>(loadColor);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    saveWindows(windows);
  }, [windows]);

  /** Opens one more independent window, cascaded from the last. Called both by the top-bar button's event (which may be covered by a maximized window) and by each window's own "+" button, so there's always a reachable way to open another — no need to find/uncover the top bar. */
  const openWindow = useCallback(() => {
    setWindows((prev) => {
      const last = prev[prev.length - 1];
      const x = last ? last.x + CASCADE_PX : 140;
      const y = last ? last.y + CASCADE_PX : 90;
      return [...prev, { id: newId(), x, y, collapsed: false, maximized: false }];
    });
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_TERMINAL_EVENT, openWindow);
    return () => window.removeEventListener(OPEN_TERMINAL_EVENT, openWindow);
  }, [openWindow]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, dx, dy } = dragRef.current;
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x: Math.max(0, e.clientX - dx), y: Math.max(0, e.clientY - dy) } : w)));
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const pickColor = (c: string) => {
    setColor(c);
    try {
      localStorage.setItem(COLOR_KEY, c);
    } catch {
      /* storage may be unavailable */
    }
  };

  /** Moving a window to the end of the array makes it the last sibling in DOM order, which wins default stacking — the same "click to bring to front" behavior as real OS windows. */
  const bringToFront = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev.find((x) => x.id === id);
      if (!w || prev[prev.length - 1]?.id === id) return prev;
      return [...prev.filter((x) => x.id !== id), w];
    });
  }, []);

  const update = (id: string, patch: Partial<FloatingWindow>) => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    clearPersistedSession(`float-${id}`);
  };

  const onTitleDown = (id: string, pos: { x: number; y: number }) => (e: ReactMouseEvent) => {
    bringToFront(id);
    dragRef.current = { id, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  if (windows.length === 0) return null;

  return (
    <>
      {windows.map((w) => (
        <div
          key={w.id}
          className={`fixed z-50 flex flex-col overflow-hidden rounded-lg border border-edge-strong bg-panel shadow-2xl ${
            w.maximized ? 'inset-2' : `w-[760px] max-w-[95vw] ${w.collapsed ? '' : 'h-[460px] max-h-[85vh]'}`
          }`}
          style={w.maximized ? undefined : { left: w.x, top: w.y, ...(w.collapsed ? {} : { resize: 'both' }) }}
          onMouseDownCapture={() => bringToFront(w.id)}
          role="dialog"
          aria-label="DARK AGI terminal"
        >
          <div
            className={`flex select-none items-center gap-2 border-b border-edge bg-panel-2 px-3 py-1.5 ${w.maximized ? 'cursor-default' : 'cursor-move'}`}
            onMouseDown={w.maximized ? undefined : onTitleDown(w.id, w)}
            onDoubleClick={() => update(w.id, { maximized: !w.maximized })}
          >
            <SquareTerminal className="size-3.5 text-accent" aria-hidden />
            <span className="text-[12px] font-medium text-ink">DARK AGI Terminal</span>
            <div className="ml-auto flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" onClick={openWindow} className="text-ink-3 hover:text-ink" aria-label="Open another terminal window" title="Open another terminal window">
                <Plus className="size-4" aria-hidden />
              </button>
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickColor(c)}
                  style={{ backgroundColor: c }}
                  className={`size-3.5 rounded-full border ${color.toLowerCase() === c.toLowerCase() ? 'border-ink' : 'border-edge'}`}
                  aria-label={`Use ${c}`}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => pickColor(e.target.value)}
                className="size-5 cursor-pointer rounded border border-edge bg-transparent p-0"
                aria-label="Pick terminal text colour"
                title="Pick a colour"
              />
              <button
                type="button"
                onClick={() => update(w.id, { collapsed: !w.collapsed })}
                className="ml-1 text-ink-3 hover:text-ink"
                aria-label={w.collapsed ? 'Expand terminal' : 'Collapse terminal'}
                title={w.collapsed ? 'Expand' : 'Collapse (keeps the session)'}
              >
                {w.collapsed ? <ChevronDown className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => setWindows((prev) => prev.map((x) => (x.id === w.id ? { ...x, maximized: !x.maximized } : x.maximized ? { ...x, maximized: false } : x)))}
                className="text-ink-3 hover:text-ink"
                aria-label={w.maximized ? 'Restore terminal' : 'Maximize terminal'}
                title={w.maximized ? 'Restore' : 'Maximize'}
              >
                {w.maximized ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
              </button>
              <button type="button" onClick={() => closeWindow(w.id)} className="text-ink-3 hover:text-ink" aria-label="Close terminal" title="Close (ends this window's session)">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className={w.collapsed ? 'hidden' : 'min-h-0 flex-1'}>
            <TerminalConsole embedded codeColor={color} sessionId={`float-${w.id}`} />
          </div>
        </div>
      ))}
    </>
  );
}
