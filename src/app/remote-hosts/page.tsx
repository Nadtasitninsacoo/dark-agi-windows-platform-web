import type { Metadata } from 'next';
import { RemoteHostsConsole } from './remote-hosts-console';

export const metadata: Metadata = { title: 'Remote Hosts' };

export default function Page() {
  return <RemoteHostsConsole />;
}
