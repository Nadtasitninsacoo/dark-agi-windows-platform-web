import type { Metadata } from 'next';
import { CommandReference } from './command-reference';

export const metadata: Metadata = { title: 'Command Reference' };

export default function Page() {
  return <CommandReference />;
}
