import type { Metadata } from 'next';
import { EarthMap } from './earth-map';

export const metadata: Metadata = { title: 'Earth Observatory · DARK AGI' };

export default function EarthPage() {
  return <EarthMap />;
}
