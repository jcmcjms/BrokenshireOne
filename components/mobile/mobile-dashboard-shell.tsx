"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePullToRefresh } from "./hooks/use-pull-to-refresh"

interface StatCard {
  label: string
  value: string | number | undefined | null
  icon: React.ElementType
  loading?: boolean
}

interface MobileDashboardShellProps {
  title: string
  subtitle?: string
  stats: StatCard[]
  onRefresh: () => Promise<void>
  children?: ReactNode
  /** Extra header action */
  headerExtra?: ReactNode
}

/**
 * Mobile-optimized dashboard with stat cards + pull-to-refresh.
 */
export function MobileDashboardShell({
  title,
  subtitle,
  stats,
  onRefresh,
  children,
  headerExtra,
}: MobileDashboardShellProps) {
  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold: 60,
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: Math.min(pullDistance, 60), opacity: Math.min(pullDistance / 60, 1) }}
        >
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-sm font-medium">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerExtra}
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px]">{stat.label}</CardTitle>
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {stat.loading ? (
                  <Skeleton className="h-5 w-14" />
                ) : (
                  <p className="font-heading text-base font-medium">
                    {stat.value ?? "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Children (order list, alerts, etc.) */}
      {children}
    </div>
  )
}
