"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  MagnifyingGlass,
  ForkKnife,
  ShoppingCart,
  Scan,
  CheckCircle,
} from "@phosphor-icons/react"
import { cn, formatPrice } from "@/lib/utils"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"
import { QRCodeSVG } from "qrcode.react"
import { MobileCartSheet } from "./mobile-cart-sheet"
import type { MenuItem, MenuCategory, User, ApiResponse } from "@/types"

interface CartItem extends MenuItem {
  cartQuantity: number
}

/**
 * Mobile-optimized version of the order page.
 * Single-column layout with a bottom sheet cart.
 */
export function MobileOrderPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [placing, setPlacing] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cashGiven, setCashGiven] = useState("")
  const [cartOpen, setCartOpen] = useState(false)

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        const data: ApiResponse<User> = await res.json()
        if (data.success && data.data) {
          setUser(data.data)
          if (!["faculty", "student"].includes(data.data.role)) {
            router.push("/dashboard")
            return
          }
        } else {
          router.push("/login")
          return
        }
      } catch {
        router.push("/login")
        return
      } finally {
        setUserLoading(false)
      }
    }
    fetchUser()
  }, [router])

  // Fetch menu
  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/menu/items"),
        fetch("/api/menu/categories"),
      ])
      if (!itemsRes.ok) throw new Error("Failed to fetch menu")
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

  useEffect(() => {
    if (!userLoading) fetchData()
  }, [userLoading, fetchData])

  // Cart helpers
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id)
      if (existing) {
        return prev.map((ci) =>
          ci.id === item.id ? { ...ci, cartQuantity: ci.cartQuantity + 1 } : ci,
        )
      }
      return [...prev, { ...item, cartQuantity: 1 }]
    })
    setOrderPlaced(false)
  }

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.id === itemId
            ? { ...ci, cartQuantity: Math.max(0, ci.cartQuantity + delta) }
            : ci,
        )
        .filter((ci) => ci.cartQuantity > 0),
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, ci) => sum + ci.price * ci.cartQuantity, 0)
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.cartQuantity, 0)
  const changeAmount = cashGiven ? Math.max(0, parseFloat(cashGiven) - cartTotal) : 0

  const canUseCredit = user?.role === "faculty"

  // Barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false)
    try {
      const res = await fetch(`/api/menu/items?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Item not found for this barcode")
          return
        }
        throw new Error("Failed to look up item")
      }
      const json = await res.json()
      if (json.success && json.data) {
        const item = json.data as MenuItem
        if (!item.available) {
          toast.error("This item is not available")
          return
        }
        addToCart(item)
        toast.success(`Added "${item.name}" to your order`)
      } else {
        toast.error("Item not found")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to scan item")
    }
  }

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty")
      return
    }
    setPlacing(true)
    try {
      const orderItems = cart.map((ci) => ({
        item_id: ci.id,
        quantity: ci.cartQuantity,
        unit_price: ci.price,
      }))

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user!.id,
          items: orderItems,
          total: cartTotal,
          payment_method: paymentMethod,
          cash_given: paymentMethod === 'cash' ? parseFloat(cashGiven) : null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to place order")

      setOrderNumber(json.data?.order_number || "")
      setOrderPlaced(true)
      setCart([])
      setCartOpen(false)
      toast.success("Order placed successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setPlacing(false)
    }
  }

  const startNewOrder = () => {
    setOrderPlaced(false)
    setOrderNumber("")
    setPaymentMethod("cash")
    setCashGiven("")
  }

  // Filtering
  const searched = search
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : items

  const filteredItems =
    activeCategory === "all"
      ? searched
      : searched.filter((i) => i.category_id === activeCategory)

  const availableItems = filteredItems.filter((i) => i.available)

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ForkKnife className="size-8 text-muted-foreground animate-pulse" />
          <p className="text-xs text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load menu</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </div>
    )
  }

  // Success screen
  if (orderPlaced) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <CheckCircle className="size-12 text-emerald-500" />
        <h2 className="font-heading text-sm font-medium">Order Placed!</h2>
        <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>

        {paymentMethod === 'cash' && orderNumber && (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={orderNumber} size={180} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Please show this QR code to the staff at the counter for payment confirmation.
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={startNewOrder}>Place Another Order</Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <MagnifyingGlass className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-9 text-xs"
          />
        </div>
      </div>

      {/* Categories & Items */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <div className="px-4">
          <TabsList variant="line" className="overflow-x-auto w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeCategory} className="flex-1 mt-3 px-4">
          <ScrollArea className="h-full pb-4">
            <div className="grid grid-cols-2 gap-3">
              {user?.role && (
                <div className="col-span-2 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{availableItems.length} items</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setScannerOpen(true)}>
                    <Scan className="size-3" />
                    <span className="text-[10px]">Scan</span>
                  </Button>
                </div>
              )}
              {availableItems.map((item) => {
                const inCart = cart.find((ci) => ci.id === item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="text-left"
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:bg-accent h-full",
                        inCart && "ring-1 ring-primary",
                      )}
                    >
                      <CardContent className="p-2.5 flex flex-col gap-1">
                        {item.image_url ? (
                          <div className="h-16 -mx-2.5 -mt-2.5 mb-1 overflow-hidden">
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-16 -mx-2.5 -mt-2.5 mb-1 flex items-center justify-center bg-muted">
                            <ForkKnife className="size-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <p className="text-xs font-medium leading-tight">{item.name}</p>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-xs font-heading font-medium">
                            {formatPrice(item.price)} / {item.unit}
                          </span>
                          {inCart && (
                            <Badge variant="default" className="text-[10px]">
                              {inCart.cartQuantity}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
              {availableItems.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground text-xs py-8">
                  {search
                    ? "No items match your search"
                    : "No items available in this category"}
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Floating cart FAB */}
      <div className="fixed right-4 bottom-20 z-30">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="size-6" weight="fill" />
          {cartItemCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {cartItemCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Cart bottom sheet */}
      <MobileCartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        cartTotal={cartTotal}
        cartItemCount={cartItemCount}
        onUpdateQty={updateQty}
        onRemove={removeFromCart}
        onClear={() => setCart([])}
        onPlaceOrder={placeOrder}
        placing={placing}
        user={user ?? undefined}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        cashGiven={cashGiven}
        onCashGivenChange={setCashGiven}
        changeAmount={changeAmount}
        canUseCredit={canUseCredit}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  )
}
