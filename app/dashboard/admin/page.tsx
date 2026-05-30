"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { UsersIcon, ClipboardTextIcon, CurrencyDollarIcon, ShoppingCartIcon, GearIcon, UserListIcon } from "@phosphor-icons/react"
import { cn, formatPrice } from "@/lib/utils"
import type { DashboardStats, Order } from "@/types"
import { useMobile } from "@/components/mobile/hooks/use-mobile"
import MobileAdminDashboard from "@/components/mobile/mobile-admin-dashboard"

export default function AdminDashboardPage() {
  const isMobile = useMobile()
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
        <p className="text-destructive text-xs">Failed to load dashboard data</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const statCards = [
    { label: "Total Users", value: stats?.total_users, icon: UsersIcon },
    { label: "Today's Orders", value: stats?.total_orders_today, icon: ClipboardTextIcon },
    { label: "Today's Revenue", value: stats?.total_revenue_today != null ? formatPrice(stats.total_revenue_today, false) : undefined, icon: CurrencyDollarIcon, prefix: "PHP " },
    { label: "Active Orders", value: stats?.active_orders, icon: ShoppingCartIcon },
  ]

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
    pending: "secondary",
    completed: "default",
    cancelled: "destructive",
  }

  if (isMobile) return <MobileAdminDashboard />

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Admin Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Overview of the canteen management system</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <div className="flex gap-2">
        <Button variant="default" size="sm" asChild>
          <a href="/dashboard/admin/users">
            <UserListIcon className="size-4" />
            Manage Users
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/admin/settings">
            <GearIcon className="size-4" />
            System Settings
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
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
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && recentOrders.length === 0 && (
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
