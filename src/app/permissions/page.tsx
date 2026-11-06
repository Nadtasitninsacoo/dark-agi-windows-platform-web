import type { Metadata } from 'next';
import { PermissionsConsole } from './permissions-console';

export const metadata: Metadata = { title: 'Permissions' };

export default function Page() {
  return <PermissionsConsole />;
}
