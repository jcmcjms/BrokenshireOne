"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataCard } from "./data-card"
import { usePullToRefresh } from "./hooks/use-pull-to-refresh"
import { formatPrice } from "@/lib/utils"
import { ClockIcon } from "@phosphor-icons/react"
import type { Order } from "@/types"

interface MobileOrdersListProps {
  orders: Order[]
  loading: boolean
  onRefresh: () => Promise<void>
  onOrderClick?: (order: Order) => void
  emptyMessage?: string
  emptyIcon?: React.ElementType
  maxItems?: number
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
  pending: "secondary",
  completed: "default",
  cancelled: "destructive",
}

/**
 * Mobile-friendly order list with pull-to-refresh and data cards.
 */
export function MobileOrdersList({
  orders,
  loading,
  onRefresh,
  onOrderClick,
  emptyMessage = "No orders yet",
  emptyIcon: EmptyIcon = ClockIcon,
  maxItems,
}: MobileOrdersListProps) {
  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold: 60,
  })

  const displayOrders = maxItems ? orders.slice(0, maxItems) : orders

  return (
    <div>
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all -mt-2 mb-2"
          style={{ height: Math.min(pullDistance, 60), opacity: Math.min(pullDistance / 60, 1) }}
        >
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          {EmptyIcon && <EmptyIcon className="size-8 mb-2 opacity-40" />}
          <p className="text-xs">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayOrders.map((order) => (
            <DataCard
              key={order.id}
              title={order.order_number ?? "—"}
              subtitle={order.user_name ?? undefined}
              right={formatPrice(order.total)}
              badge={
                <Badge variant={statusVariant[order.status]} className="text-[10px]">
                  {order.status}
                </Badge>
              }
              topLeft={
                order.created_at
                  ? new Date(order.created_at).toLocaleDateString()
                  : undefined
              }
              onClick={() => onOrderClick?.(order)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
