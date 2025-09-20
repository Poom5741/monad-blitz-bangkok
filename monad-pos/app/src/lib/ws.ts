import { createPublicClient, http, webSocket } from "viem";
import { defineChain } from "viem";

const wssUrl = process.env.NEXT_PUBLIC_MONAD_RPC_WSS!;
const httpsUrl = process.env.NEXT_PUBLIC_MONAD_RPC_HTTPS!;

// Define Monad testnet for viem
const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || "10143"),
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [httpsUrl], webSocket: wssUrl ? [wssUrl] : undefined },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.xyz" },
  },
});

// Prefer WS; fall back to HTTP polling if WS not available.
export function getPublicClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: wssUrl ? webSocket(wssUrl) : http(httpsUrl, { batch: true }),
  });
}
