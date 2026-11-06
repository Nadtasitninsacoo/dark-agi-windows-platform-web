import { describe, expect, it } from 'vitest';
import type { Operation } from './api/client';
import { CommandError, COMMAND_ALIASES, commandTemplate, parseCommand, tokenizeCommand } from './commands';

const op = (toolId: string, operationId: string, fields: { name: string; type: 'text' | 'integer' | 'targets' }[]): Operation =>
  ({ toolId, operationId, fields: fields.map((f) => ({ ...f, label: f.name, required: false, default: null, min: null, max: null, help: '' })) }) as unknown as Operation;

const OPS: Operation[] = [
  op('powershell', 'dns-inspection', [{ name: 'host', type: 'text' }]),
  op('powershell', 'tcp-connect-scan', [{ name: 'host', type: 'text' }, { name: 'ports', type: 'text' }]),
  op('powershell', 'event-log-query', [{ name: 'logName', type: 'text' }, { name: 'maxEvents', type: 'integer' }]),
  op('nmap', 'port-inventory', [{ name: 'targets', type: 'targets' }]),
];

describe('DARK AGI command language', () => {
  it('parses a branded command into a validated job submission, coercing by field type', () => {
    expect(parseCommand('dagi net:dns host=example.com keng', OPS)).toEqual({ toolId: 'powershell', operationId: 'dns-inspection', input: { host: 'example.com' } });
    expect(parseCommand('dagi win:events logName=System maxEvents=10 keng', OPS)).toEqual({ toolId: 'powershell', operationId: 'event-log-query', input: { logName: 'System', maxEvents: 10 } });
    expect(parseCommand('dagi net:ports targets=10.0.0.0/30,host.example keng', OPS)).toEqual({ toolId: 'nmap', operationId: 'port-inventory', input: { targets: ['10.0.0.0/30', 'host.example'] } });
  });

  it('honours double-quoted values for paths with spaces', () => {
    expect(tokenizeCommand('dagi fs:hash path="C:\\Program Files\\a.exe" keng')).toEqual(['dagi', 'fs:hash', 'path=C:\\Program Files\\a.exe', 'keng']);
  });

  it('builds a ready-to-type template with <field> placeholders', () => {
    expect(commandTemplate(op('powershell', 'dns-inspection', [{ name: 'host', type: 'text' }]))).toBe('dagi net:dns host=<host> keng');
  });

  it('gives every alias a unique verb', () => {
    const verbs = Object.values(COMMAND_ALIASES);
    expect(new Set(verbs).size).toBe(verbs.length);
  });

  it('rejects malformed commands with a clear error', () => {
    for (const bad of [
      'net:dns host=x keng', // missing prefix
      'dagi net:dns host=x', // missing suffix
      'dagi bogus host=x keng', // unknown command
      'dagi net:dns badtoken keng', // not key=value
      'dagi net:dns nofield=x keng', // unknown field
    ]) {
      expect(() => parseCommand(bad, OPS)).toThrow(CommandError);
    }
  });
});
