"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { InventoryItem, InventoryMovement } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}

const categoryLabels: Record<string, string> = {
  produce: "Produce",
  meat: "Meat",
  dairy: "Dairy",
  dry_goods: "Dry Goods",
  beverage: "Beverage",
  other: "Other",
}

const typeBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  addition: "default",
  removal: "destructive",
  adjustment: "secondary",
}

const typeLabels: Record<string, string> = {
  addition: "Addition",
  removal: "Removal",
  adjustment: "Adjustment",
}

export default function ItemDetailSheet({ open, onOpenChange, item }: Props) {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)

  useEffect(() => {
    if (open && item) {
      setLoadingMovements(true)
      fetch(`/api/inventory/movements?item_id=${item.id}`)
        .then((res) => res.json())
        .then((data) => setMovements(data.data ?? data ?? []))
        .catch(() => setMovements([]))
        .finally(() => setLoadingMovements(false))
    }
  }, [open, item])

  if (!item) return null

  const isLowStock = item.min_stock_level > 0 && item.quantity < item.min_stock_level

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item.name}
            <Badge variant="outline" className="text-[10px]">
              {categoryLabels[item.category] ?? item.category}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-none border border-border p-3">
              <p className="text-[10px] text-muted-foreground">Current Quantity</p>
              <p className="mt-0.5 text-sm font-medium">
                {item.quantity} {item.unit}
              </p>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-[10px] text-muted-foreground">Min Stock Level</p>
              <p className="mt-0.5 text-sm font-medium">{item.min_stock_level} {item.unit}</p>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-[10px] text-muted-foreground">Status</p>
              <Badge variant={isLowStock ? "destructive" : "default"} className="mt-0.5">
                {isLowStock ? "Low Stock" : "OK"}
              </Badge>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-[10px] text-muted-foreground">Unit Cost</p>
              <p className="mt-0.5 text-sm font-medium">
                {item.unit_cost != null ? `PHP ${item.unit_cost.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Movement History */}
          <div>
            <h3 className="text-xs font-medium mb-2">Movement History</h3>
            {loadingMovements ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No movements recorded yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-[10px]">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariants[m.type] ?? "outline"} className="text-[10px]">
                          {typeLabels[m.type] ?? m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {m.type === "adjustment" ? (
                          <span className="text-muted-foreground">
                            {m.previous_quantity} → {m.new_quantity}
                          </span>
                        ) : (
                          <span className={m.quantity_change > 0 ? "text-green-600" : "text-red-600"}>
                            {m.quantity_change > 0 ? "+" : ""}{m.quantity_change}
                          </span>
                        )}
                        {" "}{item.unit}
                      </TableCell>
                      <TableCell className="text-[10px]">{m.performed_by_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
