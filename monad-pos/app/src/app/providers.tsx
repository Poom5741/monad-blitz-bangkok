"use client";

import React from 'react';
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { monadTestnet } from '@/lib/chain';

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const paymasterUrl = process.env.NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL;

  const sdkOptions = paymasterUrl
    ? { gasless: { openzeppelin: { relayerUrl: paymasterUrl } } }
    : undefined;

  return (
    <ThirdwebProvider activeChain={monadTestnet} clientId={clientId} sdkOptions={sdkOptions}>
      {children}
    </ThirdwebProvider>
  );
}

