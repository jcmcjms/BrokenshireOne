"use client"

import { useEffect, useState, useCallback } from "react"
import { MobileDashboardShell } from "@/components/mobile/mobile-dashboard-shell"
import { MobileOrdersList } from "@/components/mobile/mobile-orders-list"
import { Users, ClipboardText, CurrencyDollar, ShoppingCart } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { DashboardStats, Order } from "@/types"

async function fetchDashboardData() {
  const [statsRes, ordersRes] = await Promise.all([
    fetch("/api/dashboard/stats"),
    fetch("/api/orders?limit=5"),
  ])
  if (!statsRes.ok) throw new Error("Failed to fetch stats")
  if (!ordersRes.ok) throw new Error("Failed to fetch orders")
  const statsData = await statsRes.json()
  const ordersData = await ordersRes.json()
  return {
    stats: (statsData.data ?? statsData) as DashboardStats,
    orders: (ordersData.data ?? ordersData) as Order[],
  }
}

export default function MobileAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchDashboardData()
      setStats(data.stats)
      setRecentOrders(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await loadData()
  }, [loadData])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
        <p className="text-destructive text-xs">Failed to load dashboard data</p>
        <p className="text-muted-foreground text-xs text-center">{error}</p>
        <button
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.total_users,
      icon: Users,
      loading,
    },
    {
      label: "Today's Orders",
      value: stats?.total_orders_today,
      icon: ClipboardText,
      loading,
    },
    {
      label: "Today's Revenue",
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
  ]

  return (
    <MobileDashboardShell
      title="Admin Dashboard"
      subtitle="Overview of the canteen management system"
      stats={statCards}
      onRefresh={handleRefresh}
    >
      <MobileOrdersList
        orders={recentOrders}
        loading={loading}
        onRefresh={handleRefresh}
      />
    </MobileDashboardShell>
  )
}
