"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ListIcon } from "@phosphor-icons/react"
import type { Order } from "@/types"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
  pending: "secondary",
  completed: "default",
  cancelled: "destructive",
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const json = await res.json()
      setOrders(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

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
      toast.success("Order completed")
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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Orders</h1>
        <p className="text-xs text-muted-foreground mt-0.5">View and manage recent orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <ListIcon className="size-4 inline mr-1" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-14" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.user_name ?? "—"}</TableCell>
                      <TableCell>{order.items?.length ?? "—"}</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{order.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openDetail(order)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              {selectedOrder ? new Date(selectedOrder.created_at).toLocaleString() : ""}
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
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Items</p>
                <div className="flex flex-col gap-1.5">
                  {(selectedOrder.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span><span className="text-muted-foreground mr-1">{item.quantity}x</span>{item.item_name ?? "Item"}</span>
                      <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
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
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
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
