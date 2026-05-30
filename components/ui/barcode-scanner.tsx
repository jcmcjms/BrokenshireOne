"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Scan, XCircle, CameraRotate } from "@phosphor-icons/react"

interface BarcodeScannerProps {
  open: boolean
  onScan: (barcode: string) => void
  onClose: () => void
}

const SCANNER_ELEMENT_ID = "barcode-scanner-element"

export function BarcodeScanner({ open, onScan, onClose }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
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

  // Start scanner with a given camera ID
  const startScanner = async (cameraId?: string) => {
    setError(null)
    setScanning(true)

    try {
      // Clean up previous instance
      const existingEl = document.getElementById(SCANNER_ELEMENT_ID)
      if (existingEl) {
        existingEl.innerHTML = ""
      }

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
      scannerRef.current = scanner

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
      }

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" as const }

      await scanner.start(
        cameraConfig,
        config,
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
      setError(err?.message ?? "Failed to start camera")
      setScanning(false)
    }
  }

  // Enumerate cameras and start scanner on open
  useEffect(() => {
    if (!open) {
      setManualInput("")
      setError(null)
      setScanning(false)
      stopScanner()
      return
    }

    // Enumerate available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices)
        // Start with the back-facing / environment camera
        const backCam = devices.find(
          (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"),
        )
        startScanner(backCam?.id)
      })
      .catch((err) => {
        console.error("[BarcodeScanner] getCameras error:", err)
        setError("Camera access denied or no camera found. You can enter the barcode manually.")
      })

    return () => {
      stopScanner()
    }
  }, [open])

  const handleSwitchCamera = () => {
    if (cameras.length < 2) return
    const currentIdx = cameras.findIndex((c) => c.id === selectedCamera)
    const nextIdx = (currentIdx + 1) % cameras.length
    const nextCam = cameras[nextIdx]
    setSelectedCamera(nextCam.id)
    stopScanner().then(() => startScanner(nextCam.id))
  }

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
                <div className="w-3/4 h-1/3 border-2 border-primary/60 rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="flex items-center justify-between gap-2">
            {cameras.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleSwitchCamera} className="gap-1">
                <CameraRotate className="size-3.5" />
                Switch Camera
              </Button>
            )}
            <div className="flex-1" />
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
