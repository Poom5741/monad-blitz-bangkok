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
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { getUsdcAddress } from "@/lib/chain";
import { getFeeTokenInfo } from "@/lib/fee";
import { buildTransferWithAuthTypedData } from "@/lib/eip3009";
import { randomNonceBytes32 } from "@/lib/hex";
import { getAddress, isAddress } from "viem";
import { USDCCloneAbi } from "@/lib/abi/USDCClone";
import { callContractWrite, writeTransfer } from "@/lib/tx";
import { useTokenConfigCheck } from "@/hooks/useTokenConfigCheck";
import { featureEip3009 } from "@/lib/flags";

type PaymentStep = "connect" | "authorize" | "send" | "success" | "error";

function mmss(left: number) {
  const m = Math.max(0, Math.floor(left / 60));
  const s = Math.max(0, left % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const account = useActiveAccount();
  const user = account?.address as `0x${string}` | undefined;
  const token = getUsdcAddress();
  const tokenCheck = useTokenConfigCheck();

  const [txHash, setTxHash] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("connect");
  const [error, setError] = useState<"expired" | "invalid" | "network" | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [feeSymbol, setFeeSymbol] = useState<string>("USDC");
  const [feeDecimals, setFeeDecimals] = useState<number>(6);

  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getFeeTokenInfo()
      .then((info) => {
        if (info?.symbol) setFeeSymbol(info.symbol);
        if (info?.decimals != null) setFeeDecimals(info.decimals);
      })
      .catch(() => {});
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
    if (!user || !parsed.valid || expired || !account) return;
    try {
      const useEip = featureEip3009();

      if (!useEip) {
        setPaymentStep('send');
        const hash = await writeTransfer({ account: account as any, to: parsed.to as `0x${string}`, value: parsed.value });
        setTxHash(hash);
        toast.success('Payment submitted', { description: hash });
        setPaymentStep('success');
        return;
      }

      // EIP-3009 flow
      setPaymentStep('authorize');
      const typed = buildTransferWithAuthTypedData({
        from: user as `0x${string}`,
        to: parsed.to as `0x${string}`,
        value: parsed.value,
        validAfter: nowSec,
        validBefore: parsed.expSec,
        nonce: randomNonceBytes32(),
      });

      const signature: string = await (window as any).ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [user, JSON.stringify(typed)],
      });

      const hex = signature.slice(2);
      const r = `0x${hex.slice(0, 64)}` as `0x${string}`;
      const s = `0x${hex.slice(64, 128)}` as `0x${string}`;
      const v = parseInt(hex.slice(128, 130), 16);

      setPaymentStep('send');

      const hash = await callContractWrite(
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
        ],
        account as any
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
      const msg: string = e?.message || '';
      if (/401/.test(msg) || /unauth/i.test(msg)) {
        toast.error('thirdweb authorization failed (401)', {
          description: 'Check NEXT_PUBLIC_THIRDWEB_CLIENT_ID, allowed domains, and Sponsorship Rules for this contract & chain.',
        });
      } else {
        toast.error(msg || 'Network error');
      }
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
                <div className="text-sm text-muted-foreground mt-2">Fee: ~ in {feeSymbol} (sponsored)</div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl shadow-lg">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg">Wallet</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {!user ? (
                <ConnectButton client={{ autoConnect: true }} />
              ) : (
                <div className="space-y-4">
                  {paymentStep === 'connect' && (
                    <Button
                      size="lg"
                      className="w-full rounded-2xl shadow-lg h-14 text-lg"
                      onClick={handlePay}
                      disabled={!!error}
                    >
                      Pay {displayAmount} USDC
                    </Button>
                  )}
                  <div className="text-xs text-muted-foreground text-center">Mode: {featureEip3009() ? 'EIP-3009 (gas-sponsored if available)' : 'Standard transfer'}</div>

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
