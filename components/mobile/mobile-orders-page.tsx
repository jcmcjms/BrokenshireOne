"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { MobileOrdersList } from "@/components/mobile/mobile-orders-list"
import type { Order } from "@/types"

interface MobileOrdersPageProps {
  fetchUrl: string
  title: string
  subtitle?: string
}

export default function MobileOrdersPage({
  fetchUrl,
  title,
  subtitle,
}: MobileOrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error("Failed to fetch orders")
      const json = await res.json()
      setOrders(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [fetchUrl])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await fetchOrders()
  }, [fetchOrders])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load orders</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-heading text-base font-bold">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-auto">
        <MobileOrdersList
          orders={orders}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
