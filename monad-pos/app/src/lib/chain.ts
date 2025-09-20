import { createPublicClient, webSocket, http } from "viem";
import { defineChain } from "thirdweb/chains";

type Hex = `0x${string}`;

// Use explicit env accesses so Next can statically replace them in client bundles.
const ENV_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ||
    process.env.NEXT_PUBLIC_CHAIN_ID ||
    ""
);
const NEXT_PUBLIC_MONAD_RPC_HTTPS =
  process.env.NEXT_PUBLIC_MONAD_RPC_HTTPS || "";
const NEXT_PUBLIC_MONAD_RPC_WSS = process.env.NEXT_PUBLIC_MONAD_RPC_WSS || "";
const NEXT_PUBLIC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS ||
  "") as Hex;
const NEXT_PUBLIC_TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME || "";

if (!ENV_CHAIN_ID) throw new Error("NEXT_PUBLIC_MONAD_CHAIN_ID is not set");
if (!NEXT_PUBLIC_MONAD_RPC_HTTPS)
  throw new Error("NEXT_PUBLIC_MONAD_RPC_HTTPS is not set");
if (!NEXT_PUBLIC_MONAD_RPC_WSS)
  throw new Error("NEXT_PUBLIC_MONAD_RPC_WSS is not set");
if (!NEXT_PUBLIC_USDC_ADDRESS)
  throw new Error(
    "NEXT_PUBLIC_FEE_TOKEN_ADDRESS/NEXT_PUBLIC_USDC_ADDRESS is not set"
  );
if (!NEXT_PUBLIC_TOKEN_NAME)
  throw new Error("NEXT_PUBLIC_TOKEN_NAME is not set");

export const monadTestnet = defineChain({
  id: ENV_CHAIN_ID,
  name: "Monad Testnet",
  rpc: NEXT_PUBLIC_MONAD_RPC_HTTPS,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  blockExplorers: [
    { name: "Monad Explorer", url: "https://testnet.monadexplorer.xyz" },
  ],
});

export function getPublicClientWs() {
  return createPublicClient({
    transport: webSocket(NEXT_PUBLIC_MONAD_RPC_WSS),
  });
}

export function getUsdcAddress(): Hex {
  return NEXT_PUBLIC_USDC_ADDRESS;
}

export function getTokenName(): string {
  return NEXT_PUBLIC_TOKEN_NAME;
}

export function getHttpClient() {
  return createPublicClient({ transport: http(NEXT_PUBLIC_MONAD_RPC_HTTPS) });
}
