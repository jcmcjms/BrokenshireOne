"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { MobileDashboardShell } from "@/components/mobile/mobile-dashboard-shell"
import { MobileOrdersList } from "@/components/mobile/mobile-orders-list"
import { ClipboardText, CurrencyDollar, ShoppingCart, Package, WarningCircle, Plus, List, CreditCard, Wallet } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { DashboardStats, Order } from "@/types"

export default function MobileManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dateParam = selectedDate ? `date=${selectedDate}` : ""
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`/api/dashboard/stats?${dateParam}`),
        fetch(`/api/orders?limit=5&${dateParam}`),
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
  }, [selectedDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
        <p className="text-destructive text-xs">Failed to load dashboard</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  const lowStockTotal = stats?.low_stock_items?.total ?? 0

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const statCards = [
    {
      label: `Orders (${dateLabel})`,
      value: stats?.total_orders_today,
      icon: ClipboardText,
      loading,
    },
    {
      label: `Revenue (${dateLabel})`,
      value: stats?.total_revenue_today != null ? `PHP ${formatPrice(stats.total_revenue_today, false)}` : undefined,
      icon: CurrencyDollar,
      loading,
    },
    {
      label: "Active Orders",
      value: stats?.active_orders,
      icon: ShoppingCart,
      loading,
    },
    {
      label: "Low Stock Items",
      value: lowStockTotal,
      icon: Package,
      loading,
    },
  ]

  return (
    <MobileDashboardShell
      title="Manager Dashboard"
      subtitle="Manage menu, orders, credits, and reports"
      stats={statCards}
      onRefresh={handleRefresh}
      headerExtra={
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-8 w-36 rounded-md border border-input bg-background px-2 text-xs"
        />
      }
    >
      {stats?.low_stock_items && stats.low_stock_items.total > 0 && (
        <Alert variant="destructive" className="py-2">
          <WarningCircle className="size-4" />
          <AlertTitle className="text-xs">Low Stock Alert</AlertTitle>
          <AlertDescription className="flex flex-col gap-0.5 text-[10px]">
            <span>
              {stats.low_stock_items.total} item{stats.low_stock_items.total !== 1 ? "s are" : " is"} running low.
            </span>
            <span className="opacity-80">
              {stats.low_stock_items.inventory > 0 && `${stats.low_stock_items.inventory} inventory item${stats.low_stock_items.inventory !== 1 ? "s" : ""}`}
              {stats.low_stock_items.inventory > 0 && stats.low_stock_items.menu_items > 0 && " · "}
              {stats.low_stock_items.menu_items > 0 && `${stats.low_stock_items.menu_items} menu item${stats.low_stock_items.menu_items !== 1 ? "s" : ""}`}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button variant="default" size="sm" asChild className="shrink-0">
          <a href="/dashboard/manager/menu">
            <Plus className="size-4" />
            Add Item
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href="/dashboard/manager/orders">
            <List className="size-4" />
            Orders
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href="/dashboard/manager/credits">
            <CreditCard className="size-4" />
            Credits
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href="/dashboard/manager/inventory">
            <Package className="size-4" />
            Inventory
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href="/dashboard/manager/salary">
            <Wallet className="size-4" />
            Salary
          </a>
        </Button>
      </div>

      <MobileOrdersList
        orders={recentOrders}
        loading={loading}
        onRefresh={handleRefresh}
        maxItems={5}
        emptyMessage="No orders today"
      />
    </MobileDashboardShell>
  )
}
