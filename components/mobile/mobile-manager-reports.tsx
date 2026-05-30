"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyDollar, ClipboardText, ShoppingCart } from "@phosphor-icons/react"
import { MobileDashboardShell } from "@/components/mobile/mobile-dashboard-shell"
import { formatPrice } from "@/lib/utils"
import type { DashboardStats } from "@/types"

export default function MobileManagerReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const dateParam = selectedDate ? `date=${selectedDate}` : ""
      const res = await fetch(`/api/dashboard/stats?${dateParam}`)
      if (!res.ok) throw new Error("Failed to fetch stats")
      const json = await res.json()
      setStats(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" })

  const statsData = [
    {
      label: "Total Revenue",
      value: stats?.total_revenue_today != null ? `PHP ${formatPrice(stats.total_revenue_today, false)}` : undefined,
      icon: CurrencyDollar,
      loading,
    },
    {
      label: "Total Orders",
      value: stats?.total_orders_today,
      icon: ClipboardText,
      loading,
    },
    {
      label: "Avg Order Value",
      value:
        stats?.total_orders_today && stats?.total_revenue_today
          ? `PHP ${formatPrice(stats.total_revenue_today / stats.total_orders_today, false)}`
          : "PHP 0.00",
      icon: ShoppingCart,
      loading,
    },
  ]

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load reports</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <MobileDashboardShell
      title="Reports"
      subtitle={`Summary and analytics for ${currentMonth}`}
      stats={statsData}
      onRefresh={fetchData}
      headerExtra={
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-fit text-xs h-8"
        />
      }
    />
  )
}
