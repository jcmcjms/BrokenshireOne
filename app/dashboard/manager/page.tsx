"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { ClipboardTextIcon, CurrencyDollarIcon, ShoppingCartIcon, PackageIcon, PlusIcon, ListIcon, CreditCardIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { DashboardStats, Order } from "@/types"

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/orders?limit=5"),
        ])
        if (!statsRes.ok) throw new Error("Failed to fetch stats")
        if (!ordersRes.ok) throw new Error("Failed to fetch orders")
        const statsData = await statsRes.json()
        const ordersData = await ordersRes.json()
        setStats(statsData.data ?? statsData)
        setRecentOrders(ordersData.data ?? ordersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load dashboard</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const lowStockTotal = stats?.low_stock_items && typeof stats.low_stock_items === 'object'
    ? (stats.low_stock_items as any).total ?? 0
    : 0;

  const statCards = [
    { label: "Today's Orders", value: stats?.total_orders_today, icon: ClipboardTextIcon },
    { label: "Today's Revenue", value: stats?.total_revenue_today != null ? formatPrice(stats.total_revenue_today, false) : undefined, icon: CurrencyDollarIcon, prefix: "PHP " },
    { label: "Active Orders", value: stats?.active_orders, icon: ShoppingCartIcon },
    { label: "Low Stock Items", value: lowStockTotal, icon: PackageIcon },
  ]

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
    pending: "secondary",
    completed: "default",
    cancelled: "destructive",
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Manager Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage menu, orders, credits, and reports</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{stat.label}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="font-heading text-lg font-medium">
                  {stat.prefix}{stat.value ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {typeof stats?.low_stock_items === 'object' && stats?.low_stock_items != null && (stats.low_stock_items as any).total > 0 && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" />
          <AlertTitle>Low Stock Alert</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>
              {(stats.low_stock_items as any).total} item{(stats.low_stock_items as any).total !== 1 ? "s are" : " is"} running low.
            </span>
            <span className="text-xs opacity-80">
              {(stats.low_stock_items as any).inventory > 0 && `${(stats.low_stock_items as any).inventory} inventory item${(stats.low_stock_items as any).inventory !== 1 ? 's' : ''}`}
              {(stats.low_stock_items as any).inventory > 0 && (stats.low_stock_items as any).menu_items > 0 && ' · '}
              {(stats.low_stock_items as any).menu_items > 0 && `${(stats.low_stock_items as any).menu_items} menu item${(stats.low_stock_items as any).menu_items !== 1 ? 's' : ''}`}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="default" size="sm" asChild>
          <a href="/dashboard/manager/menu">
            <PlusIcon className="size-4" />
            Add Menu Item
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/manager/orders">
            <ListIcon className="size-4" />
            View Orders
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/manager/credits">
            <CreditCardIcon className="size-4" />
            Manage Credit Limits
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/manager/inventory">
            <PackageIcon className="size-4" />
            Inventory
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.user_name ?? "—"}</TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell className="capitalize">{order.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && recentOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No orders today
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
