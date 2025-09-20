"use client";

import React from 'react';

export default function Header() {
  const faucetUrl = process.env.NEXT_PUBLIC_FAUCET_URL || 'https://faucet.monad.xyz';
  return (
    <header className="w-full flex items-center justify-between p-4">
      <h1 className="text-xl font-semibold">Monad POS</h1>
      <div className="flex items-center gap-2">
        <a
          href={faucetUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hidden sm:inline-flex text-xs px-2 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/30 hover:bg-sky-500/20 transition"
        >
          Faucet
        </a>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/30">
          Connected to Monad Testnet
        </span>
      </div>
    </header>
  );
}
