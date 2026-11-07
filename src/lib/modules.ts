/**
 * Console navigation and module delivery status.
 *
 * `status: 'live'` means the page is backed by implemented backend APIs.
 * `status: 'planned'` pages render an honest "not yet implemented" state —
 * they never show simulated data or inert controls.
 */
export type ModuleStatus = 'live' | 'planned';

export interface ConsoleModule {
  readonly slug: string;
  readonly href: string;
  readonly title: string;
  readonly group: 'Operations' | 'AI' | 'Security Domains' | 'Execution' | 'Governance';
  readonly icon: IconName;
  readonly status: ModuleStatus;
  /** Roadmap phase that delivers (or delivered) the backend capability. */
  readonly phase: number;
  readonly summary: string;
  readonly planned?: readonly string[];
  /** Tool-registry category whose executable operations this domain surfaces (security-domain pages only). */
  readonly category?: string;
}

export type IconName =
  | 'gauge' | 'bot' | 'cpu' | 'wrench' | 'network' | 'shield-alert' | 'globe' | 'monitor'
  | 'search' | 'radar' | 'bug' | 'key' | 'list' | 'scroll' | 'file-text' | 'target' | 'lock' | 'settings' | 'book' | 'terminal' | 'flag' | 'fingerprint';

export const MODULES: readonly ConsoleModule[] = [
  { slug: '', href: '/', title: 'Command Center', group: 'Operations', icon: 'gauge', status: 'live', phase: 1,
    summary: 'Platform health, live host telemetry, environment readiness and recent audit activity.' },
  { slug: 'agents', href: '/agents', title: 'AI Agents', group: 'AI', icon: 'bot', status: 'live', phase: 3,
    summary: 'ORACLE, SENTINEL, RECON and the other specialised agents: instructions, model assignment, memory, bounded delegation and execution history.' },
  { slug: 'models', href: '/models', title: 'Model Registry', group: 'AI', icon: 'cpu', status: 'live', phase: 3,
    summary: 'AI providers (Gemini, OpenAI, Claude, OpenAI-compatible, local Ollama), discovered models, and a streaming test console with fallback.' },
  { slug: 'tools', href: '/tools', title: 'Tool Registry', group: 'AI', icon: 'wrench', status: 'live', phase: 2,
    summary: 'Every supported security tool with verified installation status, version, Windows support and planned operations.' },
  { slug: 'network', href: '/network', title: 'Network Intelligence', group: 'Security Domains', icon: 'network', status: 'live', phase: 5, category: 'network-intelligence',
    summary: 'Authorised host discovery, port and service inventory, DNS inspection — scope-enforced and rate-limited.',
    planned: ['Masscan & ARP discovery adapters', 'Packet-capture analysis (TShark)', 'Scan history and comparison'] },
  { slug: 'windows-security', href: '/windows-security', title: 'Windows Security', group: 'Security Domains', icon: 'monitor', status: 'live', phase: 5, category: 'windows-security',
    summary: 'Process, service and network-connection inventory and Defender posture through reviewed PowerShell/CIM collectors.',
    planned: ['Sysinternals & osquery adapters', 'Startup/registry persistence inventory', 'Event-log analysis'] },
  { slug: 'vulnerabilities', href: '/vulnerabilities', title: 'Vulnerability Assessment', group: 'Security Domains', icon: 'shield-alert', status: 'live', phase: 6, category: 'vulnerability-assessment',
    summary: 'Trivy, Grype, OSV-Scanner (local) and Nuclei (network-target, scope-enforced) scans; results persist to Security Findings.',
    planned: ['CVE/CVSS correlation beyond exact-key matching', 'Remediation tracking'] },
  { slug: 'web-security', href: '/web-security', title: 'Web Security', group: 'Security Domains', icon: 'globe', status: 'live', phase: 6, category: 'web-security',
    summary: 'HTTP security-header auditing for approved hosts; more passive web analysis as adapters land.',
    planned: ['OWASP ZAP, SSLyze adapters', 'Cookie & CORS posture checks', 'Technology identification'] },
  { slug: 'forensics', href: '/forensics', title: 'Digital Forensics', group: 'Security Domains', icon: 'search', status: 'live', phase: 7, category: 'digital-forensics',
    summary: 'File hashing (SHA-256/SHA-1/MD5) and metadata inspection; every hash registers as evidence with a chain of custody (see the Evidence page).',
    planned: ['ExifTool, Sleuth Kit, Volatility 3 adapters', 'Timeline generation'] },
  { slug: 'threat-intel', href: '/threat-intel', title: 'Threat Intelligence', group: 'Security Domains', icon: 'radar', status: 'live', phase: 7, category: 'threat-intelligence',
    summary: 'The platform’s own indicator-of-compromise (IOC) registry — recorded by operators or agents, not a live external lookup.',
    planned: ['VirusTotal/MISP live lookups (needs an operator-supplied API key and a secret-injection path the operation-adapter architecture does not have yet)', 'Sigma / YARA rule library', 'ATT&CK technique mapping'] },
  { slug: 'malware', href: '/malware', title: 'Malware Analysis', group: 'Security Domains', icon: 'bug', status: 'live', phase: 7, category: 'malware-analysis',
    summary: 'Static analysis only — capa, FLOSS and ClamAV read a local file; none of them execute it. File metadata/hashing is on Digital Forensics; YARA and sandbox report ingestion are still planned.',
    planned: ['YARA rule matching', 'Sandbox report ingestion (no local sample execution)'] },
  { slug: 'crypto', href: '/crypto', title: 'Cryptographic Audit', group: 'Security Domains', icon: 'key', status: 'live', phase: 8, category: 'cryptographic-audit',
    summary: 'TLS and certificate inspection for approved hosts; GnuPG signature and key inspection, both read-only — neither ever touches a keyring.',
    planned: ['Cipher policy evaluation', 'Hash auditing restricted to registered test data'] },
  { slug: 'terminal', href: '/terminal', title: 'Terminal', group: 'Execution', icon: 'terminal', status: 'live', phase: 4,
    summary: 'An interactive console for the DARK AGI command language — type dagi commands, see results inline, with history.' },
  { slug: 'commands', href: '/commands', title: 'Command Reference', group: 'Execution', icon: 'book', status: 'live', phase: 4,
    summary: 'Every executable operation and launcher command in one place, with inputs, risk and approval rules.' },
  { slug: 'tasks', href: '/tasks', title: 'Task Queue', group: 'Execution', icon: 'list', status: 'live', phase: 4,
    summary: 'Submit, approve, cancel and inspect jobs run by the Windows execution engine; emergency stop.' },
  { slug: 'logs', href: '/logs', title: 'Execution Logs', group: 'Execution', icon: 'scroll', status: 'live', phase: 1,
    summary: 'Immutable, hash-chained audit trail with integrity verification.' },
  { slug: 'findings', href: '/findings', title: 'Security Findings', group: 'Execution', icon: 'flag', status: 'live', phase: 6,
    summary: 'Normalised vulnerability-assessment findings ingested from succeeded scans (Trivy, Grype, OSV-Scanner, Nuclei), with severity, status and triage.' },
  { slug: 'evidence', href: '/evidence', title: 'Evidence', group: 'Execution', icon: 'fingerprint', status: 'live', phase: 7,
    summary: 'Files identified as evidence by the file-hash operation, each with an append-only chain of custody.' },
  { slug: 'reports', href: '/reports', title: 'Reports', group: 'Execution', icon: 'file-text', status: 'planned', phase: 9,
    summary: 'Security reports generated from normalised findings and evidence.',
    planned: ['Report templates', 'Export to HTML/PDF', 'Evidence references with hashes'] },
  { slug: 'scopes', href: '/scopes', title: 'Scope Management', group: 'Governance', icon: 'target', status: 'live', phase: 4,
    summary: 'Authorized target scopes: the only addresses and domains network operations may touch.' },
  { slug: 'permissions', href: '/permissions', title: 'Permissions', group: 'Governance', icon: 'lock', status: 'live', phase: 2,
    summary: 'Local users, roles and the permission matrix enforced on every API route.' },
  { slug: 'api-access', href: '/api-access', title: 'API Access', group: 'Governance', icon: 'key', status: 'live', phase: 4,
    summary: 'API keys for external programs and AI agents to discover and run the platform’s tools over HTTP — scope, approval and audit still apply.' },
  { slug: 'settings', href: '/settings', title: 'System Settings', group: 'Governance', icon: 'settings', status: 'live', phase: 1,
    summary: 'Windows environment inventory, runtime dependencies and backend connection.' },
];

export const PLANNED_MODULES = MODULES.filter((m) => m.status === 'planned');

export function moduleBySlug(slug: string): ConsoleModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
