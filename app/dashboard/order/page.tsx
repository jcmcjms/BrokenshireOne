"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  MagnifyingGlass,
  Plus,
  Minus,
  Trash,
  CheckCircle,
  ShoppingCart,
  ForkKnife,
  Scan,
} from "@phosphor-icons/react"
import { cn, formatPrice } from "@/lib/utils"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"
import { QRCodeSVG } from "qrcode.react"
import type { MenuItem, MenuCategory, User, ApiResponse } from "@/types"

interface CartItem extends MenuItem {
  cartQuantity: number
}

export default function OrderPage() {
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

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        const data: ApiResponse<User> = await res.json()
        if (data.success && data.data) {
          setUser(data.data)
          // Only faculty and students can use this page
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
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
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
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <CheckCircle className="size-12 text-emerald-500" />
        <h2 className="font-heading text-sm font-medium">Order Placed!</h2>
        <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>

        {/* QR Code for cash orders */}
        {paymentMethod === 'cash' && orderNumber && (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={orderNumber} size={160} level="M" />
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
    <div className="flex h-[calc(100vh-3rem)] gap-4 p-4">
      {/* Left: Menu Items */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-sm font-medium">Place Order</h1>
            <p className="text-xs text-muted-foreground">
              Browse the menu and add items to your cart
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)} className="gap-1">
              <Scan className="size-3.5" />
              Scan Item
            </Button>
            <Badge variant="secondary" className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Categories & Items */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList variant="line" className="overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4 flex-1">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pr-4">
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
                        <CardContent className="p-3 flex flex-col gap-1.5">
                          {/* Image */}
                          {item.image_url ? (
                            <div className="h-20 -mx-3 -mt-3 mb-1 overflow-hidden">
                              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-20 -mx-3 -mt-3 mb-1 flex items-center justify-center bg-muted">
                              <ForkKnife className="size-6 text-muted-foreground/40" />
                            </div>
                          )}
                          <p className="text-xs font-medium leading-tight">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {item.stock_quantity > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.stock_quantity} left
                            </span>
                          )}
                          <div className="mt-auto flex items-center justify-between">
                            <span className="text-sm font-heading font-medium">
                              {formatPrice(item.price)} / {item.unit}
                            </span>
                            {inCart && (
                              <Badge variant="default" className="text-[10px]">
                                {inCart.cartQuantity} in cart
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
      </div>

      {/* Right: Cart Sidebar */}
      <div className="w-80 shrink-0 flex flex-col border-l pl-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium flex items-center gap-1.5">
            <ShoppingCart className="size-3.5" />
            Your Order
          </h2>
          <Badge variant="outline">
            {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted text-xs">
            <div className="flex-1 truncate">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <Separator className="mb-3" />

        {/* Cart items */}
        <ScrollArea className="flex-1 -mr-2 pr-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ShoppingCart className="size-6 mb-2 opacity-40" />
              <p className="text-xs">Cart is empty</p>
              <p className="text-[10px]">Tap items from the menu</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map((ci) => (
                <div key={ci.id} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ci.name}</p>
                    <p className="text-muted-foreground">
                      {formatPrice(ci.price * ci.cartQuantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQty(ci.id, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-5 text-center text-xs font-medium">
                      {ci.cartQuantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQty(ci.id, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFromCart(ci.id)}
                  >
                    <Trash className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator className="mt-3 mb-3" />

        {/* Total */}
        <div className="flex items-center justify-between text-xs font-medium mb-3">
          <span>Total</span>
          <span className="font-heading text-sm">{formatPrice(cartTotal)}</span>
        </div>

        {/* Payment method */}
        <div className="mb-3">
          <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); if (v !== 'cash') setCashGiven("") }}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              {canUseCredit && (
                <SelectItem value="credit">Credit</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {canUseCredit && paymentMethod === "credit" && user && (
          <Alert className="mb-3 py-2">
            <AlertDescription className="text-xs">
              Credit limit: {formatPrice((user as any).monthly_credit_limit)}
            </AlertDescription>
          </Alert>
        )}

        {/* Cash input */}
        {paymentMethod === 'cash' && cart.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Cash Given</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter cash amount"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {cashGiven && parseFloat(cashGiven) >= cartTotal && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Change</span>
                <span className="font-heading font-medium text-emerald-600 dark:text-emerald-400">
                  {formatPrice(changeAmount)}
                </span>
              </div>
            )}
            {cashGiven && parseFloat(cashGiven) < cartTotal && (
              <p className="text-[10px] text-destructive">
                Insufficient cash. Need at least {formatPrice(cartTotal)}
              </p>
            )}
          </div>
        )}

        {/* Place order button */}
        <Button
          className="w-full"
          size="sm"
          onClick={placeOrder}
          disabled={placing || cart.length === 0 || (paymentMethod === 'cash' && (!cashGiven || parseFloat(cashGiven) < cartTotal))}
        >
          {placing ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent mr-1" />
              Placing Order...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  )
}
