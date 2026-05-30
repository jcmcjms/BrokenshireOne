"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { FileArrowDown, UploadSimple, CheckCircle, WarningCircle, Spinner } from "@phosphor-icons/react"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ImportResult {
  created: number
  updated: number
  errors: { row: number; field: string; reason: string }[]
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<"create" | "update">("create")
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      return
    }
    // Validate file extension
    const ext = selectedFile.name.split(".").pop()?.toLowerCase()
    if (ext !== "xlsx") {
      toast.error("Please select a .xlsx file")
      return
    }
    setFile(selectedFile)
    setResult(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileChange(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file")
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mode", mode)

      const res = await fetch("/api/menu/import", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || "Import failed")
      }

      const importResult: ImportResult = {
        created: json.created ?? 0,
        updated: json.updated ?? 0,
        errors: json.errors ?? [],
      }

      setResult(importResult)

      if (importResult.errors.length === 0) {
        toast.success(`Import complete: ${importResult.created} created, ${importResult.updated} updated`)
        onSuccess()
      } else {
        toast.warning(
          `Import finished with ${importResult.errors.length} error(s): ${importResult.created} created, ${importResult.updated} updated`,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setMode("create")
      setResult(null)
      setDragOver(false)
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArrowDown className="size-4" />
            Import Menu Items
          </DialogTitle>
          <DialogDescription>
            Upload a .xlsx file to bulk create or update menu items.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* Results view */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="flex-1 text-center">
                <p className="text-lg font-heading font-bold text-emerald-600 dark:text-emerald-400">{result.created}</p>
                <p className="text-[10px] text-muted-foreground">Created</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-heading font-bold text-blue-600 dark:text-blue-400">{result.updated}</p>
                <p className="text-[10px] text-muted-foreground">Updated</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-heading font-bold text-destructive">{result.errors.length}</p>
                <p className="text-[10px] text-muted-foreground">Errors</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="flex flex-col gap-1 max-h-40 overflow-auto">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <WarningCircle className="size-3.5" />
                  Error Details
                </p>
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-[10px] text-muted-foreground pl-5">
                    Row {err.row}: {err.field} — {err.reason}
                  </p>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Import Another File
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Upload view */
          <div className="flex flex-col gap-4">
            {/* File drop zone */}
            <div
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <CheckCircle className="size-8 text-emerald-500" />
                  <p className="text-xs font-medium">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <UploadSimple className="size-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Drop your .xlsx file here, or click to browse
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Expected columns: Name, Category, Price, Description, Available, Barcode, Image URL
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Import mode */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Import Mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as "create" | "update")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="create" id="mode-create" />
                  <Label htmlFor="mode-create" className="text-xs cursor-pointer">Create only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="update" id="mode-update" />
                  <Label htmlFor="mode-update" className="text-xs cursor-pointer">Create &amp; Update</Label>
                </div>
              </RadioGroup>
            </div>

            {mode === "update" && (
              <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                In update mode, existing items are matched by barcode first, then by name. If no match is found, a new item is created.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent mr-1" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadSimple className="size-3.5 mr-1" />
                    Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
