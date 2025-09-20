import { createPublicClient, webSocket, http } from 'viem';

type Hex = `0x${string}`;

function envNumber(name: string): number {
  const v = Number(process.env[name] || '');
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function envString(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const monadTestnet = {
  id: envNumber('NEXT_PUBLIC_CHAIN_ID'),
  name: 'Monad Testnet',
  rpc: [envString('NEXT_PUBLIC_MONAD_RPC_HTTPS')],
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  blockExplorers: undefined as unknown as undefined,
  testnet: true,
};

export function getPublicClientWs() {
  const wss = envString('NEXT_PUBLIC_MONAD_RPC_WSS');
  return createPublicClient({ transport: webSocket(wss) });
}

export function getUsdcAddress(): Hex {
  return envString('NEXT_PUBLIC_USDC_ADDRESS') as Hex;
}

export function getTokenName(): string {
  return envString('NEXT_PUBLIC_TOKEN_NAME');
}

export function getHttpClient() {
  const url = envString('NEXT_PUBLIC_MONAD_RPC_HTTPS');
  return createPublicClient({ transport: http(url) });
}
