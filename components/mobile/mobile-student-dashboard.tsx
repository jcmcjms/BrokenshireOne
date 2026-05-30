"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { MobileDashboardShell } from "./mobile-dashboard-shell"
import { MobileOrdersList } from "./mobile-orders-list"
import { ClipboardTextIcon, CurrencyDollarIcon } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { Order } from "@/types"

export default function MobileStudentDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/orders?mine=true&limit=5")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const json = await res.json()
      setOrders(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const monthlySpent = orders.reduce((sum, o) => sum + o.total, 0)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load dashboard</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <MobileDashboardShell
      title="Student Dashboard"
      subtitle="Your canteen activity overview"
      onRefresh={fetchData}
      stats={[
        {
          label: "Orders This Month",
          value: loading ? undefined : orders.length,
          icon: ClipboardTextIcon,
          loading,
        },
        {
          label: "Total Spent",
          value: loading ? undefined : formatPrice(monthlySpent),
          icon: CurrencyDollarIcon,
          loading,
        },
      ]}
    >
      <div>
        <p className="text-xs font-medium mb-2 text-muted-foreground">Recent Orders</p>
        <MobileOrdersList
          orders={orders}
          loading={loading}
          onRefresh={fetchData}
          maxItems={5}
        />
      </div>
    </MobileDashboardShell>
  )
}
