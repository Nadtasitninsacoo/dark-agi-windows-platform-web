import type { Metadata } from 'next';
import { ReportsConsole } from './reports-console';

export const metadata: Metadata = { title: 'Reports · DARK AGI' };

export default function ReportsPage() {
  return <ReportsConsole />;
}
