export function featureEip3009(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_EIP3009 === '1';
}

