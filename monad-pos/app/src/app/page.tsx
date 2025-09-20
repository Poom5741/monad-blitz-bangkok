import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, QrCode, CreditCard, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-4 pt-20 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-balance">Welcome to Monad POS</h1>
            <p className="text-muted-foreground text-balance">Fast, secure payments on Monad Testnet</p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            Powered by Monad Blockchain
          </Badge>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Merchant Card */}
          <Card className="rounded-2xl p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">I'm a Merchant</h3>
                  <p className="text-sm text-muted-foreground">Accept payments and manage sales</p>
                </div>
              </div>
              <Link href="/pos" className="block">
                <Button className="w-full rounded-xl h-12 shadow-sm">
                  Open POS System
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Customer Card */}
          <Card className="rounded-2xl p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">I'm a Customer</h3>
                  <p className="text-sm text-muted-foreground">Scan QR codes to make payments</p>
                </div>
              </div>
              <Link href="/scan" className="block">
                <Button variant="outline" className="w-full rounded-xl h-12 shadow-sm bg-transparent">
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan to Pay
                </Button>
              </Link>
            </div>
          </Card>

          {/* Demo Payment Card */}
          <Card className="rounded-2xl p-6 shadow-lg border-dashed">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Try Demo Payment</h3>
                  <p className="text-sm text-muted-foreground">Test the payment flow without scanning</p>
                </div>
              </div>
              <Link
                href="/pay?merchant=Demo%20Store&amount=25.00&orderId=DEMO123&expiry=9999999999999"
                className="block"
              >
                <Button variant="ghost" className="w-full rounded-xl h-12">
                  Start Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Secure • Fast • Gasless Transactions</p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connected to Monad Testnet
          </div>
        </div>
      </div>
    </div>
  )
}
