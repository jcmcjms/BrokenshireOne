"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { MobileDashboardShell } from "./mobile-dashboard-shell"
import { MobileOrdersList } from "./mobile-orders-list"
import { cn, formatPrice } from "@/lib/utils"
import { ClipboardTextIcon, CurrencyDollarIcon, CreditCardIcon } from "@phosphor-icons/react"
import type { Order, CreditAllowance } from "@/types"

export default function MobileFacultyDashboard() {
  const [credit, setCredit] = useState<CreditAllowance | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [creditRes, ordersRes] = await Promise.all([
        fetch("/api/credits?current=true"),
        fetch("/api/orders?mine=true&limit=5"),
      ])
      if (!creditRes.ok) throw new Error("Failed to fetch credit data")
      if (!ordersRes.ok) throw new Error("Failed to fetch orders")
      const creditData = await creditRes.json()
      const ordersData = await ordersRes.json()
      const allowance = Array.isArray(creditData.data) ? creditData.data[0] : (creditData.data ?? creditData)
      setCredit(allowance ?? null)
      setOrders(ordersData.data ?? ordersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const creditUsed = credit ? credit.used_amount : 0
  const creditLimit = credit ? credit.limit_amount : 0
  const creditRemaining = credit ? credit.remaining : 0
  const creditPercent = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0
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
      title="Faculty Dashboard"
      subtitle="Your canteen account overview"
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[10px] flex items-center gap-1">
              <CreditCardIcon className="size-3.5 text-muted-foreground" />
              Monthly Credit Allowance
            </CardTitle>
            {credit && (
              <span className="text-[10px] text-muted-foreground">
                {new Date().toLocaleString("default", { month: "long" })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-32" />
            </div>
          ) : credit ? (
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Limit: {formatPrice(creditLimit)}</span>
                <span className="text-muted-foreground">Used: {formatPrice(creditUsed)}</span>
                <span className="font-medium">Remaining: {formatPrice(creditRemaining)}</span>
              </div>
              <div className="h-1.5 w-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    creditPercent > 80 ? "bg-destructive" : creditPercent > 50 ? "bg-primary" : "bg-primary/60"
                  )}
                  style={{ width: `${Math.min(creditPercent, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">No credit allowance set for this month</p>
          )}
        </CardContent>
      </Card>

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
