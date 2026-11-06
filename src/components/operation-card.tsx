'use client';

import { Check, Copy, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { StatusBadge, type StatusTone } from '@/components/ui';
import type { Operation } from '@/lib/api/client';
import { commandTemplate } from '@/lib/commands';

/**
 * One executable operation, with its risk/approval/availability badges, input
 * fields and a link to run it in the Task Queue. Shared by the Command
 * Reference and every security-domain page so they render operations identically.
 */

export const RISK: Record<string, StatusTone> = { low: 'neutral', moderate: 'warning', high: 'critical' };

export const CATEGORY_LABEL: Record<string, string> = {
  'network-intelligence': 'Network Intelligence',
  'vulnerability-assessment': 'Vulnerability Assessment',
  'web-security': 'Web Security',
  'windows-security': 'Windows Security',
  'digital-forensics': 'Digital Forensics',
  'threat-intelligence': 'Threat Intelligence',
  'malware-analysis': 'Malware Analysis',
  'cryptographic-audit': 'Cryptographic Audit',
};

function CopyButton({ text, label }: { text: string; label: string }) {
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
      className="inline-flex items-center gap-1 rounded border border-edge-strong px-2 py-0.5 text-[11.5px] text-ink-2 hover:bg-canvas"
      title="Copy a ready-to-use JSON request body"
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function OperationCard({ op, canSubmit }: { op: Operation; canSubmit: boolean }) {
  return (
    <div className="rounded-md border border-edge bg-canvas/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{op.title}</h3>
          <p className="font-mono text-[11px] text-ink-3">
            {op.toolId} / {op.operationId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge tone={RISK[op.risk] ?? 'neutral'} label={`${op.risk} risk`} />
          <StatusBadge tone={op.requiresApproval ? 'warning' : 'neutral'} label={op.requiresApproval ? 'Needs approval' : 'No approval (people)'} />
          <StatusBadge tone={op.available ? 'good' : 'neutral'} label={op.available ? 'Ready on this machine' : 'Not available'} />
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-ink-2">{op.description}</p>
      {!op.available && op.unavailableReason ? <p className="mt-1 text-[11.5px] text-warning">{op.unavailableReason}</p> : null}

      <div className="mt-2 text-[11.5px]">
        {op.fields.length === 0 ? (
          <p className="text-ink-3">No input — inspects this machine only.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="pr-3 font-medium">Field</th>
                <th className="pr-3 font-medium">Required</th>
                <th className="pr-3 font-medium">Default / range</th>
                <th className="font-medium">What to enter</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {op.fields.map((f) => (
                <tr key={f.name} className="align-top">
                  <td className="pr-3 font-mono text-ink">{f.name}</td>
                  <td className="pr-3">{f.required ? 'yes' : 'no'}</td>
                  <td className="pr-3 font-mono">
                    {f.default !== null ? String(f.default) : '—'}
                    {f.min !== null && f.max !== null ? ` (${f.min}–${f.max})` : ''}
                  </td>
                  <td>{f.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 rounded border border-edge bg-canvas/60 px-2 py-1 font-mono text-[11px] text-ink-2">
        <span className="shrink-0 select-none text-ink-3">$</span>
        <span className="break-all">{commandTemplate(op)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
        <span>
          {op.targetKind === 'network' ? `Targets must be inside one active scope · max ${op.maxAddresses} addresses · ` : 'Local machine · '}
          timeout {Math.round(op.timeoutMs / 60_000)} min · {op.maxConcurrent} at a time · AI-agent requests always need approval
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <CopyButton text={commandTemplate(op)} label="Copy command" />
          {canSubmit && op.available ? (
            <Link
              href={`/tasks?op=${encodeURIComponent(`${op.toolId}:${op.operationId}`)}`}
              className="inline-flex items-center gap-1 rounded border border-accent-strong bg-accent-strong/90 px-2 py-0.5 text-[11.5px] font-medium text-white hover:bg-accent-strong"
            >
              <Play className="size-3" aria-hidden /> Use this command
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
