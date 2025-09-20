import type { Hex } from './hex';

type Addr = `0x${string}`;

export type TransferWithAuthParams = {
  from: Addr;
  to: Addr;
  value: bigint | number | string;
  validAfter: bigint | number | string;
  validBefore: bigint | number | string;
  nonce: Hex;
};

function envString(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function envNumber(name: string): number {
  const v = Number(process.env[name] || '');
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function toBigIntish(x: bigint | number | string): bigint | string {
  // EIP-712 can accept decimal strings or bigint; prefer bigint if safe
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number') return BigInt(x);
  // if string, let signer handle as decimal string
  return x;
}

export function buildTransferWithAuthTypedData(params: TransferWithAuthParams) {
  const domain = {
    name: envString('NEXT_PUBLIC_TOKEN_NAME'),
    version: '1',
    chainId: envNumber('NEXT_PUBLIC_CHAIN_ID'),
    verifyingContract: envString('NEXT_PUBLIC_USDC_ADDRESS') as Addr,
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
