"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomBar } from "@/components/bottom-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Delete, Check, Loader2 } from "lucide-react"

export default function POSPage() {
  const [amount, setAmount] = useState("")
  const [showQR, setShowQR] = useState(false)
  const [orderCode, setOrderCode] = useState("")
  const [countdown, setCountdown] = useState(300) // 5 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "paid">("waiting")
  const [todayTotal] = useState("2,847.50")

  // Generate order code when QR is shown
  useEffect(() => {
    if (showQR && !orderCode) {
      const code =
        "AB" +
        Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, "0")
      setOrderCode(code)
    }
  }, [showQR, orderCode])

  // Countdown timer
  useEffect(() => {
    if (showQR && countdown > 0 && paymentStatus === "waiting") {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [showQR, countdown, paymentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return
    if (amount.length < 10) {
      setAmount((prev) => prev + num)
    }
  }

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1))
  }

  const handleSetAmount = () => {
    if (amount && Number.parseFloat(amount) > 0) {
      setShowQR(true)
      setPaymentStatus("waiting")
      setCountdown(300)
    }
  }

  const handleCancel = () => {
    setShowQR(false)
    setAmount("")
    setOrderCode("")
    setPaymentStatus("waiting")
  }

  const handleNewAmount = () => {
    setShowQR(false)
    setAmount("")
    setOrderCode("")
    setPaymentStatus("waiting")
  }

  // Simulate payment after 8 seconds for demo
  useEffect(() => {
    if (showQR && paymentStatus === "waiting") {
      const timer = setTimeout(() => {
        setPaymentStatus("paid")
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [showQR, paymentStatus])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container px-6 py-6 pb-24 md:pb-6">
        <div className="mb-6">
          <Badge variant="secondary" className="rounded-full px-4 py-2 text-sm font-medium">
            Today total: ${todayTotal} USDC
          </Badge>
        </div>

        {!showQR && (
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold mb-6 text-center">Enter Amount</h2>

              {/* Amount Display */}
              <div className="text-center mb-8">
                <div className="text-5xl font-bold mb-2 min-h-[60px] flex items-center justify-center">
                  ${amount || "0"}
                </div>
                <p className="text-muted-foreground">USDC</p>
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    size="lg"
                    className="rounded-2xl h-16 text-xl font-semibold bg-transparent"
                    onClick={() => handleNumberPress(num.toString())}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl h-16 text-xl font-semibold bg-transparent"
                  onClick={() => handleNumberPress(".")}
                >
                  .
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl h-16 text-xl font-semibold bg-transparent"
                  onClick={() => handleNumberPress("0")}
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl h-16 bg-transparent"
                  onClick={handleBackspace}
                >
                  <Delete className="w-6 h-6" />
                </Button>
              </div>

              {/* Set Amount Button */}
              <Button
                size="lg"
                className="w-full rounded-2xl h-14 text-lg font-semibold"
                onClick={handleSetAmount}
                disabled={!amount || Number.parseFloat(amount) <= 0}
              >
                Generate QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {showQR && (
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Payment Request</h2>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {formatTime(countdown)}
                </Badge>
              </div>

              {/* QR Code Placeholder */}
              <div className="w-64 h-64 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center">
                <div className="w-56 h-56 bg-black rounded-xl flex items-center justify-center">
                  <div className="text-white text-xs">QR Code</div>
                </div>
              </div>

              {/* Order Code */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">Order Code</p>
                <p className="text-2xl font-bold font-mono">#{orderCode}</p>
              </div>

              {/* Amount */}
              <div className="mb-8">
                <p className="text-3xl font-bold">${amount} USDC</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 rounded-2xl h-14 bg-transparent"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button variant="ghost" size="lg" className="flex-1 rounded-2xl h-14" onClick={handleNewAmount}>
                  New Amount
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showQR && (
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3">
                {paymentStatus === "waiting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Waiting for payment…</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-green-500 font-semibold">Paid ${amount} USDC</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomBar />
    </div>
  )
}
