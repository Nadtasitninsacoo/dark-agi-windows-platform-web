'use client';

import { SquareTerminal, X } from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { TerminalConsole } from '@/app/terminal/terminal-console';

/** The event the top-bar button (and anything else) dispatches to open the floating terminal. */
export const OPEN_TERMINAL_EVENT = 'dark-agi:open-terminal';
const COLOR_KEY = 'dark-agi:terminal-color';
const DEFAULT_COLOR = '#49e07a';
const PRESETS = ['#49e07a', '#38bdf8', '#fbbf24', '#f472b6', '#e5e7eb', '#a78bfa'];

/**
 * A standard draggable, resizable floating window hosting the DARK AGI terminal.
 * Opened from the top bar; its code-text colour is customisable and remembered
 * per browser. The console itself is unchanged — same validated, audited jobs.
 */
export function FloatingTerminal() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 140, y: 90 });
  const [color, setColor] = useState(DEFAULT_COLOR);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onOpen = () => {
      try {
        const saved = localStorage.getItem(COLOR_KEY);
        if (saved) setColor(saved);
      } catch {
        /* storage may be unavailable */
      }
      setOpen(true);
    };
    window.addEventListener(OPEN_TERMINAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TERMINAL_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: Math.max(0, e.clientX - dragRef.current.dx), y: Math.max(0, e.clientY - dragRef.current.dy) });
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

  const onTitleDown = (e: ReactMouseEvent) => {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex h-[460px] max-h-[85vh] w-[760px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-edge-strong bg-panel shadow-2xl"
      style={{ left: pos.x, top: pos.y, resize: 'both' }}
      role="dialog"
      aria-label="DARK AGI terminal"
    >
      <div
        className="flex cursor-move select-none items-center gap-2 border-b border-edge bg-panel-2 px-3 py-1.5"
        onMouseDown={onTitleDown}
      >
        <SquareTerminal className="size-3.5 text-accent" aria-hidden />
        <span className="text-[12px] font-medium text-ink">DARK AGI Terminal</span>
        <div className="ml-auto flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
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
          <button type="button" onClick={() => setOpen(false)} className="ml-1 text-ink-3 hover:text-ink" aria-label="Close terminal" title="Close">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <TerminalConsole embedded codeColor={color} />
      </div>
    </div>
  );
}
