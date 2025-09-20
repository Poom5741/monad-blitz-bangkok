"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Camera, X, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsScanning(true)
        setHasPermission(true)

        // Start QR detection
        detectQRCode()
      }
    } catch (err) {
      console.error("Camera access denied:", err)
      setError("Camera access is required to scan QR codes")
      setHasPermission(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const detectQRCode = () => {
    // Simulate QR code detection for demo
    // In a real app, you'd use a QR code detection library like jsQR
    setTimeout(() => {
      if (isScanning) {
        // Simulate successful QR scan with payment data
        const mockPaymentData = {
          merchant: "Coffee Shop",
          amount: "12.50",
          orderId: "AB12",
          expiry: Date.now() + 300000, // 5 minutes
        }

        // Navigate to pay page with payment data
        const params = new URLSearchParams({
          merchant: mockPaymentData.merchant,
          amount: mockPaymentData.amount,
          orderId: mockPaymentData.orderId,
          expiry: mockPaymentData.expiry.toString(),
        })

        router.push(`/pay?${params.toString()}`)
      }
    }, 3000) // Simulate 3 second scan time
  }

  const handleManualEntry = () => {
    // For demo, navigate directly to pay page
    router.push("/pay?merchant=Demo%20Store&amount=25.00&orderId=DEMO123&expiry=" + (Date.now() + 300000))
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Scan to Pay</h1>
          </div>
          <p className="text-muted-foreground">Point your camera at the merchant's QR code</p>
        </div>

        {/* Scanner Card */}
        <Card className="rounded-2xl p-6 space-y-4">
          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
            {!isScanning && !hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                <Camera className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="font-medium">Camera Access Required</p>
                  <p className="text-sm text-muted-foreground">Allow camera access to scan QR codes</p>
                </div>
                <Button onClick={startCamera} className="rounded-xl">
                  <Camera className="h-4 w-4 mr-2" />
                  Enable Camera
                </Button>
              </div>
            )}

            {isScanning && (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </div>
                </div>

                {/* Scanning status */}
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Scanning for QR code...
                    </div>
                  </Badge>
                </div>

                {/* Close button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full"
                  onClick={stopCamera}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </Card>

        {/* Manual entry option */}
        <Card className="rounded-2xl p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Can't scan?</h3>
              <p className="text-sm text-muted-foreground">Enter payment details manually or try the demo</p>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full rounded-xl bg-transparent" onClick={handleManualEntry}>
                Try Demo Payment
              </Button>
              <Button variant="ghost" className="w-full rounded-xl" onClick={() => router.push("/pos")}>
                Back to POS
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
