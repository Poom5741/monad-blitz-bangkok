"use client";

import { useSDK } from '@thirdweb-dev/react';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import type { Abi } from 'viem';
import { createWalletClient, custom, encodeFunctionData } from 'viem';

export function useSendContract() {
  const sdk = useSDK();

  return async function sendGasless(
    contractAddress: `0x${string}`,
    abi: Abi,
    functionName: string,
    args: any[],
    from: `0x${string}`
  ): Promise<string> {
    const paymaster = process.env.NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL;
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

    if (sdk && paymaster) {
      // Use thirdweb SDK with gasless configured via provider
      const contract = await sdk.getContract(contractAddress, abi as any);
      const tx = await contract.call(functionName as any, args as any[]);
      const receipt = await tx.wait?.();
      // Try to normalize hash
      // @ts-ignore
      const hash = receipt?.transactionHash || tx?.receipt?.transactionHash || tx?.hash;
      if (!hash) throw new Error('Failed to obtain transaction hash');
      return hash as string;
    }

    // Fallback to viem sendTransaction
    const data = encodeFunctionData({ abi, functionName: functionName as any, args: args as any });
    const wc = createWalletClient({ transport: custom((window as any).ethereum) });
    const hash = await wc.sendTransaction({ to: contractAddress, account: from, data });
    return hash;
  };
}

