"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon, SpinnerIcon, TrashIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  /** Current image URL (for edit pre-fill) */
  value?: string | null
  /** Called with the uploaded URL or null when removed */
  onChange: (url: string | null) => void
  /** Disable interactions (e.g. during form save) */
  disabled?: boolean
}

export function ImageUploader({ value, onChange, disabled = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  // Keep the ref in sync with the state for cleanup
  const updatePreview = useCallback((url: string | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
    }
    previewRef.current = url
    setLocalPreview(url)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
      }
    }
  }, [])

  const handleClick = useCallback(() => {
    if (disabled || uploading) return
    setError(null)
    inputRef.current?.click()
  }, [disabled, uploading])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled || uploading) return
      updatePreview(null)
      onChange(null)
      setError(null)
      // Reset the file input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ""
    },
    [disabled, uploading, updatePreview, onChange],
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setError(null)

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload JPEG, PNG, WebP, or GIF.")
        if (inputRef.current) inputRef.current.value = ""
        return
      }

      // Validate file size (5 MB max)
      const maxSize = 5 * 1024 * 1024 // 5,242,880 bytes
      if (file.size > maxSize) {
        setError("File is too large. Maximum size is 5 MB.")
        if (inputRef.current) inputRef.current.value = ""
        return
      }

      // Create local preview and clean up any previous one
      const previewUrl = URL.createObjectURL(file)
      updatePreview(previewUrl)

      // Upload
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("image", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
          throw new Error(result.error || "Upload failed")
        }

        // Success — pass the URL up, clear local preview
        // API returns { success: true, data: { url: "..." } }
        const uploadedUrl: string | undefined = result.data?.url
        onChange(uploadedUrl ?? null)
        updatePreview(null)
        if (inputRef.current) inputRef.current.value = ""
      } catch (err) {
        // Revert local preview on error
        updatePreview(null)
        setError(err instanceof Error ? err.message : "Failed to upload image")
      } finally {
        setUploading(false)
      }
    },
    [updatePreview, onChange],
  )

  const displayUrl = localPreview ?? value ?? null
  const showPreview = displayUrl !== null

  return (
    <div className="flex flex-col gap-1.5">
      {/* Drop zone / preview area */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className={cn(
          "group relative flex items-center justify-center w-full border-2 border-dashed rounded-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
          error ? "border-destructive/50" : "border-border hover:border-muted-foreground/30",
          showPreview ? "h-40" : "h-32",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "cursor-wait",
        )}
        aria-label={uploading ? "Uploading image..." : showPreview ? "Change image" : "Upload image"}
      >
        {uploading ? (
          /* Uploading state */
          <div className="flex flex-col items-center gap-2">
            <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        ) : showPreview ? (
          /* Preview state */
          <>
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            {/* Hover overlay with action buttons */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-colors">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                onClick={handleClick}
                disabled={disabled}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                onClick={handleRemove}
                disabled={disabled}
              >
                <TrashIcon className="size-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-1.5">
            <ImageIcon className="size-7 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">Click to upload</span>
            <span className="text-[10px] text-muted-foreground/50">PNG, JPG, WebP up to 5MB</span>
          </div>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {/* Error message */}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
