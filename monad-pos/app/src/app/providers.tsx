"use client";

import React from 'react';
// v5 provider & UI
import { ThirdwebProvider, ConnectButton } from 'thirdweb/react';
import type { ThirdwebProviderProps } from 'thirdweb/react';
// Keep legacy v4 provider to maintain existing pages using @thirdweb-dev/react
import { ThirdwebProvider as ThirdwebProviderV4 } from '@thirdweb-dev/react';

import { monadTestnet } from '@/lib/chain';
import { useTokenConfigCheck } from '@/hooks/useTokenConfigCheck';

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const paymasterUrl = process.env.NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL;

  // Legacy gasless for v4 SDK usage (if configured)
  const sdkOptions = paymasterUrl
    ? { gasless: { openzeppelin: { relayerUrl: paymasterUrl } } }
    : undefined;

  // Run token config guard on mount (console warnings on mismatch)
  useTokenConfigCheck();

  const accountAbstraction: NonNullable<ThirdwebProviderProps['accountAbstraction']> = {
    chain: monadTestnet as any,
    sponsorGas: true,
  };

  const v4SupportedChains = [monadTestnet as any];
  const v4ChainRpc = { [(monadTestnet as any).chainId]: (monadTestnet as any).rpc?.[0] } as Record<number, string>;

  return (
    <ThirdwebProvider clientId={clientId} activeChain={monadTestnet as any} accountAbstraction={accountAbstraction}>
      <ThirdwebProviderV4
        activeChain={monadTestnet as any}
        desiredChainId={(monadTestnet as any).chainId}
        supportedChains={v4SupportedChains as any}
        chainRpc={v4ChainRpc}
        clientId={clientId}
        sdkOptions={sdkOptions}
      >
        {children}
      </ThirdwebProviderV4>
    </ThirdwebProvider>
  );
}

// Re-export for convenience; ensures symbol is available app-wide.
export { ConnectButton };
