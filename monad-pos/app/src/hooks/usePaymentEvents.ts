"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseAbiItem, type Address, type Hex, getAddress } from 'viem';
import { getPublicClientWs } from '@/lib/chain';

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export type PaymentEventParams = {
  tokenAddress: Address;
  merchant: Address;
  value: bigint; // expected value (6 decimals for USDCC)
  until: number; // unix seconds; ignore events after this time
};

export function usePaymentEvents({ tokenAddress, merchant, value, until }: PaymentEventParams) {
  const [paidTxHash, setPaidTxHash] = useState<Hex | ''>('');
  const [lastEvent, setLastEvent] = useState<{
    from: Address;
    to: Address;
    value: bigint;
    txHash: Hex;
    blockNumber?: bigint;
    logIndex?: number;
  } | null>(null);
  const unwatchRef = useRef<null | (() => void)>(null);

  const normalized = useMemo(() => ({
    token: getAddress(tokenAddress),
    merchant: getAddress(merchant),
    value: BigInt(value),
    until,
  }), [tokenAddress, merchant, value, until]);

  const reset = () => {
    setPaidTxHash('');
    setLastEvent(null);
  };

  useEffect(() => {
    const client = getPublicClientWs();

    (async () => {
      // Cleanup any prior watcher
      if (unwatchRef.current) { unwatchRef.current(); unwatchRef.current = null; }
      unwatchRef.current = await client.watchContractEvent({
        address: normalized.token,
        event: transferEvent,
        onLogs: (logs) => {
          const now = Math.floor(Date.now() / 1000);
          if (now > normalized.until) return;
          for (const log of logs) {
            const to = (log.args as any).to as Address;
            const v = (log.args as any).value as bigint;
            if (getAddress(to) === normalized.merchant && v === normalized.value) {
              setPaidTxHash(log.transactionHash!);
              setLastEvent({
                from: (log.args as any).from as Address,
                to,
                value: v,
                txHash: log.transactionHash!,
                blockNumber: log.blockNumber,
                logIndex: log.logIndex,
              });
              break;
            }
          }
        },
      });
    })();

    return () => {
      if (unwatchRef.current) { unwatchRef.current(); unwatchRef.current = null; }
    };
  }, [normalized.token, normalized.merchant, normalized.value, normalized.until]);

  return { paidTxHash, lastEvent, reset } as const;
}
