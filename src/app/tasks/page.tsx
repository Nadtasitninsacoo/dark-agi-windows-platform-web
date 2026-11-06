import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TaskQueue } from './task-queue';

export const metadata: Metadata = { title: 'Task Queue' };

export default function Page() {
  // useSearchParams (deep link ?job=<id>) needs a Suspense boundary with Cache Components.
  return (
    <Suspense fallback={null}>
      <TaskQueue />
    </Suspense>
  );
}
