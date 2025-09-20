type Hex = `0x${string}`;

export function buildTransferTypedData(args: {
  chainId: number;
  verifyingContract: Hex;
  from: Hex;
  to: Hex;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}) {
  const domain = {
    name: 'USDC Clone',
    version: '1',
    chainId: args.chainId,
    verifyingContract: args.verifyingContract,
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
    from: args.from,
    to: args.to,
    value: args.value,
    validAfter: BigInt(args.validAfter),
    validBefore: BigInt(args.validBefore),
    nonce: args.nonce,
  } as const;

  return { domain, types, message };
}

