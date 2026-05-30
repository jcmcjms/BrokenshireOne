"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PlusIcon, PencilIcon, TrashIcon, ImageIcon, FolderPlus, ListBullets, Scan, FileArrowDown, DownloadSimple, Barcode } from "@phosphor-icons/react"
import { ImageUploader } from "@/components/ui/image-uploader"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"
import { BulkImportDialog } from "@/components/ui/bulk-import-dialog"
import { cn, formatPrice } from "@/lib/utils"
import { MENU_UNITS, CATEGORY_DEFAULT_UNIT } from "@/lib/units"
import type { MenuItem, MenuCategory } from "@/types"
import { useMobile } from "@/components/mobile/hooks/use-mobile"
import MobileManagerMenuPage from "@/components/mobile/mobile-manager-menu"

export default function ManagerMenuPage() {
  const isMobile = useMobile()
  if (isMobile) return <MobileManagerMenuPage />

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editCatOpen, setEditCatOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [editCatName, setEditCatName] = useState("")
  const [catSaving, setCatSaving] = useState(false)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const emptyForm = { name: "", category_id: "", price: "", description: "", available: true, image_url: "", barcode: "", unit: "", stock_quantity: "" }
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
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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
      description: item.description,
      available: item.available,
      image_url: item.image_url ?? "",
      barcode: item.barcode ?? "",
      unit: item.unit ?? "",
      stock_quantity: String(item.stock_quantity ?? 0),
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
        description: form.description,
        available: form.available,
        image_url: form.image_url || null,
        barcode: form.barcode || null,
        unit: form.unit || "serving",
        stock_quantity: parseInt(form.stock_quantity) || 0,
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

  const handleCategoryChange = (value: string) => {
    const cat = categories.find(c => c.id === value)
    const defaultUnit = CATEGORY_DEFAULT_UNIT[cat?.name ?? ""] ?? "serving"
    setForm(prev => ({
      ...prev,
      category_id: value,
      unit: prev.unit || defaultUnit,
    }))
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setCatSaving(true)
    try {
      const res = await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), sort_order: categories.length + 1 }),
      })
      if (!res.ok) throw new Error("Failed to create category")
      toast.success("Category created")
      setNewCatName("")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category")
    } finally {
      setCatSaving(false)
    }
  }

  const handleRenameCategory = async () => {
    if (!editingCat || !editCatName.trim()) return
    setCatSaving(true)
    try {
      const res = await fetch(`/api/menu/categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCatName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to rename category")
      toast.success("Category renamed")
      setEditCatOpen(false)
      setEditingCat(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename")
    } finally {
      setCatSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Items in it will need reassignment.")) return
    setCatSaving(true)
    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      toast.success("Category deleted")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setCatSaving(false)
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

  const handleExport = async () => {
    try {
      const res = await fetch("/api/menu/export")
      if (!res.ok) throw new Error("Failed to export")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "menu-items.xlsx"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Menu exported successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export")
    }
  }

  const handleBarcodeScanned = (barcode: string) => {
    setForm((prev) => ({ ...prev, barcode }))
    setScannerOpen(false)
  }

  const filteredItems = activeCategory === "all" ? items : items.filter((i) => i.category_id === activeCategory)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load menu</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-sm font-medium">Menu Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Add, edit, and manage menu items</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-1">
            <FileArrowDown className="size-3.5" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1">
            <DownloadSimple className="size-3.5" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCatDialogOpen(true)} className="gap-1">
            <FolderPlus className="size-3.5" />
            Categories
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <PlusIcon className="size-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeCategory} className="mt-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-32 w-full" />
                    <div className="p-3 flex flex-col gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-center h-32 bg-muted">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="size-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-tight">{item.name}</p>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon-xs" onClick={() => openEditDialog(item)}>
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true) }}>
                            <TrashIcon className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-fit">{item.category_name ?? categories.find(c => c.id === item.category_id)?.name}</Badge>
                      {item.barcode && (
                        <Badge variant="secondary" className="w-fit text-[10px] font-mono">
                          <Barcode className="size-2.5 mr-1" />
                          {item.barcode}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{formatPrice(item.price)} / {item.unit}</span>
                        <Badge variant={item.available ? "default" : "secondary"} className="text-[10px]">
                          {item.available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      {/* Stock badge */}
                      {item.stock_quantity > 0 ? (
                        <span className={cn(
                          "text-[10px] flex items-center gap-1",
                          item.stock_quantity <= 5 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          <span className={cn(
                            "inline-block size-1.5 rounded-full",
                            item.stock_quantity <= 5 ? "bg-amber-500" : "bg-green-500"
                          )} />
                          {item.stock_quantity <= 5 ? `Only ${item.stock_quantity} left` : `${item.stock_quantity} left`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-destructive flex items-center gap-1">
                          <span className="inline-block size-1.5 rounded-full bg-destructive" />
                          Out of stock
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredItems.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground text-xs py-8">
                  No items in this category
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the menu item details." : "Fill in the details for the new menu item."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Image</label>
              <ImageUploader
                value={form.image_url || null}
                onChange={(url) => setForm({ ...form, image_url: url || "" })}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Category *</label>
              <Select value={form.category_id} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Price *</label>
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" type="number" step="0.01" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Unit</label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Barcode</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Item barcode (optional)"
                    className="h-8 text-xs pl-7 font-mono"
                  />
                  <Barcode className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                  className="gap-1 shrink-0"
                >
                  <Scan className="size-3.5" />
                  Scan
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Stock Quantity</label>
              <Input
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                placeholder="0"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Available</label>
              <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="size-3.5" />
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

      {/* Categories Management */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>Add, edit, or remove menu categories</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {/* Add new category */}
            <div className="flex items-center gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name..."
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" onClick={handleAddCategory} disabled={!newCatName.trim() || catSaving}>
                <PlusIcon className="size-3.5" />
                Add
              </Button>
            </div>
            <Separator />
            {/* Category list */}
            <div className="flex flex-col gap-1.5 max-h-60 overflow-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-muted/50 text-xs">
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setEditingCat(cat)
                        setEditCatName(cat.name)
                        setEditCatOpen(true)
                      }}
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={catSaving}
                    >
                      <TrashIcon className="size-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Name Dialog */}
      <Dialog open={editCatOpen} onOpenChange={setEditCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Rename &ldquo;{editingCat?.name}&rdquo;</DialogDescription>
          </DialogHeader>
          <Input
            value={editCatName}
            onChange={(e) => setEditCatName(e.target.value)}
            className="h-8 text-xs"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleRenameCategory} disabled={!editCatName.trim() || catSaving}>
              {catSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingItem?.name}&rdquo;? This action cannot be undone.
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

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onScan={handleBarcodeScanned}
        onClose={() => setScannerOpen(false)}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  )
}
