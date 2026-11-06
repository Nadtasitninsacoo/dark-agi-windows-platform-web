import type { Metadata } from 'next';
import { ExecutionLogs } from './execution-logs';

export const metadata: Metadata = { title: 'Execution Logs' };

export default function Page() {
  return <ExecutionLogs />;
}
