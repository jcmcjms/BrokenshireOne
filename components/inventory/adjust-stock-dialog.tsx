"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { InventoryItem } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  onSaved: () => void
}

export default function AdjustStockDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [type, setType] = useState("addition")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const openDialog = (open: boolean) => {
    if (!open) {
      setType("addition")
      setQuantity("")
      setReason("")
    }
    onOpenChange(open)
  }

  const handleSave = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Quantity must be greater than 0")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/items/${item!.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          quantity: parseFloat(quantity),
          reason: reason || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to adjust stock")
      toast.success("Stock adjusted")
      openDialog(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust stock")
    } finally {
      setSaving(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
          <DialogDescription>
            Current quantity: {item.quantity} {item.unit}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addition">Addition — Add stock</SelectItem>
                <SelectItem value="removal">Removal — Remove stock</SelectItem>
                <SelectItem value="adjustment">Adjustment — Set to exact quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {type === "adjustment" ? "New Quantity *" : "Quantity *"}
            </label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder={type === "adjustment" ? "Set exact quantity" : "Enter quantity"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this adjustment being made?"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
