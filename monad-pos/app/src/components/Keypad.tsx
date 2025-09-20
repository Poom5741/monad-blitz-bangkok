"use client";

import React from 'react';
import { Delete } from 'lucide-react';

type Props = {
  onInput: (ch: string) => void;
  onClear: () => void;
};

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

export default function Keypad({ onInput, onClear }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="grid grid-cols-3 gap-3">
        {keys.flat().map((k) => (
          <button
            key={k}
            onClick={() => onInput(k)}
            className="rounded-2xl bg-zinc-800 active:bg-zinc-700 text-white text-xl py-4"
          >
            {k === 'backspace' ? <Delete className="w-6 h-6 mx-auto" /> : k}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <button onClick={onClear} className="w-full rounded-2xl bg-rose-600 text-white py-3 active:bg-rose-500">
          Clear
        </button>
      </div>
    </div>
  );
}

