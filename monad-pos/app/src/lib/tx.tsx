"use client";

import { useSDK } from '@thirdweb-dev/react';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import type { Abi } from 'viem';
import { createWalletClient, custom, encodeFunctionData } from 'viem';
import { monadTestnet } from '@/lib/chain';

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

// Non-hook helper: routes through thirdweb gasless when configured,
// otherwise falls back to viem wallet client.
export async function sendGasless(
  contractAddress: `0x${string}`,
  abi: Abi,
  functionName: string,
  args: any[],
): Promise<string> {
  const paymaster = process.env.NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL;
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

  if (paymaster && clientId) {
    // Configure SDK for client-side usage with gasless (OpenZeppelin relayer)
    const sdk = new (ThirdwebSDK as any)(monadTestnet as any, {
      clientId,
      gasless: { openzeppelin: { relayerUrl: paymaster } },
    } as any);
    const contract = await sdk.getContract(contractAddress, abi as any);
    const tx = await contract.call(functionName as any, args as any[]);
    const receipt = (tx as any)?.wait ? await (tx as any).wait() : (tx as any)?.receipt;
    const hash = receipt?.transactionHash || (tx as any)?.transactionHash || (tx as any)?.hash;
    if (!hash) throw new Error('Failed to obtain transaction hash');
    return hash as string;
  }

  // Fallback: viem send via connected EOA
  const [from] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  const data = encodeFunctionData({ abi, functionName: functionName as any, args: args as any });
  const wc = createWalletClient({ transport: custom((window as any).ethereum) });
  const hash = await wc.sendTransaction({ to: contractAddress, account: from as `0x${string}`, data });
  return hash;
}
