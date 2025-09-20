import { useEffect, useState, useCallback, useRef } from "react";
import { Address } from "viem";
import { getOptimizedClient } from "@/lib/ws-optimized";

type BalanceMonitorParams = {
  walletAddress: Address;
  tokenAddress: Address;
  expectedAmount: bigint;
  isActive: boolean;
  initialBalance?: bigint;
  pollInterval?: number;
};

type BalanceState = {
  currentBalance: bigint;
  previousBalance: bigint;
  balanceChange: bigint;
  isSuccess: boolean;
  error: string | null;
  isMonitoring: boolean;
};

export function useWalletBalanceMonitor({
  walletAddress,
  tokenAddress,
  expectedAmount,
  isActive,
  initialBalance,
  pollInterval = 5000,
}: BalanceMonitorParams) {
  const [balanceState, setBalanceState] = useState<BalanceState>({
    currentBalance: 0n,
    previousBalance: 0n,
    balanceChange: 0n,
    isSuccess: false,
    error: null,
    isMonitoring: false,
  });

  const isActiveRef = useRef(isActive);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialBalanceSet = useRef(false);

  // Update active ref when prop changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const checkBalance = useCallback(async () => {
    if (!isActiveRef.current || !walletAddress || !tokenAddress || expectedAmount === 0n) {
      return;
    }

    try {
      const client = getOptimizedClient();
      
      // Get current balance
      const balance = await client.readContract({
        address: tokenAddress,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [walletAddress],
      });

      setBalanceState((prev) => {
        const newState = {
          ...prev,
          currentBalance: balance,
          error: null,
          isMonitoring: true,
        };

        // Set initial balance if not set
        if (!initialBalanceSet.current) {
          // Use provided initial balance or current balance as fallback
          newState.previousBalance = initialBalance !== undefined ? initialBalance : balance;
          initialBalanceSet.current = true;
          return newState;
        }

        // Calculate balance change
        const balanceChange = balance - prev.previousBalance;
        newState.balanceChange = balanceChange;

        // Check if we received the expected amount or more
        const isSuccess = balanceChange >= expectedAmount;
        newState.isSuccess = isSuccess;

        return newState;
      });
    } catch (err) {
      setBalanceState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to check balance",
        isMonitoring: false,
      }));
    }
  }, [walletAddress, tokenAddress, expectedAmount]);

  // Start/stop monitoring based on isActive
  useEffect(() => {
    if (!isActive || !walletAddress || !tokenAddress || expectedAmount === 0n) {
      // Clear interval and reset state
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBalanceState({
        currentBalance: 0n,
        previousBalance: 0n,
        balanceChange: 0n,
        isSuccess: false,
        error: null,
        isMonitoring: false,
      });
      initialBalanceSet.current = false;
      return;
    }

    // Start monitoring
    checkBalance(); // Initial check

    intervalRef.current = setInterval(checkBalance, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, walletAddress, tokenAddress, expectedAmount, initialBalance, pollInterval, checkBalance]);

  const reset = useCallback(() => {
    setBalanceState({
      currentBalance: 0n,
      previousBalance: 0n,
      balanceChange: 0n,
      isSuccess: false,
      error: null,
      isMonitoring: false,
    });
    initialBalanceSet.current = false;
  }, []);

  return {
    ...balanceState,
    reset,
    checkBalance,
  };
}