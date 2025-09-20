import { createPublicClient, webSocket, http, fallback } from "viem";

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

if (!ENV_CHAIN_ID) throw new Error("NEXT_PUBLIC_MONAD_CHAIN_ID is not set");
if (!NEXT_PUBLIC_MONAD_RPC_HTTPS)
  throw new Error("NEXT_PUBLIC_MONAD_RPC_HTTPS is not set");
if (!NEXT_PUBLIC_MONAD_RPC_WSS)
  throw new Error("NEXT_PUBLIC_MONAD_RPC_WSS is not set");

const monadTestnet = {
  id: ENV_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [NEXT_PUBLIC_MONAD_RPC_HTTPS],
      webSocket: [NEXT_PUBLIC_MONAD_RPC_WSS],
    },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.xyz" },
  },
} as const;

// Optimized client with intelligent transport fallback
let _optimizedClient: ReturnType<typeof createPublicClient> | null = null;

export function getOptimizedClient() {
  if (!_optimizedClient) {
    _optimizedClient = createPublicClient({
      transport: fallback([
        // Primary: WebSocket for real-time events
        webSocket(NEXT_PUBLIC_MONAD_RPC_WSS, {
          reconnect: {
            attempts: 3,
            delay: 1000,
          },
          timeout: 10000,
        }),
        // Fallback: HTTP for reliability
        http(NEXT_PUBLIC_MONAD_RPC_HTTPS, {
          timeout: 8000,
          retryCount: 2,
          retryDelay: 1000,
        }),
      ], {
        rank: false, // Don't auto-rank, keep WebSocket as primary
      }),
    });
  }
  return _optimizedClient;
}

// Separate HTTP-only client for non-blocking operations
let _httpClient: ReturnType<typeof createPublicClient> | null = null;

export function getHttpOnlyClient() {
  if (!_httpClient) {
    _httpClient = createPublicClient({
      transport: http(NEXT_PUBLIC_MONAD_RPC_HTTPS, {
        timeout: 5000,
        retryCount: 1,
        retryDelay: 500,
      }),
    });
  }
  return _httpClient;
}