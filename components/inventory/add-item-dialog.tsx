"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { InventoryItem } from "@/types"

const CATEGORIES = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "dairy", label: "Dairy" },
  { value: "dry_goods", label: "Dry Goods" },
  { value: "beverage", label: "Beverage" },
  { value: "other", label: "Other" },
] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: InventoryItem | null
  onSaved: () => void
}

const emptyForm = {
  name: "",
  category: "",
  unit: "",
  quantity: "0",
  min_stock_level: "0",
  unit_cost: "",
}

export default function AddItemDialog({ open, onOpenChange, editingItem, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Populate form when editingItem changes (edit mode)
  useEffect(() => {
    if (editingItem) {
      setForm({
        name: editingItem.name,
        category: editingItem.category,
        unit: editingItem.unit,
        quantity: editingItem.quantity.toString(),
        min_stock_level: editingItem.min_stock_level.toString(),
        unit_cost: editingItem.unit_cost?.toString() ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [editingItem])

  const openDialog = (open: boolean) => {
    if (!open) {
      setForm(emptyForm)
    }
    onOpenChange(open)
  }

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unit) {
      toast.error("Name, category, and unit are required")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        min_stock_level: parseFloat(form.min_stock_level) || 0,
      }
      if (form.unit_cost) {
        payload.unit_cost = parseFloat(form.unit_cost)
      }

      const res = await fetch(
        editingItem ? `/api/inventory/items/${editingItem.id}` : "/api/inventory/items",
        {
          method: editingItem ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) throw new Error("Failed to save item")
      toast.success(editingItem ? "Item updated" : "Item created")
      openDialog(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>
            {editingItem ? "Update the inventory item details." : "Fill in the details for the new inventory item."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Item name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Category *</label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Unit *</label>
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. kg, liters, pieces"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Current Quantity</label>
              <Input
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min Stock Level</label>
              <Input
                value={form.min_stock_level}
                onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                type="number"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Unit Cost (optional)</label>
            <Input
              value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingItem ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
