import type { Metadata } from 'next';
import { DefenseRadar } from './defense-radar';

export const metadata: Metadata = { title: 'Active Defense · DARK AGI' };

export default function DefensePage() {
  return <DefenseRadar />;
}
