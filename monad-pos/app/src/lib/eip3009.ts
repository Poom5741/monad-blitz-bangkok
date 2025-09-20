import type { Hex } from './hex';

type Addr = `0x${string}`;

export type TransferWithAuthParams = {
  from: Addr;
  to: Addr;
  value: bigint | number | string;
  validAfter: bigint | number | string;
  validBefore: bigint | number | string;
  nonce: Hex;
  chainId?: number; // optional override for EIP-712 domain chainId
};

const NEXT_PUBLIC_TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME || '';
const NEXT_PUBLIC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '');
const NEXT_PUBLIC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '') as Addr;

if (!NEXT_PUBLIC_TOKEN_NAME) throw new Error('NEXT_PUBLIC_TOKEN_NAME is not set');
if (!NEXT_PUBLIC_CHAIN_ID) throw new Error('NEXT_PUBLIC_CHAIN_ID is not set');
if (!NEXT_PUBLIC_USDC_ADDRESS) throw new Error('NEXT_PUBLIC_USDC_ADDRESS is not set');

function toBigIntish(x: bigint | number | string): string {
  // For JSON.stringify safety, always return decimal strings for numeric values.
  if (typeof x === 'bigint') return x.toString(10);
  if (typeof x === 'number') return Math.trunc(x).toString(10);
  // Already a string; assume decimal representation
  return x;
}

export function buildTransferWithAuthTypedData(params: TransferWithAuthParams) {
  const domainChainId = params.chainId ?? NEXT_PUBLIC_CHAIN_ID;
  const domain = {
    name: NEXT_PUBLIC_TOKEN_NAME,
    version: '1',
    chainId: domainChainId,
    verifyingContract: NEXT_PUBLIC_USDC_ADDRESS as Addr,
  } as const;

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  } as const;

  const message = {
    from: params.from,
    to: params.to,
    value: toBigIntish(params.value),
    validAfter: toBigIntish(params.validAfter),
    validBefore: toBigIntish(params.validBefore),
    nonce: params.nonce,
  } as const;

  return {
    domain,
    types,
    primaryType: 'TransferWithAuthorization' as const,
    message,
  };
}

export { randomNonceBytes32 } from './hex';
