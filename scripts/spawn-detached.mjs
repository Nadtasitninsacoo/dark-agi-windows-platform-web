#!/usr/bin/env node
/**
 * Starts a long-running Node process detached from the caller, with stdout and
 * stderr appended to log files, and writes the child PID to a file.
 *
 * the launcher script (scripts/*.ps1) launches this helper through WMI (Win32_Process.Create) so that
 * no handle of the caller (console, pipes) is inherited by the long-lived
 * server — on Windows, CreateProcess(bInheritHandles=TRUE) otherwise passes
 * every inheritable handle down the whole process tree, which keeps the
 * caller's output pipe open and hangs anything that reads it.
 *
 * Usage: node spawn-detached.mjs <cwd> <stdout.log> <stderr.log> <pidfile> -- <node args...>
 */
import { spawn } from 'node:child_process';
import { openSync, writeFileSync } from 'node:fs';

const [cwd, outLog, errLog, pidFile, separator, ...args] = process.argv.slice(2);
if (!cwd || !outLog || !errLog || !pidFile || separator !== '--' || args.length === 0) {
  console.error('Usage: node spawn-detached.mjs <cwd> <stdout.log> <stderr.log> <pidfile> -- <node args...>');
  process.exit(2);
}

const child = spawn(process.execPath, args, {
  cwd,
  detached: true,
  windowsHide: true,
  shell: false,
  stdio: ['ignore', openSync(outLog, 'a'), openSync(errLog, 'a')],
});
child.on('error', (error) => {
  writeFileSync(errLog, `spawn failed: ${error.message}\n`, { flag: 'a' });
  process.exit(1);
});
child.on('spawn', () => {
  writeFileSync(pidFile, String(child.pid), 'ascii');
  child.unref();
  process.exit(0);
});
