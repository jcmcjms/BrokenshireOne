"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn, formatPrice } from "@/lib/utils"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"
import { Scan, Clock, CheckCircle, X, Plus, Minus, Trash, UserCircle, ShoppingCart, MagnifyingGlass } from "@phosphor-icons/react"
import { MobileCartSheet } from "./mobile-cart-sheet"
import type { MenuItem, MenuCategory, User, Order } from "@/types"

interface CartItem extends MenuItem {
  cartQuantity: number
}

/**
 * Mobile-optimized staff counter page.
 * Single column layout + bottom sheet cart + pending orders as data cards.
 */
export function MobileStaffPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState<User[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null)
  const [searching, setSearching] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [placing, setPlacing] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<any>(null)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [activePageTab, setActivePageTab] = useState("menu")

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

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (customerQuery.length < 2) { setCustomerResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(customerQuery)}`)
        if (res.ok) {
          const json = await res.json()
          setCustomerResults(json.data ?? json)
        }
      } catch {} finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerQuery])

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id)
      if (existing) {
        return prev.map((ci) =>
          ci.id === item.id ? { ...ci, cartQuantity: ci.cartQuantity + 1 } : ci
        )
      }
      return [...prev, { ...item, cartQuantity: 1 }]
    })
    setOrderPlaced(false)
  }

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => (ci.id === itemId ? { ...ci, cartQuantity: Math.max(0, ci.cartQuantity + delta) } : ci))
        .filter((ci) => ci.cartQuantity > 0)
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, ci) => sum + ci.price * ci.cartQuantity, 0)
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.cartQuantity, 0)
  const filteredItems = activeCategory === "all" ? items : items.filter((i) => i.category_id === activeCategory)
  const availableItems = filteredItems.filter((i) => i.available)
  const canUseCredit = selectedCustomer && (selectedCustomer.role === "faculty" || selectedCustomer.role === "staff")

  const placeOrder = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return }
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
          user_id: selectedCustomer?.id ?? null,
          items: orderItems,
          total: cartTotal,
          payment_method: paymentMethod,
        }),
      })
      if (!res.ok) throw new Error("Failed to place order")
      toast.success("Order placed successfully!")
      setOrderPlaced(true)
      setCart([])
      setCartOpen(false)
      setSelectedCustomer(null)
      setCustomerQuery("")
      setPaymentMethod("cash")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setPlacing(false)
    }
  }

  const clearOrder = () => {
    setCart([])
    setSelectedCustomer(null)
    setCustomerQuery("")
    setPaymentMethod("cash")
    setOrderPlaced(false)
  }

  // Pending orders
  const fetchPendingOrders = async () => {
    setPendingLoading(true)
    try {
      const res = await fetch("/api/orders?status=pending")
      if (res.ok) {
        const json = await res.json()
        setPendingOrders(json.data ?? [])
      }
    } catch {} finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    if (activePageTab === "pending") fetchPendingOrders()
  }, [activePageTab])

  const handleConfirmCash = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      })
      if (res.ok) {
        toast.success("Payment confirmed!")
        setSelectedPendingOrder(null)
        fetchPendingOrders()
      } else {
        const json = await res.json()
        toast.error(json.error || "Failed to confirm payment")
      }
    } catch {
      toast.error("Failed to confirm payment")
    }
  }

  const handleDeclineCash = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      })
      if (res.ok) {
        toast.success("Order declined")
        setSelectedPendingOrder(null)
        fetchPendingOrders()
      } else {
        const json = await res.json()
        toast.error(json.error || "Failed to decline order")
      }
    } catch {
      toast.error("Failed to decline order")
    }
  }

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    return `${hours}h ${mins % 60}m ago`
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load menu</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <CheckCircle className="size-12 text-green-500" />
        <p className="font-heading text-sm font-medium">Order Placed Successfully</p>
        <p className="text-xs text-muted-foreground">The order has been sent to the kitchen.</p>
        <Button size="sm" onClick={clearOrder}>New Order</Button>
      </div>
    )
  }

  return (
    <Tabs value={activePageTab} onValueChange={setActivePageTab} className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="px-4 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="menu" className="flex-1">Counter</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Pending Orders</TabsTrigger>
        </TabsList>
      </div>

      {/* Menu tab */}
      <TabsContent value="menu" className="flex-1 flex flex-col m-0">
        {/* Categories */}
        <div className="px-4 pt-3">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList variant="line" className="overflow-x-auto w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Items grid */}
        <div className="flex-1 px-4 pt-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-full pb-20">
              <div className="grid grid-cols-2 gap-3">
                {availableItems.map((item) => (
                  <button key={item.id} onClick={() => addToCart(item)} className="text-left">
                    <Card className={cn(
                      "cursor-pointer transition-colors hover:bg-accent h-full",
                      cart.find((ci) => ci.id === item.id) && "ring-1 ring-primary"
                    )}>
                      <CardContent className="p-2.5 flex flex-col gap-1">
                        <p className="text-xs font-medium leading-tight">{item.name}</p>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                        )}
                        <p className="text-sm font-heading font-medium mt-auto">{formatPrice(item.price)}</p>
                        {cart.find((ci) => ci.id === item.id) && (
                          <Badge variant="default" className="w-fit text-[10px]">
                            {cart.find((ci) => ci.id === item.id)!.cartQuantity} in cart
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}
                {availableItems.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground text-xs py-8">
                    No items available in this category
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Cart FAB */}
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

        {/* Cart bottom sheet with customer search */}
        <MobileCartSheet
          open={cartOpen}
          onOpenChange={setCartOpen}
          cart={cart}
          cartTotal={cartTotal}
          cartItemCount={cartItemCount}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onClear={clearOrder}
          onPlaceOrder={placeOrder}
          placing={placing}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          cashGiven=""
          onCashGivenChange={() => {}}
          changeAmount={0}
          canUseCredit={!!canUseCredit}
          extra={
            <div className="relative mb-2">
              <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search customer..."
                className="pl-7 h-8 text-xs"
              />
              {(customerResults.length > 0 || searching) && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border shadow-md max-h-32 overflow-auto">
                  {searching ? (
                    <p className="p-2 text-xs text-muted-foreground">Searching...</p>
                  ) : (
                    customerResults.map((u) => (
                      <button
                        key={u.id}
                        className="w-full text-left p-2 text-xs hover:bg-accent transition-colors"
                        onClick={() => {
                          setSelectedCustomer(u)
                          setCustomerQuery(u.name)
                          setCustomerResults([])
                        }}
                      >
                        <span className="font-medium">{u.name}</span>
                        <Badge variant="outline" className="ml-1 text-[10px]">{u.role}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedCustomer && (
                <div className="flex items-center justify-between mt-2 text-xs bg-muted p-2">
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-muted-foreground capitalize">{selectedCustomer.role}</p>
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => { setSelectedCustomer(null); setCustomerQuery("") }}>
                    <X className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          }
        />
      </TabsContent>

      {/* Pending orders tab */}
      <TabsContent value="pending" className="flex-1 m-0 px-4 pt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            Orders awaiting cash payment confirmation
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={fetchPendingOrders}>
              <Clock className="size-3 mr-1" />
              Refresh
            </Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={() => setQrScannerOpen(true)}>
              <Scan className="size-3 mr-1" />
              Scan QR
            </Button>
          </div>
        </div>

        {pendingLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-muted-foreground">Loading pending orders...</p>
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="size-8 mb-2 opacity-40" />
            <p className="text-xs">No pending orders</p>
            <p className="text-[10px]">Cash orders will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-full pb-20">
            <div className="flex flex-col gap-2">
              {pendingOrders.map((order) => (
                <button key={order.id} onClick={() => setSelectedPendingOrder(order)} className="text-left">
                  <Card className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    selectedPendingOrder?.id === order.id && "ring-2 ring-primary"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-heading text-sm font-bold">#{order.order_number}</span>
                        <Badge variant="outline" className="text-[10px]">{timeSince(order.created_at)}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <UserCircle className="size-3" />
                        <span>{order.user_name || 'Unknown'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground">Total</span>
                          <p className="font-medium">{formatPrice(order.total)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cash</span>
                          <p className="font-medium">{formatPrice(order.cash_given)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Change</span>
                          <p className="font-medium text-emerald-600">{formatPrice(order.change_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      {/* QR Scanner */}
      <BarcodeScanner
        open={qrScannerOpen}
        onScan={(orderNumber) => {
          setQrScannerOpen(false)
          const order = pendingOrders.find((o) => o.order_number === orderNumber)
          if (order) {
            setSelectedPendingOrder(order)
          } else {
            toast.error("Pending order not found")
          }
        }}
        onClose={() => setQrScannerOpen(false)}
      />

      {/* Order detail dialog */}
      <Dialog open={!!selectedPendingOrder} onOpenChange={(open) => { if (!open) setSelectedPendingOrder(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Order #{selectedPendingOrder?.order_number}</DialogTitle>
            <DialogDescription>Review the order details before confirming payment.</DialogDescription>
          </DialogHeader>
          {selectedPendingOrder && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs bg-muted p-3 rounded-lg">
                <div>
                  <p className="font-medium">{selectedPendingOrder.user_name || 'Unknown'}</p>
                </div>
                <Badge variant="secondary">{selectedPendingOrder.payment_method}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">Items</p>
                <div className="flex flex-col gap-1.5">
                  {((selectedPendingOrder as any)?.order_items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.menu_items?.name || item.item_name || 'Item'} x{item.quantity}
                      </span>
                      <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{formatPrice(selectedPendingOrder.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cash Given</span>
                  <span className="font-medium">{formatPrice(selectedPendingOrder.cash_given)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-medium text-emerald-600">{formatPrice(selectedPendingOrder.change_amount)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button className="flex-1" size="sm" onClick={() => handleConfirmCash(selectedPendingOrder.id)}>
                  <CheckCircle className="size-3.5 mr-1" />
                  Confirm Payment
                </Button>
                <Button className="flex-1" variant="destructive" size="sm" onClick={() => handleDeclineCash(selectedPendingOrder.id)}>
                  <X className="size-3.5 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
