/**
 * DARK AGI command language — the platform's own, branded command set.
 *
 * A command reads like a shell line but is never executed as one: it is parsed
 * into a validated { toolId, operationId, input } job submission. The server
 * still enforces the input schema, scope and approval, so this is only a
 * friendlier surface over POST /jobs — not free-form command execution.
 *
 *   dagi net:dns host=example.com keng
 *   dagi net:scan host=10.0.0.5 ports=80,443,8000-8100 keng
 *   dagi fs:hash path="C:\Program Files\app\app.exe" keng
 */
import type { Operation } from './api/client';

export const COMMAND_PREFIX = 'dagi';
export const COMMAND_SUFFIX = 'keng';

/** Branded command verb for each operation, keyed by `${toolId}:${operationId}`. */
export const COMMAND_ALIASES: Record<string, string> = {
  'nmap:host-discovery': 'net:ping',
  'nmap:port-inventory': 'net:ports',
  'nmap:service-identification': 'net:services',
  'masscan:rate-limited-port-scan': 'net:massscan',
  'powershell:dns-inspection': 'net:dns',
  'powershell:arp-discovery': 'net:arp',
  'powershell:tcp-connect-scan': 'net:scan',
  'powershell:ip-configuration': 'net:ipconfig',
  'powershell:routing-table': 'net:route',
  'powershell:traceroute': 'net:trace',
  'powershell:http-security-headers': 'web:headers',
  'powershell:http-request': 'web:get',
  'powershell:tls-inspection': 'crypto:tls',
  'powershell:certificate-inspector': 'crypto:cert',
  'powershell:process-inventory': 'win:procs',
  'powershell:service-inventory': 'win:services',
  'powershell:network-connections': 'win:netstat',
  'defender:status': 'win:defender',
  'powershell:firewall-profiles': 'win:firewall',
  'powershell:scheduled-tasks': 'win:tasks',
  'powershell:startup-items': 'win:startup',
  'powershell:installed-software': 'win:software',
  'powershell:system-info': 'win:sysinfo',
  'powershell:event-log-query': 'win:events',
  'powershell:file-hash': 'fs:hash',
  'powershell:file-metadata': 'fs:meta',
  'trivy:filesystem-scan': 'vuln:trivyfs',
  'trivy:image-scan': 'vuln:trivyimage',
  'grype:filesystem-scan': 'vuln:grype',
  'osv-scanner:lockfile-scan': 'vuln:osv',
  'nuclei:template-scan': 'vuln:nuclei',
  'capa:capabilities': 'malware:capa',
  'floss:strings': 'malware:floss',
  'clamav:scan': 'malware:clamav',
  'gnupg:verify-signature': 'crypto:gpgverify',
  'gnupg:key-inspection': 'crypto:gpgkey',
};

const KEY_BY_ALIAS = new Map(Object.entries(COMMAND_ALIASES).map(([key, alias]) => [alias, key]));

const key = (op: Pick<Operation, 'toolId' | 'operationId'>): string => `${op.toolId}:${op.operationId}`;

export function aliasFor(op: Pick<Operation, 'toolId' | 'operationId'>): string | undefined {
  return COMMAND_ALIASES[key(op)];
}

/** A ready-to-type command line for an operation, with each field as `name=<name>` or its default. */
export function commandTemplate(op: Operation): string {
  const alias = aliasFor(op) ?? key(op);
  const parts = op.fields.map((f) => `${f.name}=${f.default !== null && f.default !== undefined ? f.default : `<${f.name}>`}`);
  return [COMMAND_PREFIX, alias, ...parts, COMMAND_SUFFIX].join(' ');
}

export class CommandError extends Error {}

/** Splits a command line into tokens, honouring double-quoted values (for paths with spaces). */
export function tokenizeCommand(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let started = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
      started = true;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);
  return tokens;
}

function coerce(field: Operation['fields'][number], value: string): unknown {
  if (field.type === 'integer') {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new CommandError(`"${field.name}" must be a number`);
    return n;
  }
  if (field.type === 'targets') return value.split(',').map((t) => t.trim()).filter(Boolean);
  return value;
}

/**
 * Parses a `dagi … keng` command into a job submission, coercing each value by
 * its field type. Throws CommandError with a human-readable message.
 */
