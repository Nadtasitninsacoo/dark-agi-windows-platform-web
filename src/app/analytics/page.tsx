import type { Metadata } from 'next';
import { AnalyticsConsole } from './analytics-console';

export const metadata: Metadata = { title: 'Intelligence Analytics' };

export default function Page() {
  return <AnalyticsConsole />;
}
