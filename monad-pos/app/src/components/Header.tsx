"use client";

import React from 'react';

export default function Header() {
  return (
    <header className="w-full flex items-center justify-between p-4">
      <h1 className="text-xl font-semibold">Monad POS</h1>
      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/30">
        Monad Testnet
      </span>
    </header>
  );
}

