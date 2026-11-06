import type { Metadata } from 'next';
import { ToolRegistry } from './tool-registry';

export const metadata: Metadata = { title: 'Tool Registry' };

export default function Page() {
  return <ToolRegistry />;
}
