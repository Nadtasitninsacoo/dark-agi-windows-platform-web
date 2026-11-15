import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OperationProposalQueue } from './operation-proposal-queue';

export const metadata: Metadata = { title: 'Operation Proposals' };

export default function Page() {
  // useSearchParams (deep link ?id=<proposalId>) needs a Suspense boundary with Cache Components.
  return (
    <Suspense fallback={null}>
      <OperationProposalQueue />
    </Suspense>
  );
}
