import { describe, expect, it } from 'vitest';
import type { Operation } from './api/client';
import { CommandError, commandHint, COMMAND_ALIASES, commandTemplate, parseCommand, suggestCommand, tokenizeCommand } from './commands';

const op = (toolId: string, operationId: string, fields: { name: string; type: 'text' | 'integer' | 'targets' }[]): Operation =>
  ({ toolId, operationId, title: operationId, fields: fields.map((f) => ({ ...f, label: f.name, required: false, default: null, min: null, max: null, help: '' })) }) as unknown as Operation;

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

describe('autocomplete', () => {
  it('suggests matching verbs while the command name is being typed', () => {
    const suggestions = suggestCommand('dagi net:d', OPS);
    expect(suggestions).toContainEqual({ completion: 'dagi net:dns ', label: 'net:dns', detail: 'dns-inspection' });
  });

  it('suggests unused field names once a known verb is typed', () => {
    expect(suggestCommand('dagi net:dns ho', OPS)).toEqual([{ completion: 'dagi net:dns host=', label: 'host=', detail: '' }]);
    // Already-supplied fields drop out of the suggestions; the closing suffix is always offered too (remaining fields are optional).
    expect(suggestCommand('dagi win:events logName=System ', OPS)).toEqual([
      { completion: 'dagi win:events logName=System maxEvents=', label: 'maxEvents=', detail: '' },
      { completion: 'dagi win:events logName=System keng', label: 'keng', detail: 'Finish and run the command' },
    ]);
  });

  it('suggests the closing suffix once fields are typed, and nothing for an unknown verb', () => {
    expect(suggestCommand('dagi net:dns host=example.com ', OPS)).toEqual([{ completion: 'dagi net:dns host=example.com keng', label: 'keng', detail: 'Finish and run the command' }]);
    expect(suggestCommand('dagi bogus ', OPS)).toEqual([]);
  });
});

describe('command hint (execution preview)', () => {
  const REQUIRED_OPS: Operation[] = [
    { toolId: 'powershell', operationId: 'dns-inspection', fields: [{ name: 'host', label: 'Host', type: 'text', required: true, default: null, min: null, max: null, help: '' }] } as unknown as Operation,
  ];

  it('is not ready until a known verb, every required field and the suffix are present', () => {
    expect(commandHint('dagi', OPS)).toMatchObject({ alias: null, operation: null, ready: false });
    expect(commandHint('dagi bogus', OPS)).toMatchObject({ alias: 'bogus', operation: null, ready: false });
    expect(commandHint('dagi net:dns', REQUIRED_OPS)).toMatchObject({ alias: 'net:dns', missingRequiredFields: ['host'], ready: false });
    expect(commandHint('dagi net:dns host=example.com', REQUIRED_OPS)).toMatchObject({ missingRequiredFields: [], ready: false }); // no "keng" yet
    expect(commandHint('dagi net:dns host=example.com keng', REQUIRED_OPS)).toMatchObject({ missingRequiredFields: [], ready: true });
  });
});
