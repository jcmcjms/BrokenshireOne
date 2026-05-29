"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn, formatPrice } from "@/lib/utils"
import { UserIcon, ClipboardTextIcon, CurrencyDollarIcon, CreditCardIcon, ClockIcon } from "@phosphor-icons/react"
import type { Order, CreditAllowance } from "@/types"

export default function FacultyDashboardPage() {
  const [credit, setCredit] = useState<CreditAllowance | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
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
    }
    fetchData()
  }, [])

  const creditUsed = credit ? credit.used_amount : 0
  const creditLimit = credit ? credit.limit_amount : 0
  const creditRemaining = credit ? credit.remaining : 0
  const creditPercent = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0

  const monthlySpent = orders.reduce((sum, o) => sum + o.total, 0)

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
    pending: "secondary",
    completed: "default",
    cancelled: "destructive",
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load dashboard</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Faculty Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your canteen account overview</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            <div>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Faculty Member</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders This Month</CardTitle>
              <ClipboardTextIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="font-heading text-lg font-medium">{orders.length}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Total Spent</CardTitle>
              <CurrencyDollarIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-heading text-lg font-medium">{formatPrice(monthlySpent)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <CreditCardIcon className="size-4 inline mr-1" />
              Monthly Credit Allowance
            </CardTitle>
            {credit && (
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleString("default", { month: "long" })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : credit ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Limit: {formatPrice(creditLimit)}</span>
                <span className="text-muted-foreground">Used: {formatPrice(creditUsed)}</span>
                <span className="font-medium">Remaining: {formatPrice(creditRemaining)}</span>
              </div>
              <div className="h-2 w-full bg-muted overflow-hidden">
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
            <p className="text-xs text-muted-foreground">No credit allowance set for this month</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <ClockIcon className="size-4 inline mr-1" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-14" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.items?.length ?? "—"}</TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No orders yet
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
