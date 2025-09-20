export function buildMerchantQr(params: {
  to: string;
  amountSixDecimals: string; // integer string
  validBefore: number; // unix seconds
  orderId: string;
  merchantSig?: string;
}) {
  const base = typeof window !== 'undefined' ? `${window.location.origin}/pay` : '/pay';
  const q = new URLSearchParams({
    to: params.to,
    a: params.amountSixDecimals,
    exp: String(params.validBefore),
    oid: params.orderId,
  });
  if (params.merchantSig) q.set('msig', params.merchantSig);
  return `${base}?${q.toString()}`;
}

