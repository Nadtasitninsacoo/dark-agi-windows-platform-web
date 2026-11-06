import type { Metadata } from 'next';
import { ModelRegistry } from './model-registry';

export const metadata: Metadata = { title: 'Model Registry' };

export default function Page() {
  return <ModelRegistry />;
}
