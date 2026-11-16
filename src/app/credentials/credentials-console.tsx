'use client';

import { KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/shell/auth';
import { Button, ErrorNotice, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { apiRequest, type ProviderCredential, type ProviderCredentialList } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * Secrets management, step 2a: an admin UI over the encrypted provider-credential store `src/credentials/`
 * already built (step 1) — set, rotate, delete a secret an operation injects at execute time. The secret
 * itself is never part of any API response (ProviderCredentialSchema's own contract), so this page can
 * never show one back, only metadata. `knownProviderIds` is real and server-derived (every providerId at
 * least one OperationAdapter actually declares) — the provider list here is never invented.
 */

const inputClass = 'w-full rounded border border-edge-strong bg-canvas px-2 py-1 text-[12px] text-ink';
const send = (method: string, body?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

interface Row {
  readonly providerId: string;
  readonly item: ProviderCredential | null;
}

/** What to actually type into the secret field, per provider — not every provider takes a bare key
 * (MISP needs a JSON object: baseUrl + apiKey, since it's a self-hosted server, not a single shared API).
 * Providers with no entry here just take a plain key. */
const SECRET_HINTS: Record<string, string> = {
  nasa: 'A plain API key from a free api.nasa.gov account (raises the shared DEMO_KEY rate limit).',
  virustotal: 'A plain API key from your VirusTotal account.',
  misp: 'A JSON object naming your own MISP instance: {"baseUrl":"https://your-misp-instance","apiKey":"..."}',
};

function SetCredentialForm({ providerId, existingLabel, onDone }: { providerId: string; existingLabel: string | null; onDone: () => Promise<unknown> }) {
  const [label, setLabel] = useState(existingLabel ?? '');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<ProviderCredential>(`/credentials/${providerId}`, send('POST', { secret, label: label.trim() || undefined }));
      setSecret('');
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const hint = SECRET_HINTS[providerId];

  return (
    <form className="mt-1.5 space-y-1" onSubmit={(e) => void submit(e)}>
      {error ? <ErrorNotice error={error} /> : null}
      {hint ? <p className="text-[11px] text-ink-3">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <input className={`${inputClass} w-auto`} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={`${inputClass} w-auto`} type="password" placeholder="Secret / API key" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <Button type="submit" variant="primary" busy={busy} disabled={secret.trim().length === 0}>
          {existingLabel !== null ? 'Rotate' : 'Set'} credential
        </Button>
      </div>
    </form>
  );
}

function CredentialRow({ row, canManage, onChanged }: { row: Row; canManage: boolean; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/credentials/${row.providerId}`, send('DELETE'));
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-edge/60 align-top last:border-0">
      <td className="py-2 pr-3 font-mono font-semibold text-ink">
        {row.providerId}
        {error ? (
          <div className="mt-1">
            <ErrorNotice error={error} />
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-3">{row.item ? <StatusBadge tone="good" label="Configured" /> : <StatusBadge tone="warning" label="Not configured" />}</td>
      <td className="py-2 pr-3 text-ink-2">
        {row.item?.label ?? '—'}
        {canManage && editing ? (
          <SetCredentialForm
            providerId={row.providerId}
            existingLabel={row.item?.label ?? null}
            onDone={async () => {
              setEditing(false);
              await onChanged();
            }}
          />
        ) : null}
      </td>
      <td className="py-2 pr-3 text-ink-3">{row.item ? formatDateTime(row.item.rotatedAt ?? row.item.createdAt) : '—'}</td>
      <td className="py-2 pr-3 text-ink-3">{row.item?.lastUsedAt ? formatDateTime(row.item.lastUsedAt) : 'Never'}</td>
      <td className="py-2 text-right">
        {canManage ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {!editing ? (
              <Button onClick={() => setEditing(true)}>
                <KeyRound className="size-3.5" aria-hidden /> {row.item ? 'Rotate' : 'Set'}
              </Button>
            ) : null}
            {row.item ? (
              <Button busy={busy} onClick={() => void remove()}>
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function CredentialsConsole() {
  const { can } = useAuth();
  const credentials = useSWR<ProviderCredentialList>('/credentials');
  const canManage = can('credentials:manage');

  const rows: Row[] = credentials.data
    ? credentials.data.knownProviderIds.map((providerId) => ({ providerId, item: credentials.data!.items.find((i) => i.providerId === providerId) ?? null }))
    : [];

  return (
    <div>
      <title>Provider Credentials · DARK AGI</title>
      <PageHeader
        title="Provider Credentials"
        summary="Encrypted API keys for external providers (e.g. NASA) that an operation injects into its own process at execute time — never logged, never written to a job's stored arguments, never echoed back by this API once saved."
      />
      <div className="space-y-3 p-4">
        {credentials.error ? <ErrorNotice error={credentials.error} /> : null}
        <Panel title="Credentials" subtitle={credentials.data ? `${credentials.data.items.length} configured of ${credentials.data.knownProviderIds.length} known` : undefined}>
          {!credentials.data && !credentials.error ? <Skeleton className="h-24 w-full" /> : null}
          {credentials.data && credentials.data.knownProviderIds.length === 0 ? (
            <p className="text-[12px] text-ink-3">No operation currently requires a provider credential yet.</p>
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-edge">
                    <th className="py-1.5 pr-3 font-medium">Provider</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium">Label</th>
                    <th className="py-1.5 pr-3 font-medium">Set / rotated</th>
                    <th className="py-1.5 pr-3 font-medium">Last used</th>
                    <th className="py-1.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <CredentialRow key={row.providerId} row={row} canManage={canManage} onChanged={() => credentials.mutate()} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
        <div className="flex items-start gap-2 rounded-md border border-edge bg-canvas p-3 text-[11.5px] text-ink-3">
          <ShieldCheck className="size-4 shrink-0 text-ink-2" aria-hidden />
          <p>This secret is encrypted at rest (AES-256-GCM) and never shown again after saving — if you forget it, set a new one to rotate it. {!canManage ? 'Setting or rotating a credential requires the OPERATOR or ADMIN role.' : null}</p>
        </div>
      </div>
    </div>
  );
}
