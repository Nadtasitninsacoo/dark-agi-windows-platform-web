'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { swrFetcher } from '@/lib/api/client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: swrFetcher, revalidateOnFocus: true, shouldRetryOnError: true, errorRetryInterval: 5000 }}>
      {children}
    </SWRConfig>
  );
}
