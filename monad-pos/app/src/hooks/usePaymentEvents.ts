import { useEffect, useRef, useState } from "react";
import { getPublicClient } from "@/lib/ws";
import { parseAbiItem, toHex, checksumAddress, type Address, type Hex } from "viem";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

type Params = {
  tokenAddress: Address;
  merchant: Address;         // must be checksummed
  value: bigint;             // 6-decimal integer
  until: number;             // unix seconds
  // optional: search window in blocks
  lookbackBlocks?: number;
  pollMs?: number;
  // Add option to disable polling for performance
  enablePolling?: boolean;
};

export function usePaymentEvents({
  tokenAddress,
  merchant,
  value,
  until,
  lookbackBlocks = 2000,
  pollMs = 8000, // Increased default to reduce RPC load
  enablePolling = true, // Allow disabling polling
}: Params) {
  const client = getPublicClient();
  const [paidTxHash, setPaidTxHash] = useState<Hex | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const subRef = useRef<() => void>();
  const lastCheckedBlock = useRef<bigint>(0n);
  const normalizedTo = checksumAddress(merchant);

  // Helper: decide if a log matches this order
  function matches(log: any) {
    // args order: from, to, value
    const to = checksumAddress(log.args?.to as Address);
    const val = BigInt(log.args?.value ?? 0n);
    const now = Math.floor(Date.now() / 1000);
    return to === normalizedTo && val === value && now <= until;
  }

  // Live subscription (WS)
  useEffect(() => {
    if (!tokenAddress || !merchant || !value) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        unsub = await client.watchEvent({
          address: tokenAddress,
          event: TRANSFER_EVENT,
          args: { to: normalizedTo },
          onLogs: (logs) => {
            for (const log of logs) {
              if (matches(log)) {
                setPaidTxHash(log.transactionHash as Hex);
                setLastEvent(log);
              }
            }
          },
          onError: (e) => {
            console.warn("[pos] watchEvent error", e);
          },
        });
      } catch (e) {
        console.warn("[pos] watchEvent setup failed; will rely on polling", e);
      }
    })();
    subRef.current = unsub;
    return () => { try { unsub?.(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, normalizedTo, value, until]);

  // Catch-up polling (handles WS drops, cold start, missed logs)
  useEffect(() => {
    // Skip polling if disabled
    if (!enablePolling) return;
    
    let timer: any;
    let isActive = true;

    // Initialize starting block asynchronously
    const initializeStartBlock = async () => {
      try {
        const latest = await client.getBlockNumber();
        if (lastCheckedBlock.current === 0n && isActive) {
          lastCheckedBlock.current = latest > BigInt(lookbackBlocks)
            ? latest - BigInt(lookbackBlocks)
            : 0n;
        }
      } catch (e) {
        console.warn("[pos] Failed to initialize start block", e);
      }
    };

    // Non-blocking polling function
    const tick = () => {
      if (!isActive) return;
      
      // Use Promise.all to parallelize RPC calls and avoid blocking
      Promise.all([
        client.getBlockNumber().catch(() => lastCheckedBlock.current),
        // Only fetch logs if we have a valid starting block
        lastCheckedBlock.current > 0n ? client.getLogs({
          address: tokenAddress,
          event: TRANSFER_EVENT,
          args: { to: normalizedTo },
          fromBlock: lastCheckedBlock.current,
          toBlock: 'latest',
        }).catch(() => []) : Promise.resolve([])
      ]).then(([latest, logs]) => {
        if (!isActive) return;
        
        // Process any matching logs
        for (const log of logs) {
          if (matches(log)) {
            setPaidTxHash(log.transactionHash as Hex);
            setLastEvent(log);
            return; // Found payment, stop processing
          }
        }
        
        // Update last checked block
        if (typeof latest === 'bigint' && latest > lastCheckedBlock.current) {
          lastCheckedBlock.current = latest + 1n;
        }
      }).catch((e) => {
        console.warn("[pos] Polling error", e);
      }).finally(() => {
        if (isActive) {
          timer = setTimeout(tick, pollMs);
        }
      });
    };

    // Start initialization and polling
    initializeStartBlock().then(() => {
      if (isActive) {
        timer = setTimeout(tick, 2000); // Start polling after 2s to let WS establish
      }
    });

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, normalizedTo, value, until, lookbackBlocks, pollMs, enablePolling]);

  function reset() {
    setPaidTxHash(null);
    setLastEvent(null);
    lastCheckedBlock.current = 0n;
  }

  return { paidTxHash, lastEvent, reset };
}
