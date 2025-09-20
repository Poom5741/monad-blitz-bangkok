/**
 * Placeholder faucet script for local testing.
 * Example: mint tokens to a wallet (requires contract with mint capability).
 */

import { createWalletClient, http, encodeFunctionData } from 'viem';

async function main() {
  const rpc = process.env.RPC_URL!;
  const token = process.env.USDCC_ADDRESS as `0x${string}`;
  const to = process.env.MINT_TO as `0x${string}`;
  const amount = BigInt(process.env.MINT_AMOUNT || '1000000'); // 1.0 with 6 decimals

  const client = createWalletClient({ transport: http(rpc) });
  const data = encodeFunctionData({
    abi: [
      {
        type: 'function', name: 'mint', stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [],
      },
    ] as const,
    functionName: 'mint',
    args: [to, amount],
  });

  const hash = await client.sendTransaction({ to: token, data });
  console.log('Mint tx:', hash);
}

main().catch((e) => { console.error(e); process.exit(1); });

