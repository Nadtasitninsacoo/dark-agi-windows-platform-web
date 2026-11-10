import type { Metadata } from 'next';
import { AttackGraphConsole } from './attack-graph-console';

export const metadata: Metadata = { title: 'Attack Graph · DARK AGI' };

export default function AttackGraphPage() {
  return <AttackGraphConsole />;
}
