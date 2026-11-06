import type { Metadata } from 'next';
import { TerminalConsole } from './terminal-console';

export const metadata: Metadata = { title: 'Terminal · DARK AGI' };

export default function TerminalPage() {
  return <TerminalConsole />;
}
