"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, MagnifyingGlass, ForkKnife, Pencil, Trash } from "@phosphor-icons/react"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import { formatPrice } from "@/lib/utils"
import type { MenuItem, MenuCategory } from "@/types"

const emptyForm = { name: "", category_id: "", price: "", available: true }

export default function MobileManagerMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/menu/items"),
        fetch("/api/menu/categories"),
      ])
      if (!itemsRes.ok) throw new Error("Failed to fetch menu items")
      if (!catsRes.ok) throw new Error("Failed to fetch categories")
      const itemsData = await itemsRes.json()
      const catsData = await catsRes.json()
      setItems(itemsData.data ?? itemsData)
      setCategories(catsData.data ?? catsData)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => { await fetchData() },
  })

  const openAddDialog = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setItemDialogOpen(true)
  }

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      category_id: item.category_id,
      price: item.price.toString(),
      available: item.available,
    })
    setItemDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.price) {
      toast.error("Please fill in required fields")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category_id: form.category_id,
        price: parseFloat(form.price),
        available: form.available,
      }
      const res = await fetch(editingItem ? `/api/menu/items/${editingItem.id}` : "/api/menu/items", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save item")
      toast.success(editingItem ? "Item updated" : "Item created")
      setItemDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingItem) return
    try {
      const res = await fetch(`/api/menu/items/${deletingItem.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete item")
      toast.success("Item deleted")
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const filteredByTab = activeTab === "all" ? items : items.filter((i) => i.category_id === activeTab)

  const filteredItems = search
    ? filteredByTab.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : filteredByTab

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name ?? "Unknown"

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {pullDistance > 0 && !refreshing && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: Math.min(pullDistance, 50) }}
        >
          <ForkKnife className="size-4 text-muted-foreground" style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
        </div>
      )}

      <div className="flex flex-col gap-3 p-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Category tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full shrink-0">
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Items list */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3.5 w-14" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <DataCard
                key={item.id}
                title={item.name}
                subtitle={
                  item.stock_quantity > 0
                    ? item.stock_quantity <= 5
                      ? `Only ${item.stock_quantity} left`
                      : `${item.stock_quantity} in stock`
                    : "Out of stock"
                }
                right={formatPrice(item.price)}
                badge={
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getCategoryName(item.category_id)}</Badge>
                }
                variant={item.available ? "default" : "warning"}
                onClick={() => openEditDialog(item)}
                swipeActions={[
                  {
                    label: "Edit",
                    icon: Pencil,
                    action: () => openEditDialog(item),
                  },
                  {
                    label: "Delete",
                    icon: Trash,
                    action: () => { setDeletingItem(item); setDeleteDialogOpen(true) },
                    variant: "destructive",
                  },
                ]}
              >
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={item.available ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {item.available ? "Available" : "Unavailable"}
                  </Badge>
                  {item.unit && (
                    <span className="text-[10px] text-muted-foreground">per {item.unit}</span>
                  )}
                </div>
              </DataCard>
            ))}
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ForkKnife className="size-8" />
                <p className="text-xs">No items found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={openAddDialog}
        className="fixed bottom-6 right-6 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="size-5" />
      </button>

      {/* Add/Edit Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the menu item details." : "Fill in the details for the new menu item."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" className="h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Category *</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm({ ...form, category_id: cat.id })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.category_id === cat.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Price *</label>
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" type="number" step="0.01" className="h-9 text-xs" />
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available-toggle"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
                className="size-4"
              />
              <label htmlFor="available-toggle" className="text-xs">Available</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingItem?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
