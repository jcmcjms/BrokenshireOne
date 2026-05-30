"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PlusIcon, PencilIcon, TrashIcon, PackageIcon, ClipboardTextIcon } from "@phosphor-icons/react"
import AddItemDialog from "@/components/inventory/add-item-dialog"
import AdjustStockDialog from "@/components/inventory/adjust-stock-dialog"
import ItemDetailSheet from "@/components/inventory/item-detail-sheet"
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

export default function ManagerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)

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

  const openAddDialog = () => {
    setEditingItem(null)
    setAddDialogOpen(true)
  }

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item)
    setAddDialogOpen(true)
  }

  const openAdjustDialog = (item: InventoryItem) => {
    setAdjustItem(item)
    setAdjustDialogOpen(true)
  }

  const openDetailSheet = (item: InventoryItem) => {
    setDetailItem(item)
    setDetailSheetOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return
    try {
      const res = await fetch(`/api/inventory/items/${deletingItem.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete item")
      toast.success("Item deleted")
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load inventory</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-sm font-medium">Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track raw ingredients, supplies, and menu item stock levels</p>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <PlusIcon className="size-4" />
          Add Item
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList variant="line">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <PackageIcon className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No inventory items yet</p>
                <Button variant="outline" size="sm" onClick={openAddDialog}>
                  <PlusIcon className="size-3.5" />
                  Add your first item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isLowStock = item.min_stock_level > 0 && item.quantity < item.min_stock_level
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <button
                              onClick={() => openDetailSheet(item)}
                              className="text-xs font-medium hover:underline text-left cursor-pointer"
                            >
                              {item.name}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {categoryLabels[item.category] ?? item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-xs">{item.min_stock_level}</TableCell>
                          <TableCell>
                            <Badge variant={isLowStock ? "destructive" : "default"} className="text-[10px]">
                              {isLowStock ? "Low Stock" : "OK"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEditDialog(item)}
                                title="Edit item"
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openAdjustDialog(item)}
                                title="Adjust stock"
                              >
                                <ClipboardTextIcon className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true) }}
                                title="Delete item"
                              >
                                <TrashIcon className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        editingItem={editingItem}
        onSaved={fetchData}
      />

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        item={adjustItem}
        onSaved={fetchData}
      />

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        item={detailItem}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
