"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Scan, XCircle } from "@phosphor-icons/react"

interface BarcodeScannerProps {
  open: boolean
  onScan: (barcode: string) => void
  onClose: () => void
}

const SCANNER_ELEMENT_ID = "barcode-scanner-element"

/**
 * All barcode formats the scanner will try to detect.
 * html5-qrcode defaults to QR-only; we opt in to everything.
 */
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.MAXICODE,
]

export function BarcodeScanner({ open, onScan, onClose }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stop scanner helper
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Ignore errors on stop
      }
      scannerRef.current = null
    }
  }

  // Start scanner — always uses the back camera (facingMode: "environment")
  const startScanner = async () => {
    setError(null)
    setScanning(true)

    try {
      // Clean up any previous scanner element content
      const existingEl = document.getElementById(SCANNER_ELEMENT_ID)
      if (existingEl) {
        existingEl.innerHTML = ""
      }

      // Pass formatsToSupport in constructor (Html5QrcodeConfigs)
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: SUPPORTED_FORMATS,
        useBarCodeDetectorIfSupported: true,
      })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: { exact: "environment" } },
        {
          fps: 15,
          qrbox: { width: 300, height: 120 },
        },
        (decodedText) => {
          // Successful scan
          onScan(decodedText)
          stopScanner().catch(() => {})
          setScanning(false)
        },
        () => {
          // Ignore intermediate decode errors
        },
      )
    } catch (err: any) {
      console.error("[BarcodeScanner] start error:", err)
      // If exact facingMode fails, try without exact
      try {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: SUPPORTED_FORMATS,
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 300, height: 120 },
          },
          (decodedText) => {
            onScan(decodedText)
            stopScanner().catch(() => {})
            setScanning(false)
          },
          () => {},
        )
      } catch (err2: any) {
        console.error("[BarcodeScanner] fallback start error:", err2)
        setError(err2?.message ?? "Failed to start camera. You can enter the barcode manually.")
        setScanning(false)
      }
    }
  }

  // Start scanner when dialog opens
  useEffect(() => {
    if (!open) {
      setManualInput("")
      setError(null)
      setScanning(false)
      stopScanner()
      return
    }

    // Small delay so the DOM element is available
    const timer = setTimeout(() => startScanner(), 300)

    return () => {
      clearTimeout(timer)
      stopScanner()
    }
  }, [open])

  const handleManualSubmit = () => {
    const val = manualInput.trim()
    if (!val) return
    onScan(val)
    setManualInput("")
  }

  const handleClose = () => {
    stopScanner()
    setScanning(false)
    setError(null)
    setManualInput("")
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="size-4" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at a barcode to scan, or type it manually below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Camera viewfinder */}
          <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
            <div ref={containerRef} id={SCANNER_ELEMENT_ID} className="w-full h-full" />
            {error && !scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                <XCircle className="size-8 text-destructive mb-2" />
                <p className="text-xs text-white">{error}</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/4 border-2 border-primary/60 rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          {/* Stop scanner button */}
          <div className="flex items-center justify-end gap-2">
            {scanning && (
              <Button variant="outline" size="sm" onClick={() => { stopScanner(); setScanning(false) }}>
                Stop Scanner
              </Button>
            )}
          </div>

          {/* Manual barcode entry */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or type barcode manually..."
                className="h-8 text-xs pl-7"
              />
              <Scan className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button size="sm" onClick={handleManualSubmit} disabled={!manualInput.trim()}>
              Submit
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <Camera className="size-3.5 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
