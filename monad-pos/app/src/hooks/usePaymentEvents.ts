"use client";

import { useEffect, useState } from 'react';
import { createPublicClient, webSocket, parseAbiItem, Hex, Address, getAddress } from 'viem';

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export function usePaymentEvents(params: { merchant?: string; amountSixDecimals?: string }) {
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<Hex | ''>('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
    const token = process.env.NEXT_PUBLIC_USDCC_ADDRESS as Address | undefined;
    if (!token) return;

    const client = createPublicClient({ transport: webSocket(rpc) });

    let unwatch: (() => void) | undefined;
    (async () => {
      try {
        setListening(true);
        unwatch = await client.watchContractEvent({
          address: token,
          event: transferEvent,
          onLogs: (logs) => {
            for (const log of logs) {
              const to = (log.args as any).to as Address;
              const value = (log.args as any).value as bigint;
              if (params.merchant && params.amountSixDecimals) {
                try {
                  if (getAddress(to) === getAddress(params.merchant) && value === BigInt(params.amountSixDecimals)) {
                    setPaid(true);
                    setTxHash(log.transactionHash!);
                  }
                } catch {}
              }
            }
          },
        });
      } catch (e) {
        setError(e);
      }
    })();

    return () => { setListening(false); if (unwatch) unwatch(); };
  }, [params.merchant, params.amountSixDecimals]);

  return { paid, txHash, listening, error } as const;
}

