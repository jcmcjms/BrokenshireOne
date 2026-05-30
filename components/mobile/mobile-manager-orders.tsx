"use client"
import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CalendarBlank, Clock } from "@phosphor-icons/react"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import { formatPrice } from "@/lib/utils"
import type { Order } from "@/types"

const statuses = ["all", "pending", "completed", "cancelled"] as const
type StatusFilter = (typeof statuses)[number]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  completed: "default",
  cancelled: "destructive",
}

const cardVariant: Record<string, "default" | "destructive" | "success" | "warning"> = {
  pending: "warning",
  completed: "success",
  cancelled: "destructive",
}

export default function MobileManagerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusFilter>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dateParam = selectedDate ? `date=${selectedDate}` : ""
      const res = await fetch(`/api/orders?${dateParam}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      const json = await res.json()
      setOrders(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchOrders,
  })

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab)

  const openDetail = (order: Order) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const markCompleted = async () => {
    if (!selectedOrder) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      if (!res.ok) throw new Error("Failed to update order")
      toast.success("Order marked as completed")
      setDetailOpen(false)
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setUpdating(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load orders</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchOrders}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-8">
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground transition-all"
          style={{ height: Math.min(pullDistance, 40) }}
        >
          {refreshing ? "Refreshing..." : "Pull to refresh"}
        </div>
      )}
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <span className="text-xs text-muted-foreground">Refreshing...</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <CalendarBlank className="size-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList className="w-full">
          {statuses.map((s) => (
            <TabsTrigger key={s} value={s} className="flex-1 text-xs capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          : filtered.map((order) => (
              <DataCard
                key={order.id}
                title={order.order_number}
                subtitle={order.user_name ?? "Walk-in"}
                right={formatPrice(order.total)}
                badge={<Badge variant={statusVariant[order.status]} className="text-[10px] px-1.5 py-0">{order.status}</Badge>}
                variant={cardVariant[order.status]}
                topLeft={
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                }
                onClick={() => openDetail(order)}
              />
            ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No orders found</p>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder ? new Date(selectedOrder.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium">{selectedOrder.user_name ?? "Walk-in"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>
                  <p className="font-medium capitalize">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={statusVariant[selectedOrder.status]} className="mt-0.5">{selectedOrder.status}</Badge>
                </div>
                {selectedOrder.staff_name && (
                  <div>
                    <span className="text-muted-foreground">Staff:</span>
                    <p className="font-medium">{selectedOrder.staff_name}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Items</p>
                <div className="flex flex-col gap-1.5">
                  {(selectedOrder.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span>
                        <span className="text-muted-foreground mr-1">{item.quantity}x</span>
                        {item.item_name ?? "Item"}
                      </span>
                      <span>{formatPrice(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <p className="text-xs text-muted-foreground">No item details</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-xs font-medium">
                <span>Total</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>

              {selectedOrder.notes && (
                <div className="text-xs text-muted-foreground">
                  <span>Notes: </span>{selectedOrder.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
            {selectedOrder?.status === "pending" && (
              <Button size="sm" onClick={markCompleted} disabled={updating}>
                {updating ? "Updating..." : "Mark Completed"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
