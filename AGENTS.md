# Repository Guidelines

## Project Structure & Module Organization
- `monad-pos/contracts/` (Foundry): Solidity in `src/`, scripts in `script/`, tests in `test/`; config `foundry.toml`. Build artifacts in `out/` (don’t edit).
- `monad-pos/app/` (Next.js App Router): pages in `src/app/pos|pay`, shared libs in `src/lib/`, hooks in `src/hooks/`, UI in `src/components/`, assets in `public/`.
- `monad-pos/scripts/`: optional helper CLIs (e.g., `faucet.ts`).
- Env templates: `monad-pos/app/.env.example` (copy to `.env.local`).

## Build, Test, and Development Commands
- Contracts
  - `cd monad-pos/contracts && forge build` — compile.
  - `forge test` — run Foundry tests (`-vvv` verbose).
  - `anvil` — start local node.
  - Deploy: `forge script script/Deploy.s.sol --rpc-url <RPC> --private-key <KEY> --broadcast`.
- App (workspace)
  - `npm run dev -w monad-pos/app` — run Next dev server.
  - `npm run build -w monad-pos/app` — build production.
  - `npm start -w monad-pos/app` — start production server.

## Coding Style & Naming Conventions
- Solidity: format with `forge fmt`. Files `PascalCase.sol` (e.g., `USDCClone.sol`). Contracts/events: PascalCase; functions/vars: `camelCase`; constants: `UPPER_CASE`. Avoid editing `contracts/lib/`.
- TypeScript/React: 2‑space indent, single quotes, semicolons. Components `PascalCase` (e.g., `AmountDisplay.tsx`); hooks `useXxx`; folders `kebab-case`.
- Tailwind for styling; prefer utility classes over inline styles.

## Testing Guidelines
- Contracts: `contracts/test/*.t.sol` using `forge-std/Test.sol`. Cover EIP‑3009 flows: `transferWithAuthorization`, expiry windows, nonce replay.
- App: add `*.test.tsx` (React Testing Library) and/or e2e for `/pos` → `/pay` happy path.

## Commit & Pull Request Guidelines
- Commits: imperative, scoped when useful — `contracts:`, `app:`, `scripts:`. Example: `app: wire EIP-3009 signing on /pay`.
- PRs: include summary, linked issues, test steps, and screenshots/recordings for UI. Update README and env examples when config changes.

## Security & Configuration Tips
- Do not commit secrets. Required client env (set in `app/.env.local`):
  - `NEXT_PUBLIC_MONAD_RPC_WSS`, `NEXT_PUBLIC_MONAD_RPC_HTTPS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_TOKEN_NAME`.
  - Optional gasless: `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `NEXT_PUBLIC_THIRDWEB_PAYMASTER_URL`.
- EIP‑712: `NEXT_PUBLIC_TOKEN_NAME` must exactly match the token constructor name; mismatch breaks signatures.
