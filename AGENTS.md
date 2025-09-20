# Repository Guidelines

## Project Structure & Module Organization
- `monad-pos/contracts/` (Foundry): Solidity in `src/`, scripts in `script/`, tests in `test/`, config in `foundry.toml`. Artifacts in `out/` (do not edit).
- `monad-pos/app/` (Next.js App Router): routes in `src/app/(routes)/`, shared libs in `src/lib/`, hooks in `src/hooks/`, UI in `src/components/`.
- `monad-pos/scripts/`: optional helper CLIs (e.g., `faucet.ts`).
- Config: root `.env.example` for client‑safe vars (NEXT_PUBLIC_*).

## Build, Test, and Development Commands
- Contracts
  - `cd monad-pos/contracts && forge build` — compile Solidity.
  - `forge test` — run Foundry tests (add `-vvv` for verbose).
  - `anvil` — start a local chain.
  - Deploy: `forge script script/Deploy.s.sol --rpc-url <RPC> --private-key <KEY> --broadcast`.
- App (workspace)
  - `npm run dev -w monad-pos/app` — run Next.js dev server.
  - `npm run build -w monad-pos/app` — production build.
  - `npm start -w monad-pos/app` — start production server.

## Coding Style & Naming Conventions
- Solidity: `forge fmt`. Files `PascalCase.sol` (e.g., `USDCClone.sol`). Contracts/events in PascalCase; functions/variables in `camelCase`; constants in `UPPER_CASE`. Do not modify `contracts/lib/`.
- TypeScript/React: 2‑space indent, single quotes, semicolons. Components `PascalCase` (e.g., `Keypad.tsx`); modules `kebab-case` folders; hooks `useXxx`.

## Testing Guidelines
- Contracts: `contracts/test/*.t.sol` using `forge-std/Test.sol`. Cover EIP‑3009 flows (`transferWithAuthorization`, expiry, nonce replay).
- App: add `*.test.tsx` with React Testing Library or Playwright e2e for `/pos` and `/pay` happy paths.

## Commit & Pull Request Guidelines
- Commits: imperative, scoped when helpful — `contracts:`, `app:`, `scripts:`. Example: `app: add POS QR + listener`.
- PRs: include summary, linked issues, test steps, and screenshots for UI. Update `README.md` and `.env.example` when config changes.

## Security & Configuration Tips
- No backend needed (gasless via paymaster). Never commit secrets. Client env: `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_USDCC_ADDRESS`.
- Validate QR payloads client‑side; verify optional merchant signatures when used.
