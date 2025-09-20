"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import AmountDisplay, { parseAmount6, formatAmount6 } from "@/components/AmountDisplay";
import Keypad from "@/components/Keypad";
import QRCode from "react-qr-code";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { usePaymentEventsOptimized } from "@/hooks/usePaymentEventsOptimized";
import { useWalletBalanceMonitor } from "@/hooks/useWalletBalanceMonitor";
import { getUsdcAddress } from "@/lib/chain";
import { checksumAddress, type Address } from "viem";
import { createThirdwebClient } from "thirdweb";

function mmss(unixLeft: number) {
  const m = Math.max(0, Math.floor(unixLeft / 60));
  const s = Math.max(0, unixLeft % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function genOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function POSPage() {
  const account = useActiveAccount();
  const address = account?.address;
  const tokenAddress = getUsdcAddress();
  const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });

  const [amountStr, setAmountStr] = useState("");
  const [orderId, setOrderId] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [paidTxHashView, setPaidTxHashView] = useState("");
  const [todayTotal, setTodayTotal] = useState<bigint>(0n);
  const [initialBalance, setInitialBalance] = useState<bigint | undefined>(undefined);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Update timer every second
  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const micros = useMemo(() => parseAmount6(amountStr), [amountStr]);
  const isActive = !!qrUrl && !!expiresAt && nowSec <= (expiresAt || 0);

  // Start event listener regardless; it will ignore if expired/not active
  const checksummedAddress = address ? checksumAddress(address as Address) : "0x0000000000000000000000000000000000000000" as Address;
  const checksummedTokenAddress = checksumAddress(tokenAddress as Address);
  
  // Console diagnostics (temporary)
  console.log("[pos] listen", { 
    tokenAddress: checksummedTokenAddress, 
    merchant: checksummedAddress, 
    value: micros.toString(), 
    until: expiresAt || 0 
  });
  console.log("[pos] ws", process.env.NEXT_PUBLIC_MONAD_RPC_WSS);

  const { events, isListening, error: hookError, reset } = usePaymentEventsOptimized({
    tokenAddress: checksummedTokenAddress,
    merchant: checksummedAddress,
    value: isActive && micros > 0n ? micros : 0n,
    until: expiresAt || 0,
    // Optimized settings to prevent RPC blocking
    pollMs: 8000, // Reduced frequency for non-blocking polling
    enablePolling: isActive && !!address && micros > 0n, // Only enable when we have valid params
    useOptimizedMode: true, // Enable non-blocking optimized mode
  });

  // Balance monitoring for direct wallet balance checking
  const { 
    isSuccess: balanceSuccess, 
    balanceChange, 
    currentBalance, 
    error: balanceError,
    isMonitoring,
    reset: resetBalance 
  } = useWalletBalanceMonitor({
    walletAddress: checksummedAddress,
    tokenAddress: checksummedTokenAddress,
    expectedAmount: micros,
    isActive: isActive && !!address && micros > 0n,
    initialBalance: initialBalance,
    pollInterval: 3000, // Check balance every 3 seconds
  });

  // Extract payment info from events (optimized hook returns events array)
  const paidTxHash = events.length > 0 ? events[0].transactionHash : null;
  const lastEvent = events.length > 0 ? events[0] : null;

  // Check for payment success from either event detection or balance monitoring
  const paymentReceived = paidTxHash || balanceSuccess;

  // On payment
  const playedRef = useRef(false);
  useEffect(() => {
    if (paymentReceived) {
      const displayTxHash = paidTxHash || "balance-detected";
      setPaidTxHashView(displayTxHash);
      // increment total
      setTodayTotal((t) => t + micros);
      // Notification popup instead of sound
      if (!playedRef.current) {
        playedRef.current = true;
        try {
          const tx = paidTxHash as string;
          const short = tx ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : '';
          const method = paidTxHash ? 'Transaction detected' : 'Balance increase detected';
          toast.success('Payment received', {
            description: `${formatAmount6(micros)} USDC${short ? ` · ${short}` : ''} · ${method}`,
          });
        } catch {}
      }
      // clear QR after 2s
      const to = setTimeout(() => {
        setQrUrl("");
        setOrderId("");
        setExpiresAt(null);
        setPaidTxHashView("");
        playedRef.current = false;
        reset();
        resetBalance();
      }, 2000);
      return () => clearTimeout(to);
    }
  }, [paymentReceived, paidTxHash, micros, reset, resetBalance]);

  const onInput = useCallback((ch: string) => {
    if (ch === 'backspace') {
      setAmountStr((s) => s.slice(0, -1));
      return;
    }
    if (ch === '.') {
      setAmountStr((s) => (s.includes('.') ? s : (s || '0') + '.'));
      return;
    }
    if (/^[0-9]$/.test(ch)) {
      setAmountStr((s) => {
        const next = s + ch;
        const [, dec = ''] = next.split('.');
        return dec.length > 6 ? s : next;
      });
    }
  }, []);

  const onClear = useCallback(() => setAmountStr(""), []);

  const handleCreateQr = async () => {
    if (!address) return;
    if (micros <= 0n) return;
    
    // Capture initial balance before creating QR
    try {
      const { getOptimizedClient } = await import("@/lib/ws-optimized");
      const client = getOptimizedClient();
      
      const balance = await client.readContract({
        address: checksummedTokenAddress,
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
        args: [checksummedAddress],
      });
      
      setInitialBalance(balance);
    } catch (error) {
      console.error("Failed to get initial balance:", error);
      setInitialBalance(undefined);
    }
    
    const oid = genOrderId();
    const exp = Math.floor(Date.now() / 1000) + 5 * 60;
    const url = `/pay?to=${address}&a=${micros.toString()}&exp=${exp}&oid=${oid}`;
    setOrderId(oid);
    setExpiresAt(exp);
    setQrUrl(url);
    setPaidTxHashView("");
    // reset listener state in case of previous run
    reset();
    resetBalance();
  };

  const cancelQr = () => {
    setQrUrl("");
    setOrderId("");
    setExpiresAt(null);
    setPaidTxHashView("");
    setInitialBalance(undefined);
    reset();
    resetBalance();
  };

  const newAmount = () => {
    cancelQr();
    setAmountStr("");
  };

  const left = expiresAt ? Math.max(0, expiresAt - nowSec) : 0;
  const shortHash = (h: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-6 py-6 pb-24 md:pb-6">
        <div className="mb-6">
          <span className="rounded-full px-4 py-2 text-sm font-medium bg-zinc-900 border border-zinc-800">
            Today total: {formatAmount6(todayTotal)} USDC
          </span>
        </div>

        {!qrUrl && (
          <div className="rounded-2xl shadow-lg mb-6 bg-zinc-900 border border-zinc-800 p-6">
            {!address ? (
              <div className="mb-4">
                <ConnectButton client={client} />
              </div>
            ) : null}
            <h2 className="text-xl font-semibold mb-4 text-center">Enter Amount</h2>
            <AmountDisplay value={amountStr} onChange={setAmountStr} symbol="USDC" />
            <div className="mt-4">
              <Keypad onInput={onInput} onClear={onClear} />
            </div>
            <button
              className="mt-5 w-full rounded-2xl h-14 text-lg font-semibold bg-emerald-500 text-black active:bg-emerald-400 disabled:opacity-50"
              onClick={handleCreateQr}
              disabled={!address || micros <= 0n}
            >
              Create QR
            </button>
          </div>
        )}

        {qrUrl && (
          <div className="rounded-2xl shadow-lg mb-6 bg-zinc-900 border border-zinc-800 p-8 text-center">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Payment Request</h2>
              <span className="rounded-full px-3 py-1 text-sm bg-zinc-800 border border-zinc-700">{mmss(left)}</span>
            </div>
            <div className="w-64 h-64 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center p-3">
              <QRCode value={qrUrl} size={220} />
            </div>
            <div className="mb-3">
              <p className="text-sm text-zinc-400 mb-1">Order</p>
              <p className="text-2xl font-bold font-mono">#{orderId}</p>
            </div>
            <div className="mb-6">
              <p className="text-3xl font-bold">{formatAmount6(micros)} USDC</p>
            </div>
            <div className="flex gap-4">
              <button
                className="flex-1 rounded-2xl h-14 bg-transparent border border-zinc-700"
                onClick={cancelQr}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-2xl h-14 bg-zinc-800 border border-zinc-700"
                onClick={newAmount}
              >
                New Amount
              </button>
            </div>
          </div>
        )}

        {qrUrl && (
          <div className="rounded-2xl shadow-lg bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center justify-center gap-3">
              {!paymentReceived ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  <span className="text-zinc-400">
                    Waiting for payment… 
                    {isMonitoring && " (monitoring balance)"}
                    {isListening && " (listening for events)"}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-green-500 font-semibold">Paid {formatAmount6(micros)} USDC</span>
                  {paidTxHashView && paidTxHashView !== "balance-detected" && (
                    <code className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">{shortHash(paidTxHashView)}</code>
                  )}
                  {paidTxHashView === "balance-detected" && (
                    <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">Balance detected</span>
                  )}
                </>
              )}
            </div>
            {(hookError || balanceError) && (
              <div className="mt-3 text-center">
                <span className="text-xs text-red-400">
                  {hookError && `Event error: ${hookError}`}
                  {hookError && balanceError && " | "}
                  {balanceError && `Balance error: ${balanceError}`}
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
