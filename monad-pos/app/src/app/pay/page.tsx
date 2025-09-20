"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wallet, Check, AlertTriangle, Clock, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAddress, useChainId, useNetworkMismatch, useSwitchChain, ConnectWallet } from "@thirdweb-dev/react";
import { getUsdcAddress, monadTestnet } from "@/lib/chain";
import { buildTransferWithAuthTypedData } from "@/lib/eip3009";
import { randomNonceBytes32 } from "@/lib/hex";
import { getAddress, isAddress } from "viem";
import { USDCCloneAbi } from "@/lib/abi/USDCClone";
import { sendGasless } from "@/lib/tx";
import { useTokenConfigCheck } from "@/hooks/useTokenConfigCheck";

type PaymentStep = "connect" | "authorize" | "send" | "success" | "error";

function mmss(left: number) {
  const m = Math.max(0, Math.floor(left / 60));
  const s = Math.max(0, left % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAddress();
  const activeChainId = useChainId();
  const isMismatch = useNetworkMismatch();
  const switchChain = useSwitchChain();
  const token = getUsdcAddress();
  const tokenCheck = useTokenConfigCheck();

  const [txHash, setTxHash] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("connect");
  const [error, setError] = useState<"expired" | "invalid" | "network" | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const query = useMemo(() => {
    const to = params.get('to') || '';
    const a = params.get('a') || '';
    const exp = params.get('exp') || '';
    const oid = params.get('oid') || '';
    return { to, a, exp, oid };
  }, [params]);

  const parsed = useMemo(() => {
    try {
      if (!isAddress(query.to)) return { valid: false as const };
      const to = getAddress(query.to);
      if (!/^\d+$/.test(query.a)) return { valid: false as const };
      const value = BigInt(query.a);
      const expSec = Number(query.exp || '0');
      if (!Number.isFinite(expSec) || expSec <= 0) return { valid: false as const };
      const oid = query.oid;
      if (!oid) return { valid: false as const };
      return { valid: true as const, to, value, expSec, oid };
    } catch {
      return { valid: false as const };
    }
  }, [query]);

  const expired = parsed.valid ? nowSec > parsed.expSec : false;
  const timeLeft = parsed.valid ? Math.max(0, parsed.expSec - nowSec) : 0;

  useEffect(() => {
    if (!parsed.valid) setError('invalid');
    else if (expired) setError('expired');
    else setError(null);
  }, [parsed, expired]);

  async function handlePay() {
    if (!user || !parsed.valid || expired) return;
    // Enforce Monad Testnet only
    if (activeChainId !== (monadTestnet as any).chainId) {
      try { await (switchChain as any)?.((monadTestnet as any).chainId); } catch {}
      return;
    }
    try {
      setPaymentStep('authorize');
      const typed = buildTransferWithAuthTypedData({
        from: user as `0x${string}`,
        to: parsed.to as `0x${string}`,
        value: parsed.value,
        validAfter: nowSec,
        validBefore: parsed.expSec,
        nonce: randomNonceBytes32(),
      });

      // Sign via EIP-712
      // Prefer window.ethereum directly to avoid extra deps; Thirdweb connects the wallet.
      const signature: string = await (window as any).ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [user, JSON.stringify(typed)],
      });

      // split v,r,s
      const hex = signature.slice(2);
      const r = `0x${hex.slice(0, 64)}` as `0x${string}`;
      const s = `0x${hex.slice(64, 128)}` as `0x${string}`;
      const v = parseInt(hex.slice(128, 130), 16);

      setPaymentStep('send');

      const hash = await sendGasless(
        token,
        USDCCloneAbi as any,
        'transferWithAuthorization',
        [
          user as `0x${string}`,
          parsed.to as `0x${string}`,
          parsed.value,
          BigInt(nowSec),
          BigInt(parsed.expSec),
          typed.message.nonce,
          v,
          r,
          s,
        ]
      );
      setTxHash(hash);
      toast.success('Payment submitted', { description: hash });
      setPaymentStep('success');
    } catch (e: any) {
      if (e?.code === 4001) {
        toast.info('Signature rejected by user');
        setPaymentStep('connect');
        return;
      }
      toast.error(e?.message || 'Network error');
      setError('network');
      setPaymentStep('error');
    }
  }

  function copyTxHash() {
    if (txHash) navigator.clipboard.writeText(txHash);
  }

  const displayAmount = useMemo(() => {
    if (!parsed.valid) return '0';
    const s = parsed.value.toString();
    const head = s.length > 6 ? s.slice(0, -6) : '0';
    const tail = s.padStart(7, '0').slice(-6).replace(/0+$/, '');
    return tail ? `${head}.${tail}` : head;
  }, [parsed]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-6 py-6 pb-24 md:pb-6">
        <div className="hidden md:block mb-6">
          <Button variant="outline" className="rounded-2xl shadow-lg bg-transparent" onClick={() => router.push('/pos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to POS
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {error === 'expired' && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">This payment request has expired.</AlertDescription>
            </Alert>
          )}

          {error === 'invalid' && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">Invalid payment request.</AlertDescription>
            </Alert>
          )}

          {error === 'network' && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">Network error, please try again.</AlertDescription>
            </Alert>
          )}

          {(tokenCheck.nameMismatch || tokenCheck.decimalsMismatch) && (
            <Alert className="rounded-2xl border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-500">
                Signature domain mismatch; check TOKEN_NAME/decimals
              </AlertDescription>
            </Alert>
          )}

          {parsed.valid && (
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold">Pay Merchant</h1>
                    <p className="text-sm text-muted-foreground">Order #{parsed.oid}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    <Clock className="w-3 h-3 mr-1" /> {mmss(timeLeft)}
                  </Badge>
                </div>
                <div className="mt-4 text-3xl font-bold">{displayAmount} USDC</div>
                <div className="text-sm text-muted-foreground break-all mt-2">To: {parsed.to}</div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl shadow-lg">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg">Wallet</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {!user ? (
                <ConnectWallet theme="dark" btnTitle="Connect Wallet" modalTitle="Connect Wallet"/>
              ) : (
                <div className="space-y-4">
                  {activeChainId !== (monadTestnet as any).chainId && (
                    <Alert className="rounded-2xl border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-yellow-500 flex items-center justify-between">
                        Wrong network. Please switch to Monad Testnet.
                        <Button size="sm" className="ml-3" onClick={() => (switchChain as any)?.((monadTestnet as any).chainId)}>
                          Switch Network
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {paymentStep === 'connect' && (
                    <Button
                      size="lg"
                      className="w-full rounded-2xl shadow-lg h-14 text-lg"
                      onClick={handlePay}
                      disabled={!!error || activeChainId !== (monadTestnet as any).chainId}
                    >
                      Pay {displayAmount} USDC
                    </Button>
                  )}

                  {(paymentStep === 'authorize' || paymentStep === 'send') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {paymentStep === 'authorize' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <span className={paymentStep === 'authorize' ? 'font-medium' : 'text-muted-foreground'}>
                            1. Sign Authorization (EIP-712)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {paymentStep === 'send' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted rounded-full" />
                          )}
                          <span className={paymentStep === 'send' ? 'font-medium' : 'text-muted-foreground'}>
                            2. Send Transaction
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStep === 'success' && (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate">{txHash}</code>
                          <Button size="sm" variant="ghost" onClick={() => txHash && navigator.clipboard.writeText(txHash)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button size="lg" className="w-full rounded-2xl shadow-lg h-12" onClick={() => router.push('/pos')}>
                        Back to Merchant
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