export function parseCommand(line: string, operations: readonly Operation[]): { toolId: string; operationId: string; input: Record<string, unknown> } {
  const tokens = tokenizeCommand(line.trim());
  if (tokens.length < 3) throw new CommandError(`A command looks like: ${COMMAND_PREFIX} <command> key=value … ${COMMAND_SUFFIX}`);
  if (tokens[0] !== COMMAND_PREFIX) throw new CommandError(`Commands must start with "${COMMAND_PREFIX}"`);
  if (tokens[tokens.length - 1] !== COMMAND_SUFFIX) throw new CommandError(`Commands must end with "${COMMAND_SUFFIX}"`);

  const alias = tokens[1]!;
  const opKey = KEY_BY_ALIAS.get(alias);
  if (!opKey) throw new CommandError(`Unknown command "${alias}". See the Command Reference for the full list.`);
  const op = operations.find((o) => key(o) === opKey);
  if (!op) throw new CommandError(`Command "${alias}" is not available right now.`);

  const input: Record<string, unknown> = {};
  for (const token of tokens.slice(2, -1)) {
    const eq = token.indexOf('=');
    if (eq < 1) throw new CommandError(`"${token}" must be written as key=value`);
    const name = token.slice(0, eq);
    const value = token.slice(eq + 1);
    const field = op.fields.find((f) => f.name === name);
    if (!field) throw new CommandError(`"${name}" is not a field of ${alias}. Fields: ${op.fields.map((f) => f.name).join(', ') || '(none)'}`);
    input[name] = coerce(field, value);
  }
  const colon = opKey.indexOf(':');
  return { toolId: opKey.slice(0, colon), operationId: opKey.slice(colon + 1), input };
}

function operationForAlias(alias: string, operations: readonly Operation[]): Operation | undefined {
  const opKey = KEY_BY_ALIAS.get(alias);
  return opKey ? operations.find((o) => key(o) === opKey) : undefined;
}

export interface Suggestion {
  /** The full input value to use when this suggestion is accepted. */
  readonly completion: string;
  /** What to show in the dropdown. */
  readonly label: string;
  readonly detail: string;
}

const MAX_SUGGESTIONS = 8;

/**
 * Suggests completions for the token currently being typed (the one under the
 * cursor at the end of `line`), given everything typed before it. Pure and
 * cheap enough to call on every keystroke.
 */
export function suggestCommand(line: string, operations: readonly Operation[]): readonly Suggestion[] {
  const endsWithSpace = /\s$/.test(line);
  const tokens = tokenizeCommand(line);
  const position = endsWithSpace ? tokens.length : Math.max(0, tokens.length - 1);
  const partial = (endsWithSpace ? '' : (tokens[tokens.length - 1] ?? '')).toLowerCase();
  const prefixTokens = endsWithSpace ? tokens : tokens.slice(0, -1);
  const join = (token: string) => [...prefixTokens, token].join(' ');

  if (position === 0) {
    return COMMAND_PREFIX.startsWith(partial) && COMMAND_PREFIX !== partial
      ? [{ completion: `${COMMAND_PREFIX} `, label: COMMAND_PREFIX, detail: 'Start a DARK AGI command' }]
      : [];
  }
  if (tokens[0] !== COMMAND_PREFIX) return [];

  if (position === 1) {
    return Object.values(COMMAND_ALIASES)
      .filter((alias) => alias.toLowerCase().includes(partial))
      .toSorted((a, b) => a.localeCompare(b))
      .slice(0, MAX_SUGGESTIONS)
      .map((alias) => {
        const op = operationForAlias(alias, operations);
        return { completion: `${join(alias)} `, label: alias, detail: op?.title ?? '' };
      });
  }

  const op = operationForAlias(tokens[1]!, operations);
  if (!op) return [];
  const used = new Set(prefixTokens.slice(2).map((t) => t.slice(0, t.indexOf('='))).filter(Boolean));
  const fieldSuggestions = op.fields
    .filter((f) => !used.has(f.name) && f.name.toLowerCase().includes(partial))
    .map((f) => ({ completion: join(`${f.name}=`), label: `${f.name}=`, detail: f.help }));
  const suffixSuggestion = COMMAND_SUFFIX.toLowerCase().includes(partial) ? [{ completion: join(COMMAND_SUFFIX), label: COMMAND_SUFFIX, detail: 'Finish and run the command' }] : [];
  return [...fieldSuggestions, ...suffixSuggestion].slice(0, MAX_SUGGESTIONS);
}

export interface CommandHint {
  readonly alias: string | null;
  readonly operation: Operation | null;
  readonly missingRequiredFields: readonly string[];
  /** True once the command has everything parseCommand needs to submit (barring value errors). */
  readonly ready: boolean;
}

/** A live, pre-submit summary of what a command line currently resolves to — the "execution preview". */
export function commandHint(line: string, operations: readonly Operation[]): CommandHint {
  const tokens = tokenizeCommand(line);
  if (tokens[0] !== COMMAND_PREFIX || tokens.length < 2) return { alias: null, operation: null, missingRequiredFields: [], ready: false };
  const alias = tokens[1]!;
  const op = operationForAlias(alias, operations);
  if (!op) return { alias, operation: null, missingRequiredFields: [], ready: false };
  const present = new Set(tokens.slice(2).map((t) => t.slice(0, t.indexOf('='))).filter(Boolean));
  const missingRequiredFields = op.fields.filter((f) => f.required && !present.has(f.name)).map((f) => f.name);
  const hasSuffix = tokens[tokens.length - 1] === COMMAND_SUFFIX && tokens.length > 2;
  return { alias, operation: op, missingRequiredFields, ready: missingRequiredFields.length === 0 && hasSuffix };
}
