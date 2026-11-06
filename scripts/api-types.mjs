#!/usr/bin/env node
/**
 * Regenerates src/lib/api/schema.d.ts from the backend's OpenAPI contract.
 *
 * Source, first match wins:
 *   1. first argument            npm run api:types -- <path-or-url>
 *   2. OPENAPI_SPEC env variable a path or URL
 *   3. ../dark-agi-backend/openapi.json (backend repository cloned next to this one)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const source = process.argv[2] || process.env.OPENAPI_SPEC || '../dark-agi-backend/openapi.json';
if (!/^https?:\/\//.test(source) && !existsSync(source)) {
  console.error(`OpenAPI spec not found: ${source}`);
  console.error('Pass a path or URL: npm run api:types -- <path-or-url>, or set OPENAPI_SPEC.');
  process.exit(1);
}

// The package's exports map hides bin/cli.js, so call the bin file directly.
const cli = join(import.meta.dirname, '..', 'node_modules', 'openapi-typescript', 'bin', 'cli.js');
const result = spawnSync(process.execPath, [cli, source, '-o', 'src/lib/api/schema.d.ts'], { stdio: 'inherit', cwd: join(import.meta.dirname, '..') });
process.exit(result.status ?? 1);
