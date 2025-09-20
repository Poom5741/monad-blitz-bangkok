export function getEnvChainId(): number {
  const id = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '0');
  if (!id) throw new Error('NEXT_PUBLIC_CHAIN_ID is not set');
  return id;
}

export function getEnvRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_RPC_URL;
  if (!url) throw new Error('NEXT_PUBLIC_RPC_URL is not set');
  return url;
}

export function getUsdccAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_USDCC_ADDRESS as `0x${string}` | undefined;
  if (!addr) throw new Error('NEXT_PUBLIC_USDCC_ADDRESS is not set');
  return addr;
}

