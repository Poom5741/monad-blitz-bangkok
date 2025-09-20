"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import AmountDisplay, { parseAmount6, formatAmount6 } from "@/components/AmountDisplay";
import Keypad from "@/components/Keypad";
import QRCode from "react-qr-code";
import { Check, Loader2 } from "lucide-react";
import { useAddress, ConnectWallet } from "@thirdweb-dev/react";
import { usePaymentEvents } from "@/hooks/usePaymentEvents";
import { getUsdcAddress } from "@/lib/chain";

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
  const address = useAddress();
  const tokenAddress = getUsdcAddress();

  const [amountStr, setAmountStr] = useState("");
  const [orderId, setOrderId] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [paidTxHashView, setPaidTxHashView] = useState("");
  const [todayTotal, setTodayTotal] = useState<bigint>(0n);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Update timer every second
  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const micros = useMemo(() => parseAmount6(amountStr), [amountStr]);
  const isActive = !!qrUrl && !!expiresAt && nowSec <= (expiresAt || 0);

  // Start event listener regardless; it will ignore if expired/not active
  const { paidTxHash, lastEvent, reset } = usePaymentEvents({
    tokenAddress: tokenAddress,
    merchant: (address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    value: isActive ? micros : 0n,
    until: expiresAt || 0,
  });

  // On payment
  const playedRef = useRef(false);
  useEffect(() => {
    if (paidTxHash) {
      setPaidTxHashView(paidTxHash);
      // increment total
      setTodayTotal((t) => t + micros);
      // play sound + haptics
      if (!playedRef.current) {
        playedRef.current = true;
        try { audioRef.current?.play().catch(() => {}); } catch {}
        try { if (navigator.vibrate) navigator.vibrate([35, 60, 35]); } catch {}
      }
      // clear QR after 2s
      const to = setTimeout(() => {
        setQrUrl("");
        setOrderId("");
        setExpiresAt(null);
        setPaidTxHashView("");
        playedRef.current = false;
        reset();
      }, 2000);
      return () => clearTimeout(to);
    }
  }, [paidTxHash]);

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

  const handleCreateQr = () => {
    if (!address) return;
    if (micros <= 0n) return;
    primeAudio();
    const oid = genOrderId();
    const exp = Math.floor(Date.now() / 1000) + 5 * 60;
    const url = `/pay?to=${address}&a=${micros.toString()}&exp=${exp}&oid=${oid}`;
    setOrderId(oid);
    setExpiresAt(exp);
    setQrUrl(url);
    setPaidTxHashView("");
    // reset listener state in case of previous run
    reset();
  };

  const cancelQr = () => {
    setQrUrl("");
    setOrderId("");
    setExpiresAt(null);
    setPaidTxHashView("");
    reset();
  };

  const newAmount = () => {
    cancelQr();
    setAmountStr("");
  };

  const left = expiresAt ? Math.max(0, expiresAt - nowSec) : 0;

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
                <ConnectWallet theme="dark" btnTitle="Connect Wallet" modalTitle="Connect Merchant Wallet"/>
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
              {!paidTxHash ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  <span className="text-zinc-400">Waiting for payment…</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-green-500 font-semibold">Paid {formatAmount6(micros)} USDC</span>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
