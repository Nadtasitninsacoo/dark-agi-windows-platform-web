import type { Metadata } from 'next';
import { ScopesConsole } from './scopes-console';

export const metadata: Metadata = { title: 'Scope Management' };

export default function Page() {
  return <ScopesConsole />;
}
