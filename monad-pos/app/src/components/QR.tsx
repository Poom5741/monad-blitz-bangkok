"use client";

import { QRCodeSVG } from 'qrcode.react';

export default function QR({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
      <QRCodeSVG value={value} size={220} level="M" includeMargin />
    </div>
  );
}

