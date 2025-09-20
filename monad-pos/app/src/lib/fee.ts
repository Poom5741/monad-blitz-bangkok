import { getContract, createThirdwebClient } from 'thirdweb';
import { monadTestnet } from '@/lib/chain';

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });

export async function getFeeTokenInfo() {
  const address = process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS as `0x${string}`;
  const abi = [
    { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
    { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  ] as const;
  const contract = getContract({ address, abi: abi as any, chain: monadTestnet as any, client });
  const [decimals, symbol] = await Promise.all([
    // @ts-ignore
    contract.read.decimals(),
    // @ts-ignore
    contract.read.symbol(),
  ]);
  return { decimals: Number(decimals), symbol: String(symbol) };
}

