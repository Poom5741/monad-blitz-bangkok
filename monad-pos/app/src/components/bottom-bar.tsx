"use client"

import { Button } from "@/components/ui/button"
import { Plus, CreditCard, History, Settings, QrCode } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

export function BottomBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isPosPage = pathname === "/pos"
  const isScanPage = pathname === "/scan"
  const isPayPage = pathname === "/pay"

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border p-4">
        <div className="flex items-center justify-center gap-3">
          {isPosPage ? (
            <>
              <Button size="lg" className="flex-1 rounded-2xl h-12 shadow-lg" onClick={() => router.push("/pay")}>
                <Plus className="w-5 h-5 mr-2" />
                New Sale
              </Button>
              <Button variant="outline" size="lg" className="rounded-2xl h-12 px-6 shadow-lg bg-transparent">
                <History className="w-5 h-5" />
              </Button>
            </>
          ) : isScanPage ? (
            <>
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl h-12 px-6 shadow-lg bg-transparent"
                onClick={() => router.push("/pos")}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button size="lg" className="flex-1 rounded-2xl h-12 shadow-lg" disabled>
                <QrCode className="w-5 h-5 mr-2" />
                Scanning...
              </Button>
            </>
          ) : isPayPage ? (
            <>
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl h-12 px-6 shadow-lg bg-transparent"
                onClick={() => router.push("/scan")}
              >
                <QrCode className="w-5 h-5" />
              </Button>
              <Button size="lg" className="flex-1 rounded-2xl h-12 shadow-lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Process Payment
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl h-12 px-6 shadow-lg bg-transparent"
                onClick={() => router.push("/pos")}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button size="lg" className="flex-1 rounded-2xl h-12 shadow-lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Process Payment
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
