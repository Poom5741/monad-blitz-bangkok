"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createWalletClient, custom, http, parseAbi, encodeFunctionData } from 'viem';
import { buildTransferTypedData } from '@/lib/eip712/transferWithAuthorization';
import USDCClone from '@/lib/abi/USDCClone.json';

export default function PayPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<`0x${string}` | ''>('');

  const to = params.get('to') || '';
  const a = params.get('a') || '';
  const exp = params.get('exp');
  const oid = params.get('oid') || '';

  const amount = useMemo(() => {
    try { return BigInt(a); } catch { return 0n; }
  }, [a]);

  useEffect(() => {
    (async () => {
      if (!window?.ethereum) { setStatus('Connect a wallet (MetaMask)'); return; }
      if (!to || !amount) { setStatus('Missing params'); return; }

      try {
        setStatus('Preparing typed data...');
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '0');
        const token = process.env.NEXT_PUBLIC_USDCC_ADDRESS as `0x${string}`;
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });

        const validAfter = Math.floor(Date.now() / 1000);
        const validBefore = exp ? Number(exp) : validAfter + 1800;
        const nonce = crypto.getRandomValues(new Uint8Array(32));

        const { domain, types, message } = buildTransferTypedData({
          chainId,
          verifyingContract: token,
          from: account as `0x${string}`,
          to: to as `0x${string}`,
          value: amount,
          validAfter,
          validBefore,
          nonce: `0x${Buffer.from(nonce).toString('hex')}` as `0x${string}`,
        });

        setStatus('Requesting signature...');
        const signature: string = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [account, JSON.stringify({ domain, types, primaryType: 'TransferWithAuthorization', message })],
        });

        setStatus('Submitting transferWithAuthorization...');
        const [v, r, s] = (function split(sig: string): [number, `0x${string}`, `0x${string}`] {
          const hex = sig.slice(2);
          const r = `0x${hex.slice(0, 64)}` as `0x${string}`;
          const s = `0x${hex.slice(64, 128)}` as `0x${string}`;
          const v = parseInt(hex.slice(128, 130), 16);
          return [v, r, s];
        })(signature);

        const data = encodeFunctionData({
          abi: USDCClone as any,
          functionName: 'transferWithAuthorization',
          args: [
            account,
            to,
            amount,
            BigInt(validAfter),
            BigInt(validBefore),
            message.nonce as `0x${string}`,
            v,
            r,
            s,
          ],
        });

        // Default: send with user's wallet. For gasless, use thirdweb Smart Wallet + Paymaster.
        const walletClient = createWalletClient({
          chain: undefined,
          transport: (window as any).ethereum ? custom((window as any).ethereum) : http(process.env.NEXT_PUBLIC_RPC_URL!),
        });

        const hash = await walletClient.sendTransaction({
          to: token,
          account: account as `0x${string}`,
          data,
        });

        setTxHash(hash);
        setStatus('Payment submitted');
      } catch (err: any) {
        setStatus(err?.message || String(err));
      }
    })();
  }, [to, amount, exp, oid]);

  return (
    <div className="container col" style={{ gap: 16 }}>
      <h1>Pay</h1>
      <div className="card col">
        <div className="row"><span className="muted">To</span><code>{to}</code></div>
        <div className="row"><span className="muted">Amount (6 decimals)</span><code>{amount.toString()}</code></div>
        {exp && (<div className="row"><span className="muted">Valid Before</span><code>{exp}</code></div>)}
        {oid && (<div className="row"><span className="muted">Order ID</span><code>{oid}</code></div>)}
      </div>
      <div className="card col">
        <strong>Status</strong>
        <div>{status}</div>
        {txHash && (
          <a href={`https://explorer.monad.testnet/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
        )}
      </div>
    </div>
  );
}

