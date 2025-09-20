import { createPublicClient, webSocket } from 'viem';

function envString(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getWsClient() {
  const wss = envString('NEXT_PUBLIC_MONAD_RPC_WSS');
  return createPublicClient({ transport: webSocket(wss) });
}

