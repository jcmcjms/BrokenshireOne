"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, Package } from "@phosphor-icons/react"
import AddItemDialog from "@/components/inventory/add-item-dialog"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import type { InventoryItem } from "@/types"

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "dairy", label: "Dairy" },
  { value: "dry_goods", label: "Dry Goods" },
  { value: "beverage", label: "Beverage" },
  { value: "other", label: "Other" },
] as const

const categoryLabels: Record<string, string> = {
  produce: "Produce",
  meat: "Meat",
  dairy: "Dairy",
  dry_goods: "Dry Goods",
  beverage: "Beverage",
  other: "Other",
}

function getStockLevel(item: InventoryItem): { variant: "success" | "warning" | "destructive"; label: string } {
  if (item.quantity <= 0) return { variant: "destructive", label: "Out" }
  if (item.min_stock_level > 0 && item.quantity < item.min_stock_level) return { variant: "warning", label: "Low" }
  return { variant: "success", label: "OK" }
}

export default function MobileManagerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustQuantity, setAdjustQuantity] = useState("")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = activeCategory !== "all" ? `?category=${activeCategory}` : ""
      const res = await fetch(`/api/inventory/items${params}`)
      if (!res.ok) throw new Error("Failed to fetch inventory items")
      const data = await res.json()
      setItems(data.data ?? data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [activeCategory])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const { refreshing, pullDistance } = usePullToRefresh({ onRefresh: handleRefresh })

  const openDetail = (item: InventoryItem) => {
    setSelectedItem(item)
    setDetailDialogOpen(true)
  }

  const openAdjust = () => {
    setAdjustQuantity("")
    setAdjustDialogOpen(true)
  }

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustQuantity) return
    const qty = Number.parseInt(adjustQuantity, 10)
    if (Number.isNaN(qty)) {
      toast.error("Enter a valid number")
      return
    }
    try {
      const res = await fetch(`/api/inventory/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      })
      if (!res.ok) throw new Error("Failed to adjust stock")
      toast.success("Stock updated")
      setAdjustDialogOpen(false)
      setDetailDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust stock")
    }
  }

  const skeletonCards = Array.from({ length: 5 }).map((_, i) => (
    <Card key={i}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  ))

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
        <p className="text-destructive text-xs">Failed to load inventory</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: Math.min(pullDistance, 60) }}
        >
          <div
            className={`size-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin ${refreshing ? "" : "opacity-0"}`}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="font-heading text-sm font-medium">Inventory</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Track stock levels</p>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <div className="px-4">
          <TabsList className="w-full overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-[11px]">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 px-4 pt-3 pb-20 space-y-2">
          {loading ? (
            <div className="space-y-2">{skeletonCards}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Package className="size-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No inventory items yet</p>
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="size-3.5" />
                Add your first item
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const stock = getStockLevel(item)
              return (
                <DataCard
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.quantity} ${item.unit}`}
                  right={stock.label}
                  variant={stock.variant}
                  badge={
                    <Badge variant="outline" className="text-[10px]">
                      {categoryLabels[item.category] ?? item.category}
                    </Badge>
                  }
                  onClick={() => openDetail(item)}
                />
              )
            })
          )}
        </div>
      </Tabs>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-20 right-4 z-50 size-12 rounded-full shadow-lg"
        onClick={() => setAddDialogOpen(true)}
      >
        <Plus className="size-5" />
      </Button>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSaved={fetchData}
        editingItem={null}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-sm">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{selectedItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span>{categoryLabels[selectedItem.category] ?? selectedItem.category}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{selectedItem.quantity} {selectedItem.unit}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Stock Level</span>
                  <span>{selectedItem.min_stock_level}</span>
                </div>
                {selectedItem.unit_cost != null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Cost</span>
                      <span>PHP {selectedItem.unit_cost.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={getStockLevel(selectedItem).variant === "success" ? "default" : getStockLevel(selectedItem).variant === "warning" ? "outline" : "destructive"} className="text-[10px]">
                    {getStockLevel(selectedItem).label}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={openAdjust}>
                  Adjust Stock
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Current stock: <span className="font-medium text-foreground">{selectedItem.quantity} {selectedItem.unit}</span>
              </p>
              <div>
                <label className="text-muted-foreground mb-1 block">New Quantity</label>
                <Input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="Enter new quantity"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={handleAdjustStock}>
                  Save
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setAdjustDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


