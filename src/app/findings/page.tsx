import type { Metadata } from 'next';
import { FindingsConsole } from './findings-console';

export const metadata: Metadata = { title: 'Security Findings · DARK AGI' };

export default function FindingsPage() {
  return <FindingsConsole />;
}
