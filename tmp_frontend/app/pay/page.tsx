"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomBar } from "@/components/bottom-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Check, AlertTriangle, Clock, Copy, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

// Mock merchant data - in real app this would come from QR scan or URL params
const mockMerchant = {
  name: "Coffee Shop",
  address: "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
  identicon: "https://api.dicebear.com/7.x/identicon/svg?seed=0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
}

const mockOrder = {
  amount: "25.50",
  currency: "USDC",
  orderId: "AB12",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
}

type PaymentStep = "connect" | "authorize" | "send" | "success" | "error"
type ErrorType = "expired" | "invalid" | "network" | null

export default function PayPage() {
  const router = useRouter()
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("connect")
  const [error, setError] = useState<ErrorType>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [txHash, setTxHash] = useState("")

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setError("expired")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleConnectWallet = async () => {
    try {
      // Simulate thirdweb wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsWalletConnected(true)
      setWalletAddress("0x1234...5678")
      setPaymentStep("connect")
    } catch (err) {
      setError("network")
    }
  }

  const handlePayment = async () => {
    try {
      // Step 1: Authorization
      setPaymentStep("authorize")
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Step 2: Send transaction
      setPaymentStep("send")
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Success
      setTxHash("0xabcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcdef12")
      setPaymentStep("success")
    } catch (err) {
      setError("network")
      setPaymentStep("error")
    }
  }

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container px-6 py-6 pb-24 md:pb-6">
        {/* Back Button - Desktop */}
        <div className="hidden md:block mb-6">
          <Button
            variant="outline"
            className="rounded-2xl shadow-lg bg-transparent"
            onClick={() => router.push("/pos")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to POS
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Error Banners */}
          {error === "expired" && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                This payment request has expired. Please ask the merchant for a new QR code.
              </AlertDescription>
            </Alert>
          )}

          {error === "invalid" && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Invalid payment request. Please scan a valid QR code from the merchant.
              </AlertDescription>
            </Alert>
          )}

          {error === "network" && (
            <Alert className="rounded-2xl border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Network error. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Merchant Info */}
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                  <img src={mockMerchant.identicon || "/placeholder.svg"} alt="Merchant" className="w-full h-full" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Pay {mockMerchant.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {mockMerchant.address.slice(0, 6)}...{mockMerchant.address.slice(-4)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {mockOrder.amount} {mockOrder.currency}
                  </p>
                  <p className="text-sm text-muted-foreground">Order #{mockOrder.orderId}</p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Section */}
          <Card className="rounded-2xl shadow-lg">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg">Wallet</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {!isWalletConnected ? (
                <Button
                  size="lg"
                  className="w-full rounded-2xl shadow-lg h-14 text-lg"
                  onClick={handleConnectWallet}
                  disabled={error === "expired" || error === "invalid"}
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{walletAddress}</span>
                  </div>

                  {paymentStep === "connect" && (
                    <Button
                      size="lg"
                      className="w-full rounded-2xl shadow-lg h-14 text-lg"
                      onClick={handlePayment}
                      disabled={error === "expired" || error === "invalid"}
                    >
                      Pay {mockOrder.amount} {mockOrder.currency}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Progress */}
          {(paymentStep === "authorize" || paymentStep === "send") && (
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {paymentStep === "authorize" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className={paymentStep === "authorize" ? "font-medium" : "text-muted-foreground"}>
                        1. Sign Authorization (EIP-712)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {paymentStep === "send" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-muted rounded-full" />
                      )}
                      <span className={paymentStep === "send" ? "font-medium" : "text-muted-foreground"}>
                        2. Send (gasless)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Card */}
          {paymentStep === "success" && (
            <Card className="rounded-2xl shadow-lg border-green-500/20 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Payment Sent</h2>
                <p className="text-muted-foreground mb-4">
                  Your payment of {mockOrder.amount} {mockOrder.currency} has been sent successfully.
                </p>

                <div className="bg-muted/20 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate">{txHash}</code>
                    <Button size="sm" variant="ghost" onClick={copyTxHash}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button size="lg" className="w-full rounded-2xl shadow-lg h-12" onClick={() => router.push("/pos")}>
                  Back to Merchant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomBar />
    </div>
  )
}
