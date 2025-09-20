"use client";

import React from 'react';
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { monadTestnet } from '@/lib/chain';
import { useTokenConfigCheck } from '@/hooks/useTokenConfigCheck';

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const paymasterUrl = process.env.NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL;

  // Enable gasless via paymaster if configured
  const sdkOptions = paymasterUrl
    ? { gasless: { openzeppelin: { relayerUrl: paymasterUrl } } }
    : undefined;

  // Run token config guard on mount (console warnings on mismatch)
  useTokenConfigCheck();

  return (
    <ThirdwebProvider activeChain={monadTestnet} clientId={clientId} sdkOptions={sdkOptions}>
      {children}
    </ThirdwebProvider>
  );
}
