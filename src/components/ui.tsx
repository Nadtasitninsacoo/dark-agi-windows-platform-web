'use client';

import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-edge bg-panel ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-edge px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-2">{title}</h2>
          {subtitle ? <p className="truncate text-[11px] text-ink-3">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

export type StatusTone = 'good' | 'warning' | 'critical' | 'neutral' | 'pending';

const TONE_STYLES: Record<StatusTone, { text: string; border: string; Icon: typeof CheckCircle2 }> = {
  good: { text: 'text-good', border: 'border-good/30 bg-good/10', Icon: CheckCircle2 },
  warning: { text: 'text-warning', border: 'border-warning/30 bg-warning/10', Icon: AlertTriangle },
  critical: { text: 'text-critical', border: 'border-critical/30 bg-critical/10', Icon: XCircle },
  neutral: { text: 'text-ink-2', border: 'border-edge-strong bg-panel-2', Icon: CircleDashed },
  pending: { text: 'text-ink-2', border: 'border-edge-strong bg-panel-2', Icon: Loader2 },
};

/** Status is always icon + label — never color alone. */
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const { text, border, Icon } = TONE_STYLES[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${border} ${text}`}>
      <Icon className={`size-3 ${tone === 'pending' ? 'animate-spin' : ''}`} aria-hidden />
      {label}
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  busy,
  variant = 'secondary',
  type = 'button',
  autoFocus,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  autoFocus?: boolean;
}) {
  const styles =
    variant === 'primary'
      ? 'border-accent-strong bg-accent-strong/90 text-white hover:bg-accent-strong'
      : variant === 'danger'
        ? 'border-critical/60 bg-critical/20 text-critical hover:bg-critical/30'
        : 'border-edge-strong bg-panel-2 text-ink hover:border-accent/60';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      autoFocus={autoFocus}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/**
 * A styled stand-in for `window.confirm` — same job (make sure a destructive, unrecoverable action was
 * meant), but matching this app's own look instead of the browser's native chrome. Escape and a click on
 * the backdrop both cancel; the default-focused button is always Cancel, never the destructive one, so
 * an accidental Enter never confirms it.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-[1px]" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dagi-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-md border border-critical/30 bg-panel shadow-2xl"
      >
        <div className="flex items-start gap-2.5 border-b border-edge px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />
          <h2 id="dagi-confirm-title" className="text-[13px] font-semibold text-ink">
            {title}
          </h2>
        </div>
        <div className="px-4 py-3 text-[12.5px] text-ink-2">{body}</div>
        <div className="flex items-center justify-end gap-2 border-t border-edge px-4 py-3">
          <Button onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A 400 from ZodValidationPipe: `{ message, issues: [{ path, message }] }` — duck-typed to avoid importing ApiError here. */
function validationIssues(error: unknown): { path: string; message: string }[] | null {
  if (typeof error !== 'object' || error === null || !('body' in error)) return null;
  const body = (error as { body: unknown }).body;
  if (typeof body !== 'object' || body === null || !('issues' in body)) return null;
  const issues = (body as { issues: unknown }).issues;
  return Array.isArray(issues) ? (issues as { path: string; message: string }[]) : null;
}

export function ErrorNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const issues = validationIssues(error);
  return (
    <div role="alert" className="flex items-start gap-2 rounded border border-critical/30 bg-critical/10 px-3 py-2 text-[12px] text-ink">
      <XCircle className="mt-0.5 size-3.5 shrink-0 text-critical" aria-hidden />
      <div>
        <span>{message}</span>
        {issues && issues.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px] text-ink-2">
            {issues.map((i, idx) => (
              <li key={idx}>
                {i.path ? <span className="font-mono text-ink-3">{i.path}: </span> : null}
                {i.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-panel-2 ${className}`} />;
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-accent-strong bg-accent-strong/80' : 'border-edge-strong bg-panel-2'
      }`}
    >
      <span className={`inline-block size-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** A fixed-height, scrollable monospace pane for data that can run arbitrarily long (a target list with
 * hundreds of addresses, raw command argv, stdout/stderr) — looks and behaves like a terminal window
 * instead of stretching the page down. Content scrolls inside; the page around it never grows with it. */
export function TerminalBox({ children, className = '', maxHeight = '7rem' }: { children: ReactNode; className?: string; maxHeight?: string }) {
  return (
    <pre
      className={`overflow-y-auto overflow-x-hidden rounded border border-edge-strong bg-canvas px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-ink-2 ${className}`}
      style={{ maxHeight }}
    >
      {children}
    </pre>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-ink-3">{label}</dt>
      <dd className="truncate text-right font-mono text-[12px] text-ink">{children}</dd>
    </div>
  );
}
