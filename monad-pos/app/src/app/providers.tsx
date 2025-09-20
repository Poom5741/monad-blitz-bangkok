"use client";

import React from 'react';
import { ThirdwebProvider } from 'thirdweb/react';
import { monadTestnet } from '@/lib/chain';
import { useTokenConfigCheck } from '@/hooks/useTokenConfigCheck';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Token config guard (logs to console on mismatch)
  useTokenConfigCheck();

  const feeToken = process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!feeToken || !/^0x[0-9a-fA-F]{40}$/.test(feeToken)) {
    throw new Error('NEXT_PUBLIC_FEE_TOKEN_ADDRESS is not set or invalid');
  }

  return (
    <ThirdwebProvider
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!}
      activeChain={monadTestnet as any}
      accountAbstraction={{
        chain: monadTestnet as any,
        sponsorGas: true,
        paymaster: {
          type: 'erc20',
          tokenAddress: feeToken,
        },
      }}
    >
      {children}
    </ThirdwebProvider>
  );
}
