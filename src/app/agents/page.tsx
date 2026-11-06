import type { Metadata } from 'next';
import { AgentConsole } from './agent-console';

export const metadata: Metadata = { title: 'AI Agents' };

export default function Page() {
  return <AgentConsole />;
}
