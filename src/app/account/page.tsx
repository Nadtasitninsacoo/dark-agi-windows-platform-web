import type { Metadata } from 'next';
import { AccountConsole } from './account-console';

export const metadata: Metadata = { title: 'Account' };

export default function Page() {
  return <AccountConsole />;
}
