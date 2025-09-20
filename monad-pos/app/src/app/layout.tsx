export const metadata = {
  title: 'Monad POS',
  description: 'USDC Clone POS — EIP-3009, gasless-ready',
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

