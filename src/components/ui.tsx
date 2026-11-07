import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

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
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit';
}) {
  const styles =
    variant === 'primary'
      ? 'border-accent-strong bg-accent-strong/90 text-white hover:bg-accent-strong'
      : 'border-edge-strong bg-panel-2 text-ink hover:border-accent/60';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
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

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-ink-3">{label}</dt>
      <dd className="truncate text-right font-mono text-[12px] text-ink">{children}</dd>
    </div>
  );
}
