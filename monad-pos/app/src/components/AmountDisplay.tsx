"use client";

import React, { useMemo } from 'react';

export function parseAmount6(input: string): bigint {
  const s = (input || '').replace(/[^0-9.]/g, '');
  const [intPart, decPartRaw = ''] = s.split('.');
  const decPart = decPartRaw.slice(0, 6); // max 6 decimals
  const padded = (intPart || '0') + (decPart ? decPart.padEnd(6, '0') : '000000');
  try {
    return BigInt(padded.replace(/^0+(?=\d)/, ''));
  } catch {
    return 0n;
  }
}

export function formatAmount6(micros: bigint): string {
  const s = micros.toString();
  const negative = s.startsWith('-');
  const digits = negative ? s.slice(1) : s;
  const pad = digits.padStart(7, '0'); // ensure at least 7 to split
  const head = pad.slice(0, -6) || '0';
  const tail = pad.slice(-6);
  const trimmedTail = tail.replace(/0+$/, '');
  const main = trimmedTail.length ? `${head}.${trimmedTail}` : head;
  return negative ? `-${main}` : main;
}

export default function AmountDisplay({ amount, symbol = 'USDCC' }: { amount: string; symbol?: string }) {
  const micros = useMemo(() => parseAmount6(amount), [amount]);
  const formatted = useMemo(() => formatAmount6(micros), [micros]);

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-center">
      <div className="text-xs uppercase tracking-wider text-zinc-400">Amount ({symbol})</div>
      <div className="mt-2 text-4xl sm:text-5xl font-semibold tabular-nums">{formatted}</div>
      <div className="mt-1 text-zinc-500 text-xs">{micros.toString()} micro</div>
    </div>
  );
}

