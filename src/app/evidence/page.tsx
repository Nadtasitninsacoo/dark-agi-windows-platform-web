import type { Metadata } from 'next';
import { EvidenceConsole } from './evidence-console';

export const metadata: Metadata = { title: 'Evidence · DARK AGI' };

export default function EvidencePage() {
  return <EvidenceConsole />;
}
