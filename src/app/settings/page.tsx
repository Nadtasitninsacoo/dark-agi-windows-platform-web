import type { Metadata } from 'next';
import { SystemSettings } from './system-settings';

export const metadata: Metadata = { title: 'System Settings' };

export default function Page() {
  return <SystemSettings />;
}
