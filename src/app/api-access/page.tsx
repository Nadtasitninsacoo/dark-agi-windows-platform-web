import type { Metadata } from 'next';
import { ApiAccessConsole } from './api-access-console';

export const metadata: Metadata = { title: 'API Access · DARK AGI' };

export default function ApiAccessPage() {
  return <ApiAccessConsole />;
}
