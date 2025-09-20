import { createPublicClient, webSocket } from 'viem';

const NEXT_PUBLIC_MONAD_RPC_WSS = process.env.NEXT_PUBLIC_MONAD_RPC_WSS || '';
if (!NEXT_PUBLIC_MONAD_RPC_WSS) throw new Error('NEXT_PUBLIC_MONAD_RPC_WSS is not set');

export function getWsClient() {
  return createPublicClient({ transport: webSocket(NEXT_PUBLIC_MONAD_RPC_WSS) });
}
