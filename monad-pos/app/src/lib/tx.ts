import { getContract, prepareContractCall, sendTransaction, waitForReceipt, createThirdwebClient, type Account } from 'thirdweb';
import { monadTestnet } from '@/lib/chain';
import { USDCCloneAbi } from '@/lib/abi/USDCClone';

export async function callContractWrite(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: unknown[],
  account: Account,
) {
  const providedClient: any = (account as any)?.client;
  const client = providedClient || createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });
  const contract = getContract({ address, abi, client, chain: monadTestnet as any });
  const tx = prepareContractCall({ contract, method: functionName as any, params: args as any });
  const res = await sendTransaction({ transaction: tx, account });
  const receipt = await waitForReceipt(res);
  return receipt.transactionHash as string;
}

export async function writeTransfer(opts: { account: Account; to: `0x${string}`; value: bigint }) {
  const providedClient: any = (opts.account as any)?.client;
  const client = providedClient || createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });
  const address = (process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS) as `0x${string}`;
  const abi = USDCCloneAbi as any;
  const contract = getContract({ address, abi, client, chain: monadTestnet as any });
  const tx = prepareContractCall({
    contract,
    // signature string for safety
    method: 'function transfer(address to,uint256 value) returns (bool)' as any,
    params: [opts.to, opts.value] as any,
  });
  const res = await sendTransaction({ transaction: tx, account: opts.account });
  const receipt = await waitForReceipt(res);
  return receipt.transactionHash as string;
}
