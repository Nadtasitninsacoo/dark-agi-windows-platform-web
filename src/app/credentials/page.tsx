import type { Metadata } from 'next';
import { CredentialsConsole } from './credentials-console';

export const metadata: Metadata = { title: 'Provider Credentials' };

export default function Page() {
  return <CredentialsConsole />;
}
