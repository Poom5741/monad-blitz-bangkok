# Monad POS + USDCClone (EIP‑3009) on Monad Testnet

A hackathon‑ready Point‑of‑Sale and Pay flow built for Monad Testnet. It ships with a USDC‑style ERC‑20 (6 decimals) that supports EIP‑3009 authorization signatures, thirdweb Account Abstraction (smart accounts) with managed Bundler + ERC‑20 Paymaster, real camera QR scanning, and a simple feature flag to switch between a standard transfer and EIP‑3009 flow.

## Highlights

- USDCClone (ERC‑20, 6 decimals) with EIP‑3009: `transferWithAuthorization` and `receiveWithAuthorization` (EIP‑712 signatures)
- thirdweb v5 provider with Smart Accounts and managed Bundler + ERC‑20 Paymaster (fees in your USDCClone)
- Feature flag: swap between Standard ERC‑20 transfer and EIP‑3009 flow
- POS screen generates QR; Pay screen scans QR with camera and sends the transaction
- Live payment detection via `Transfer(to=merchant, value=amount)` WebSocket event listener
- No backend needed; entirely client‑side

## Repository Layout

```
monad-pos/
├─ contracts/                # Foundry (USDCClone.sol + tests)
│  ├─ src/USDCClone.sol
│  ├─ script/Deploy.s.sol
│  ├─ test/
│  └─ foundry.toml
├─ app/                      # Next.js (App Router)
│  ├─ src/app/pos            # merchant screen (QR + live listener)
│  ├─ src/app/pay            # customer payment screen
│  ├─ src/app/scan           # camera QR scanner (BarcodeDetector API)
│  ├─ src/lib/abi/USDCClone.ts
│  ├─ src/lib/chain.ts       # custom Monad chain (thirdweb createChain)
│  ├─ src/lib/tx.ts          # thirdweb v5 write helpers
│  ├─ src/lib/fee.ts         # fee token (symbol/decimals)
│  ├─ src/lib/flags.ts       # feature flag helpers
│  └─ src/hooks/*
└─ Makefile                  # common tasks (dev/build/forge/anvil/deploy)
```

## Prerequisites

- Node.js 18+
- Foundry (`forge`, `anvil`) if you build/test contracts locally
- A thirdweb project (for clientId) with Allowed Domains set to your dev origin

## Setup

### 1) Contracts (optional)

Build & test:

```
cd monad-pos/contracts
forge build && forge test
```

Local node (separate tab):

```
anvil
```

Deploy (example):

```
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key <KEY> \
  --broadcast
```

Copy the deployed address for the app env below.

### 2) App Environment

```
cd monad-pos/app
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id

# Feature flags
NEXT_PUBLIC_FEATURE_EIP3009=0   # 0 = plain transfer, 1 = EIP-3009

# Chain ID (fallback)
NEXT_PUBLIC_CHAIN_ID=10143

# Preferred Monad Testnet config
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_HTTPS=https://rpc.testnet.monad.xyz
NEXT_PUBLIC_MONAD_RPC_WSS=wss://rpc.testnet.monad.xyz/ws

# Fee token = your USDC clone
NEXT_PUBLIC_FEE_TOKEN_ADDRESS=0xYourUSDCClone
NEXT_PUBLIC_FEE_TOKEN_DECIMALS=6
NEXT_PUBLIC_TOKEN_NAME=USDCClone
```

Important:
- `NEXT_PUBLIC_TOKEN_NAME` must match the constructor `name` used for USDCClone (EIP‑712 domain).
- Add `http://localhost:3000` and `http://127.0.0.1:3000` to thirdweb Allowed Domains.
- In thirdweb → Account Abstraction → Sponsorship Rules: set Chain 10143 (Monad Testnet), Fee token = your USDCClone, Allowed contracts = your USDCClone, Functions = `transferWithAuthorization`, `receiveWithAuthorization`.

### 3) Run

Top‑level workspace:

```
npm install
npm run dev
# or via Makefile
make dev
```

App runs at `http://localhost:3000`.

## Using The App

- `/pos` (merchant)
  - Enter amount; the app generates a time‑boxed QR: `to`, `a` (6‑decimals), `exp`, `oid`.
  - Listens for `Transfer` events over WebSocket and displays success when matched.

- `/scan` (customer)
  - Uses the browser’s `BarcodeDetector` to read QR and navigate to `/pay`.
  - Tip: Works best on Chromium browsers. On unsupported browsers, you’ll see a helpful message.

- `/pay` (customer)
  - Parses the QR parameters and shows amount + recipient.
  - Mode selection (via feature flag):
    - Standard transfer: calls `transfer(to, value)` from the connected account.
    - EIP‑3009: builds EIP‑712 typed data, requests an authorization signature, and calls `transferWithAuthorization`.
  - With thirdweb Smart Accounts + ERC‑20 Paymaster configured, gas can be sponsored and paid in USDCClone.

## Feature Flags

- `NEXT_PUBLIC_FEATURE_EIP3009=0` → Plain ERC‑20 transfer (no EIP‑712 step).
- `NEXT_PUBLIC_FEATURE_EIP3009=1` → EIP‑3009 flow (`transferWithAuthorization`).

## Makefile

Common tasks:

```
make install       # install app deps
make dev           # run Next.js dev server
make build         # build app
make start         # start production server
make env-setup     # copy .env.example → .env.local
make anvil         # start local node
make forge-build   # build contracts
make forge-test    # run Foundry tests
make deploy RPC=<url> KEY=<hex>
```

## Troubleshooting

- 401 from thirdweb
  - Check Client ID, Allowed Domains, and Sponsorship Rules (chain, fee token, allowed contracts/functions).

- “Invalid value used as weak map key”
  - Ensure the dapp is using thirdweb v5 and the write path is using the connected account’s client (already handled).

- BigInt JSON errors
  - The app serializes EIP‑712 numeric fields as decimal strings to avoid `JSON.stringify` issues.

- Camera preview not visible
  - Ensure permissions are granted and test on Chromium. The scanner uses the native `BarcodeDetector` API; when unsupported, a message is shown.

- EIP‑712 domain mismatch
  - `NEXT_PUBLIC_TOKEN_NAME` must exactly equal the on‑chain token `name()`.

## Security

- Do not commit secrets. Only `NEXT_PUBLIC_*` vars are exposed to the browser.
- Smart account sponsorship is managed in the thirdweb dashboard. No server (Engine) is required.

— Happy building on Monad!
