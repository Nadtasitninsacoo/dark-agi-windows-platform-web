import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatPercent, shortHash, utilisationLevel } from './format';
import { MODULES, PLANNED_MODULES, moduleBySlug } from './modules';
import { apiUrl } from './api/client';

describe('format helpers', () => {
  it('formats bytes with binary units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(16_942_501_888)).toBe('15.8 GB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('formats durations compactly', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3 * 3600 + 120)).toBe('3h 2m');
    expect(formatDuration(2 * 86_400 + 3600)).toBe('2d 1h');
  });

  it('formats percents and hashes, tolerating nulls', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(44.71)).toBe('44.7%');
    expect(shortHash('abcdef0123456789', 6)).toBe('abcdef');
    expect(shortHash(null)).toBe('—');
  });

  it('bands utilisation', () => {
    expect(utilisationLevel(10)).toBe('good');
    expect(utilisationLevel(85)).toBe('warning');
    expect(utilisationLevel(98.1)).toBe('critical');
    expect(utilisationLevel(null)).toBe('unknown');
  });
});

describe('module registry', () => {
  it('covers all 18 required console pages with unique routes', () => {
    const required = [
      'Command Center', 'AI Agents', 'Model Registry', 'Tool Registry', 'Network Intelligence', 'Vulnerability Assessment',
      'Web Security', 'Windows Security', 'Digital Forensics', 'Threat Intelligence', 'Malware Analysis', 'Cryptographic Audit',
      'Task Queue', 'Execution Logs', 'Reports', 'Scope Management', 'Permissions', 'System Settings',
    ];
    const titles = MODULES.map((m) => m.title);
    expect(required.filter((t) => !titles.includes(t))).toEqual([]);
    expect(new Set(MODULES.map((m) => m.href)).size).toBe(MODULES.length);
  });

  it('documents planned capabilities for every planned module', () => {
    for (const m of PLANNED_MODULES) expect(m.planned?.length ?? 0).toBeGreaterThan(0);
    expect(moduleBySlug('logs')?.status).toBe('live');
  });
});

describe('apiUrl', () => {
  it('encodes query parameters and drops empty values', () => {
    const url = new URL(apiUrl('/audit/events', { limit: 10, before: undefined, action: 'a b&c' }));
    expect(url.pathname).toBe('/api/v1/audit/events');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.has('before')).toBe(false);
    expect(url.searchParams.get('action')).toBe('a b&c');
  });
});
