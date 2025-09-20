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

## Setup

### 1. Deploy the USDCClone Contract

First, navigate to the contracts directory and build the project:

```bash
cd monad-pos/contracts
forge build
```

Start a local blockchain (in a separate terminal):

```bash
anvil
```

Deploy the USDCClone contract:

```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

**Note:** The private key above is the default Anvil account #0. For production, use your own private key.

### 2. Extract the Contract Address

After deployment, look for the contract address in the console output:

```
USDCClone deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Copy this address for the next step.

### 3. Configure Environment Variables

Navigate to the app directory and copy the environment template:

```bash
cd ../app
cp .env.example .env.local
```

Edit `.env.local` and set the following variables:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_MONAD_CHAIN_ID=20143
NEXT_PUBLIC_MONAD_RPC_HTTPS=https://rpc.testnet.monad.xyz
NEXT_PUBLIC_MONAD_RPC_WSS=wss://rpc.testnet.monad.xyz/ws
NEXT_PUBLIC_FEE_TOKEN_ADDRESS=0xYourUSDCClone
NEXT_PUBLIC_FEE_TOKEN_DECIMALS=6
NEXT_PUBLIC_TOKEN_NAME=USDCClone
```

Set `NEXT_PUBLIC_FEE_TOKEN_ADDRESS` to the deployed USDCClone address.

### Feature Flags

- `NEXT_PUBLIC_FEATURE_EIP3009=0` → Plain ERC‑20 transfer (simplest fallback; no EIP‑712 signature step).
- `NEXT_PUBLIC_FEATURE_EIP3009=1` → EIP‑3009 gasless‑style flow (`transferWithAuthorization`), compatible with thirdweb AA + Paymaster.

Recommended env for Monad Testnet:

```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_HTTPS=https://rpc.testnet.monad.xyz
NEXT_PUBLIC_MONAD_RPC_WSS=wss://rpc.testnet.monad.xyz/ws
NEXT_PUBLIC_FEE_TOKEN_ADDRESS=0xYourUSDCClone
NEXT_PUBLIC_FEE_TOKEN_DECIMALS=6
NEXT_PUBLIC_TOKEN_NAME=USDCClone
NEXT_PUBLIC_FEATURE_EIP3009=0
```

### 4. Start the Application

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Quickstart (Alternative)

1) Contracts
- Build/tests: `cd monad-pos/contracts && forge build && forge test`
- Local chain: `anvil`
- Deploy: `forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key <KEY> --broadcast`

2) App
- Copy env: `cp monad-pos/app/.env.example monad-pos/app/.env.local`
- Set required vars: `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `NEXT_PUBLIC_MONAD_CHAIN_ID`, `NEXT_PUBLIC_MONAD_RPC_HTTPS`, `NEXT_PUBLIC_MONAD_RPC_WSS`, `NEXT_PUBLIC_FEE_TOKEN_ADDRESS`, `NEXT_PUBLIC_FEE_TOKEN_DECIMALS`, `NEXT_PUBLIC_TOKEN_NAME`.
- Run: `npm run dev -w monad-pos/app` (Next.js dev server)

## Flows
- POS (`/pos`): Merchant sets amount; app renders QR with `to`, `a` (6‑decimals), `exp`, `oid`, and listens over WebSocket for `Transfer(to=merchant, value=a)`.
- Pay (`/pay`): Parses QR, builds EIP‑712 for EIP‑3009, requests wallet signature, and calls `transferWithAuthorization` directly. For gasless, integrate thirdweb Smart Wallet + Paymaster.

## Notes
- Token decimals: 6 (USDC‑style) via override in `USDCClone.sol`.
- EIP‑712 domain name must match token constructor `name`. Set `NEXT_PUBLIC_TOKEN_NAME` equal to the exact `name` used when deploying `USDCClone`; mismatch will break signature verification and cause `transferWithAuthorization` to revert.
- No server, no DB. Keep secrets out of the repo.
