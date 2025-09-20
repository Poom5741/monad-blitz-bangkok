const fs = require('fs');
const path = require('path');

// Bridge root .env credentials into the app (clientId only) without leaking secrets.
function readRootEnv() {
  try {
    const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');
    if (!fs.existsSync(rootEnvPath)) return {};
    const text = fs.readFileSync(rootEnvPath, 'utf8');
    const out = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_\-]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

const rootEnv = readRootEnv();
const bridgedClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || process.env['thirdweb-clientId'] || rootEnv['thirdweb-clientId'] || '';
const bridgedSecret = process.env.THIRDWEB_SECRET || process.env['thirdweb-secret'] || rootEnv['thirdweb-secret'] || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Expose only the client ID to the browser bundle
    NEXT_PUBLIC_THIRDWEB_CLIENT_ID: bridgedClientId,
    // Do NOT expose the secret to the browser bundle. Keep server-side only.
  },
  serverRuntimeConfig: {
    THIRDWEB_SECRET: bridgedSecret,
  },
};

module.exports = nextConfig;
