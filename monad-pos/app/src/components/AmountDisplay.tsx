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
  const pad = digits.padStart(7, '0');
  const head = pad.slice(0, -6) || '0';
  const tail = pad.slice(-6);
  const trimmedTail = tail.replace(/0+$/, '');
  const main = trimmedTail.length ? `${head}.${trimmedTail}` : head;
  return negative ? `-${main}` : main;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  symbol?: string;
};

export default function AmountDisplay({ value, onChange, symbol = 'USDC' }: Props) {
  const micros = useMemo(() => parseAmount6(value), [value]);
  const formatted = useMemo(() => formatAmount6(micros), [micros]);

  const handleInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const raw = e.target.value;
    // sanitize: only digits and a single dot; limit to 6 decimals
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const head = parts[0] || '0';
    const dec = (parts[1] || '').slice(0, 6);
    const next = parts.length > 1 ? `${head}.${dec}` : head;
    onChange(next.replace(/^0+(?=\d)/, '0'));
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-center">
      <div className="text-xs uppercase tracking-wider text-zinc-400">Amount ({symbol})</div>
      <input
        inputMode="decimal"
        pattern="^[0-9]*[.,]?[0-9]*$"
        className="mt-2 w-full bg-transparent text-4xl sm:text-5xl font-semibold tabular-nums text-center outline-none"
        value={value}
        onChange={handleInput}
        placeholder="0.00"
        aria-label={`Amount in ${symbol}`}
      />
      <div className="mt-1 text-zinc-500 text-xs">{micros.toString()} micro</div>
    </div>
  );
}
