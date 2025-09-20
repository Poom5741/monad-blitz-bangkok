export type Hex = `0x${string}`;

function toHex(bytes: Uint8Array): Hex {
  const hex: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, '0');
  }
  return (`0x${hex.join('')}`) as Hex;
}

export function randomNonceBytes32(): Hex {
  const arr = new Uint8Array(32);
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    throw new Error('Secure crypto.getRandomValues not available');
  }
  globalThis.crypto.getRandomValues(arr);
  return toHex(arr);
}

