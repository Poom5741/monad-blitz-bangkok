# Monad POS Monorepo — USDC Clone (EIP-3009)

Monorepo for a hackathon‑ready POS and pay flow using a USDC‑style token with `transferWithAuthorization` (EIP‑3009). No backend required — the customer signs an EIP‑712 payload and submits directly; the POS listens for on‑chain `Transfer` events.

## Repository Layout

```
monad-pos/
├─ contracts/                # Foundry (USDCClone.sol)
│  ├─ src/USDCClone.sol
│  ├─ script/Deploy.s.sol
│  ├─ test/
│  └─ foundry.toml
├─ app/                      # Next.js (App Router)
│  ├─ src/app/(routes)/pos   # merchant screen (QR + live listener)
│  ├─ src/app/(routes)/pay   # customer payment screen
│  ├─ src/lib/abi/USDCClone.json
│  ├─ src/lib/eip712/transferWithAuthorization.ts
│  └─ src/hooks/*
└─ scripts/                  # optional helpers (e.g., faucet)
```

## Quickstart

1) Contracts
- Build/tests: `cd monad-pos/contracts && forge build && forge test`
- Local chain: `anvil`
- Deploy: `forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key <KEY> --broadcast`

2) App
- Copy env: `cp monad-pos/app/.env.example monad-pos/app/.env.local`
- Set required vars: `NEXT_PUBLIC_MONAD_RPC_WSS`, `NEXT_PUBLIC_MONAD_RPC_HTTPS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_TOKEN_NAME`, and optionally `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL` for gasless.
- Run: `npm run dev -w monad-pos/app` (Next.js dev server)

## Flows
- POS (`/pos`): Merchant sets amount; app renders QR with `to`, `a` (6‑decimals), `exp`, `oid`, and listens over WebSocket for `Transfer(to=merchant, value=a)`.
- Pay (`/pay`): Parses QR, builds EIP‑712 for EIP‑3009, requests wallet signature, and calls `transferWithAuthorization` directly. For gasless, integrate thirdweb Smart Wallet + Paymaster.

## Notes
- Token decimals: 6 (USDC‑style) via override in `USDCClone.sol`.
- EIP‑712 domain name must match token constructor `name`. Set `NEXT_PUBLIC_TOKEN_NAME` equal to the exact `name` used when deploying `USDCClone`; mismatch will break signature verification and cause `transferWithAuthorization` to revert.
- No server, no DB. Keep secrets out of the repo.
