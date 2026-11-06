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
}

export type IconName =
  | 'gauge' | 'bot' | 'cpu' | 'wrench' | 'network' | 'shield-alert' | 'globe' | 'monitor'
  | 'search' | 'radar' | 'bug' | 'key' | 'list' | 'scroll' | 'file-text' | 'target' | 'lock' | 'settings' | 'book';

export const MODULES: readonly ConsoleModule[] = [
  { slug: '', href: '/', title: 'Command Center', group: 'Operations', icon: 'gauge', status: 'live', phase: 1,
    summary: 'Platform health, live host telemetry, environment readiness and recent audit activity.' },
  { slug: 'agents', href: '/agents', title: 'AI Agents', group: 'AI', icon: 'bot', status: 'live', phase: 3,
    summary: 'ORACLE, SENTINEL, RECON and the other specialised agents: instructions, model assignment, memory, bounded delegation and execution history.' },
  { slug: 'models', href: '/models', title: 'Model Registry', group: 'AI', icon: 'cpu', status: 'live', phase: 3,
    summary: 'AI providers (Gemini, OpenAI, Claude, OpenAI-compatible, local Ollama), discovered models, and a streaming test console with fallback.' },
  { slug: 'tools', href: '/tools', title: 'Tool Registry', group: 'AI', icon: 'wrench', status: 'live', phase: 2,
    summary: 'Every supported security tool with verified installation status, version, Windows support and planned operations.' },
  { slug: 'network', href: '/network', title: 'Network Intelligence', group: 'Security Domains', icon: 'network', status: 'planned', phase: 5,
    summary: 'Authorised host discovery, port and service inventory, packet capture analysis.',
    planned: ['Nmap / TShark adapters', 'Scope-enforced targets with rate limits', 'Normalised host/service inventory'] },
  { slug: 'windows-security', href: '/windows-security', title: 'Windows Security', group: 'Security Domains', icon: 'monitor', status: 'planned', phase: 5,
    summary: 'Processes, services, startup items, registry, event logs and Defender posture.',
    planned: ['PowerShell/CIM inventory collectors', 'Sysinternals & osquery adapters', 'Defender status and event log analysis'] },
  { slug: 'vulnerabilities', href: '/vulnerabilities', title: 'Vulnerability Assessment', group: 'Security Domains', icon: 'shield-alert', status: 'planned', phase: 6,
    summary: 'Finding inventory, CVE correlation, CVSS prioritisation and deduplication.',
    planned: ['Nuclei, Trivy, Grype, OSV-Scanner adapters', 'Finding normalisation & dedup', 'Remediation tracking'] },
  { slug: 'web-security', href: '/web-security', title: 'Web Security', group: 'Security Domains', icon: 'globe', status: 'planned', phase: 6,
    summary: 'HTTP/TLS configuration, security headers, technology identification and passive analysis.',
    planned: ['OWASP ZAP, SSLyze adapters', 'Header & TLS posture checks', 'Licensed commercial integrations only when installed'] },
  { slug: 'forensics', href: '/forensics', title: 'Digital Forensics', group: 'Security Domains', icon: 'search', status: 'planned', phase: 7,
    summary: 'Evidence inventory with chain of custody, hashing, metadata, memory and timeline analysis.',
    planned: ['Evidence store with SHA-256 and custody log', 'ExifTool, Sleuth Kit, Volatility 3 adapters', 'Timeline generation'] },
  { slug: 'threat-intel', href: '/threat-intel', title: 'Threat Intelligence', group: 'Security Domains', icon: 'radar', status: 'planned', phase: 7,
    summary: 'IOCs, detection rules, CVE intelligence and MITRE ATT&CK mapping.',
    planned: ['IOC management', 'Sigma / YARA rule library', 'ATT&CK technique mapping'] },
  { slug: 'malware', href: '/malware', title: 'Malware Analysis', group: 'Security Domains', icon: 'bug', status: 'planned', phase: 8,
    summary: 'Static analysis only: PE metadata, hashes, strings, capa/YARA matching, sandbox report ingestion.',
    planned: ['PE metadata & hashing', 'FLOSS / capa / YARA / ClamAV adapters', 'No sample execution outside a configured isolated environment'] },
  { slug: 'crypto', href: '/crypto', title: 'Cryptographic Audit', group: 'Security Domains', icon: 'key', status: 'planned', phase: 8,
    summary: 'TLS and certificate inspection, crypto policy and password policy evaluation.',
    planned: ['OpenSSL / GnuPG adapters', 'Certificate and cipher policy checks', 'Hash auditing restricted to registered test data'] },
  { slug: 'commands', href: '/commands', title: 'Command Reference', group: 'Execution', icon: 'book', status: 'live', phase: 4,
    summary: 'Every executable operation and launcher command in one place, with inputs, risk and approval rules.' },
  { slug: 'tasks', href: '/tasks', title: 'Task Queue', group: 'Execution', icon: 'list', status: 'live', phase: 4,
    summary: 'Submit, approve, cancel and inspect jobs run by the Windows execution engine; emergency stop.' },
  { slug: 'logs', href: '/logs', title: 'Execution Logs', group: 'Execution', icon: 'scroll', status: 'live', phase: 1,
    summary: 'Immutable, hash-chained audit trail with integrity verification.' },
  { slug: 'reports', href: '/reports', title: 'Reports', group: 'Execution', icon: 'file-text', status: 'planned', phase: 9,
    summary: 'Security reports generated from normalised findings and evidence.',
    planned: ['Report templates', 'Export to HTML/PDF', 'Evidence references with hashes'] },
  { slug: 'scopes', href: '/scopes', title: 'Scope Management', group: 'Governance', icon: 'target', status: 'live', phase: 4,
    summary: 'Authorized target scopes: the only addresses and domains network operations may touch.' },
  { slug: 'permissions', href: '/permissions', title: 'Permissions', group: 'Governance', icon: 'lock', status: 'live', phase: 2,
    summary: 'Local users, roles and the permission matrix enforced on every API route.' },
  { slug: 'settings', href: '/settings', title: 'System Settings', group: 'Governance', icon: 'settings', status: 'live', phase: 1,
    summary: 'Windows environment inventory, runtime dependencies and backend connection.' },
];

export const PLANNED_MODULES = MODULES.filter((m) => m.status === 'planned');

export function moduleBySlug(slug: string): ConsoleModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
