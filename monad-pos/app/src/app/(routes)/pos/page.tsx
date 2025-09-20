"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import { buildMerchantQr } from '@/hooks/useMerchantQR';

const QRCode = dynamic(() => import('@/components/QR'), { ssr: false });

export default function POSPage() {
  const [merchant, setMerchant] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(900); // seconds
  const [orderId, setOrderId] = useState<string>('');
  const validBefore = useMemo(() => Math.floor(Date.now() / 1000) + expiresIn, [expiresIn]);

  const { paid, txHash, listening, error } = usePaymentEvents({
    merchant,
    amountSixDecimals: amount ? (BigInt(Math.floor(Number(amount) * 1e6)).toString()) : undefined,
  });

  useEffect(() => {
    // derive orderId if empty
    if (!orderId) setOrderId(crypto.randomUUID());
  }, [orderId]);

  const qrUrl = useMemo(() => {
    if (!merchant || !amount) return '';
    return buildMerchantQr({
      to: merchant,
      amountSixDecimals: (Math.floor(Number(amount) * 1e6)).toString(),
      validBefore,
      orderId,
    });
  }, [merchant, amount, validBefore, orderId]);

  return (
    <div className="container col" style={{ gap: 16 }}>
      <h1>Merchant POS</h1>
      <div className="card col">
        <label className="muted">Merchant Address</label>
        <input className="input" placeholder="0x..." value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        <label className="muted">Amount (USDCC)</label>
        <input className="input" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label className="muted">Expires In (seconds)</label>
        <input className="input" type="number" value={expiresIn} onChange={(e) => setExpiresIn(Number(e.target.value || 0))} />
        <div className="row">
          <span className="muted">Order ID:</span>
          <code>{orderId}</code>
        </div>
      </div>

      <div className="card col" style={{ alignItems: 'center' }}>
        <h3>Scan to Pay</h3>
        {qrUrl ? <QRCode value={qrUrl} /> : <div className="muted">Enter address and amount</div>}
        <small className="muted">{qrUrl}</small>
      </div>

      <div className="card col">
        <strong>Status</strong>
        <div className="row">
          <span className="muted">Listener:</span>
          <code>{listening ? 'connected' : 'idle'}</code>
        </div>
        {paid && (
          <div className="row">
            <span className="muted">Paid</span>
            <a href={`https://explorer.monad.testnet/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
          </div>
        )}
        {error && <div style={{ color: '#ff6b6b' }}>{String(error)}</div>}
      </div>
    </div>
  );
}

