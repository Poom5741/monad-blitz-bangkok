"use client";

import { useEffect, useState } from 'react';
import { getHttpClient, getTokenName, getUsdcAddress } from '@/lib/chain';
import { USDCCloneAbi } from '@/lib/abi/USDCClone';

type Result = {
  nameMismatch: boolean;
  decimalsMismatch: boolean;
  onChainName?: string;
  onChainDecimals?: number;
};

let cache: Result | null = null;
let inFlight: Promise<Result> | null = null;

async function performCheck(): Promise<Result> {
  try {
    const client = getHttpClient();
    const addr = getUsdcAddress();
    const [name, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: USDCCloneAbi as any, functionName: 'name', args: [] }) as Promise<string>,
      client.readContract({ address: addr, abi: USDCCloneAbi as any, functionName: 'decimals', args: [] }) as Promise<number>,
    ]);
    const expectedName = getTokenName();
    const nameMismatch = name !== expectedName;
    const decimalsMismatch = decimals !== 6;
    if (nameMismatch) console.warn(`[token-config] EIP-712 domain name mismatch: on-chain="${name}" env="${expectedName}"`);
    if (decimalsMismatch) console.warn(`[token-config] Token decimals is ${decimals}, expected 6`);
    return (cache = { nameMismatch, decimalsMismatch, onChainName: name, onChainDecimals: decimals });
  } catch (e) {
    console.warn('[token-config] Failed to query token config:', e);
    return (cache = { nameMismatch: false, decimalsMismatch: false });
  }
}

export function useTokenConfigCheck() {
  const [state, setState] = useState<Result>(cache || { nameMismatch: false, decimalsMismatch: false });

  useEffect(() => {
    if (cache) return; // already checked
    if (!inFlight) inFlight = performCheck();
    inFlight.then((res) => setState(res)).catch(() => setState({ nameMismatch: false, decimalsMismatch: false }));
  }, []);

  return state;
}
