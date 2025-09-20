import { useEffect, useState, useCallback, useRef } from "react";
import { Address, Log, parseEventLogs } from "viem";
import { getOptimizedClient, getHttpOnlyClient } from "@/lib/ws-optimized";

const TRANSFER_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
  name: "Transfer",
  type: "event",
} as const;

type Params = {
  tokenAddress: Address;
  merchant: Address;
  value: bigint;
  until: number;
  lookbackBlocks?: number;
  pollMs?: number;
  enablePolling?: boolean;
  useOptimizedMode?: boolean; // New option for optimized non-blocking mode
};

export function usePaymentEventsOptimized({
  tokenAddress,
  merchant,
  value,
  until,
  lookbackBlocks = 10,
  pollMs = 10000, // Increased default to reduce RPC load
  enablePolling = true,
  useOptimizedMode = true, // Default to optimized mode
}: Params) {
  const [events, setEvents] = useState<Log[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedBlock, setLastCheckedBlock] = useState<bigint | null>(null);
  
  // Use refs to track active operations and prevent race conditions
  const activeOperations = useRef(new Set<string>());
  const isActiveRef = useRef(true);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);

  const client = useOptimizedMode ? getOptimizedClient() : getHttpOnlyClient();

  const matchesPayment = useCallback(
    (log: Log) => {
      try {
        const parsed = parseEventLogs({
          abi: [TRANSFER_EVENT],
          logs: [log],
        });
        
        if (parsed.length === 0) return false;
        
        const event = parsed[0];
        return (
          event.args.to?.toLowerCase() === merchant.toLowerCase() &&
          event.args.value >= value
        );
      } catch {
        return false;
      }
    },
    [merchant, value]
  );

  // Non-blocking polling function with intelligent batching
  const performOptimizedPolling = useCallback(async () => {
    if (!isActiveRef.current || !enablePolling) return;
    
    const operationId = `poll-${Date.now()}`;
    activeOperations.current.add(operationId);
    
    try {
      // Use Promise.allSettled to prevent one failure from blocking others
      const [blockResult, currentBlock] = await Promise.allSettled([
        lastCheckedBlock || client.getBlockNumber(),
        client.getBlockNumber(),
      ]);
      
      if (!isActiveRef.current) return;
      
      const fromBlock = blockResult.status === 'fulfilled' 
        ? blockResult.value 
        : (currentBlock.status === 'fulfilled' ? currentBlock.value - BigInt(lookbackBlocks) : BigInt(0));
      
      const toBlock = currentBlock.status === 'fulfilled' 
        ? currentBlock.value 
        : fromBlock + BigInt(lookbackBlocks);
      
      // Non-blocking log fetch with timeout
      const logsPromise = client.getLogs({
        address: tokenAddress,
        event: TRANSFER_EVENT,
        fromBlock,
        toBlock,
      });
      
      // Set a reasonable timeout for the operation
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 8000)
      );
      
      const logs = await Promise.race([logsPromise, timeoutPromise]);
      
      if (!isActiveRef.current) return;
      
      const matchingLogs = logs.filter(matchesPayment);
      
      if (matchingLogs.length > 0) {
        setEvents(prev => {
          const newEvents = matchingLogs.filter(
            newLog => !prev.some(existingLog => 
              existingLog.transactionHash === newLog.transactionHash &&
              existingLog.logIndex === newLog.logIndex
            )
          );
          return [...prev, ...newEvents];
        });
      }
      
      setLastCheckedBlock(toBlock);
      setError(null);
      
    } catch (err) {
      if (isActiveRef.current) {
        console.warn('Non-blocking polling error:', err);
        // Don't set error state for timeout/network issues in optimized mode
        if (!useOptimizedMode) {
          setError(err instanceof Error ? err.message : 'Polling failed');
        }
      }
    } finally {
      activeOperations.current.delete(operationId);
    }
  }, [
    client,
    tokenAddress,
    matchesPayment,
    lastCheckedBlock,
    lookbackBlocks,
    enablePolling,
    useOptimizedMode,
  ]);

  // WebSocket subscription with optimized reconnection
  useEffect(() => {
    if (!isActiveRef.current || !enablePolling || value === 0n) return;
    
    let reconnectAttempts = 0;
    const maxReconnectAttempts = useOptimizedMode ? 5 : 3;
    
    const setupWebSocket = async () => {
      try {
        setIsListening(true);
        
        const unsubscribe = client.watchEvent({
          address: tokenAddress,
          event: TRANSFER_EVENT,
          onLogs: (logs) => {
            if (!isActiveRef.current) return;
            
            const matchingLogs = logs.filter(matchesPayment);
            if (matchingLogs.length > 0) {
              setEvents(prev => {
                const newEvents = matchingLogs.filter(
                  newLog => !prev.some(existingLog => 
                    existingLog.transactionHash === newLog.transactionHash &&
                    existingLog.logIndex === newLog.logIndex
                  )
                );
                return [...prev, ...newEvents];
              });
            }
          },
          onError: (error) => {
            if (!isActiveRef.current) return;
            
            console.warn('WebSocket error:', error);
            reconnectAttempts++;
            
            if (reconnectAttempts < maxReconnectAttempts) {
              // Exponential backoff for reconnection
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
              setTimeout(() => {
                if (isActiveRef.current) {
                  setupWebSocket();
                }
              }, delay);
            } else if (!useOptimizedMode) {
              setError('WebSocket connection failed');
            }
          },
        });
        
        wsUnsubscribeRef.current = unsubscribe;
        reconnectAttempts = 0; // Reset on successful connection
        setError(null);
        
      } catch (err) {
        if (isActiveRef.current && !useOptimizedMode) {
          setError(err instanceof Error ? err.message : 'WebSocket setup failed');
        }
      }
    };
    
    setupWebSocket();
    
    return () => {
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
        wsUnsubscribeRef.current = null;
      }
    };
  }, [client, tokenAddress, matchesPayment, useOptimizedMode, enablePolling, value]);

  // Optimized polling with intelligent scheduling
  useEffect(() => {
    if (!enablePolling || !isActiveRef.current || value === 0n) return;
    
    // Initial poll after WebSocket setup delay
    const initialDelay = useOptimizedMode ? 3000 : 2000;
    const initialTimer = setTimeout(() => {
      if (isActiveRef.current) {
        performOptimizedPolling();
      }
    }, initialDelay);
    
    // Regular polling with adaptive interval
    const pollInterval = setInterval(() => {
      if (isActiveRef.current && activeOperations.current.size === 0) {
        performOptimizedPolling();
      }
    }, pollMs);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
    };
  }, [performOptimizedPolling, pollMs, enablePolling, useOptimizedMode, value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      activeOperations.current.clear();
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
      }
    };
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setError(null);
    setLastCheckedBlock(null);
    activeOperations.current.clear();
  }, []);

  return {
    events,
    isListening,
    error,
    reset,
    activeOperations: activeOperations.current.size, // Expose for debugging
  };
}