"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { CurrencyDollarIcon, ClipboardTextIcon, ShoppingCartIcon, ChartBarIcon } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { DashboardStats } from "@/types"
import { useMobile } from "@/components/mobile/hooks/use-mobile"
import MobileManagerReportsPage from "@/components/mobile/mobile-manager-reports"

export default function ManagerReportsPage() {
  const isMobile = useMobile()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  useEffect(() => {
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
    fetchData()
  }, [selectedDate])

  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" })
  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  const summaryCards = [
    {
      title: "Total Revenue",
      value: stats?.total_revenue_today != null ? formatPrice(stats.total_revenue_today, false) : undefined,
      prefix: "PHP ",
      subtitle: dateLabel,
      icon: CurrencyDollarIcon,
    },
    {
      title: "Total Orders",
      value: stats?.total_orders_today,
      subtitle: dateLabel,
      icon: ClipboardTextIcon,
    },
    {
      title: "Avg Order Value",
      value: stats?.total_orders_today && stats?.total_revenue_today
        ? formatPrice(stats.total_revenue_today / stats.total_orders_today, false)
        : "0.00",
      prefix: "PHP ",
      subtitle: dateLabel,
      icon: ShoppingCartIcon,
    },
  ]

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load reports</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (isMobile) return <MobileManagerReportsPage />

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-sm font-medium">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Summary and analytics for {currentMonth}</p>
        </div>
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{card.title}</CardTitle>
                <card.icon className="size-4 text-muted-foreground" />
              </div>
              <CardDescription>{card.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="font-heading text-lg font-medium">
                  {card.prefix}{card.value ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <ChartBarIcon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>Chart coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 bg-muted/50 text-muted-foreground text-xs">
              Revenue chart will be displayed here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders by Category</CardTitle>
              <ChartBarIcon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>Chart coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 bg-muted/50 text-muted-foreground text-xs">
              Category breakdown chart will be displayed here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
