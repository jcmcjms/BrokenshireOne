"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CaretRight } from "@phosphor-icons/react"
import { SwipeableRow, type SwipeAction } from "./swipeable-row"

export interface DataCardProps {
  id?: string
  /** Primary bold text (order number, item name, etc.) */
  title: string
  /** Secondary muted text (customer name, description, etc.) */
  subtitle?: ReactNode
  /** Right-aligned value (price, count, etc.) */
  right?: string
  /** Badge or status indicator */
  badge?: ReactNode
  /** Optional click handler for navigation/details */
  onClick?: () => void
  /** Swipe actions for mobile */
  swipeActions?: SwipeAction[]
  /** Additional top-left meta (timestamps, etc.) */
  topLeft?: ReactNode
  /** Bottom section for extra details */
  children?: ReactNode
  /** Visual indicator for row variant */
  variant?: "default" | "destructive" | "success" | "warning"
}

const variantBorder: Record<string, string> = {
  default: "",
  destructive: "border-l-destructive",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
}

/**
 * Card-based list item that replaces `<Table>` rows on mobile.
 * Supports swipe actions, tap navigation, and status indicators.
 */
export function DataCard({
  title,
  subtitle,
  right,
  badge,
  onClick,
  swipeActions,
  topLeft,
  children,
  variant = "default",
}: DataCardProps) {
  const content = (
    <Card
      className={`border-l-2 cursor-pointer transition-colors hover:bg-accent/50 ${variantBorder[variant]}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Top row */}
        {topLeft && <div className="mb-1 text-[10px] text-muted-foreground">{topLeft}</div>}

        <div className="flex items-center gap-2">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium truncate">{title}</p>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Right content */}
          {right && (
            <span className="text-xs font-heading font-medium shrink-0">{right}</span>
          )}

          {/* Chevron indicator */}
          {onClick && (
            <CaretRight className="size-3.5 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Bottom content */}
        {children && <div className="mt-2">{children}</div>}
      </CardContent>
    </Card>
  )

  if (swipeActions && swipeActions.length > 0) {
    return (
      <SwipeableRow actions={swipeActions}>
        {content}
      </SwipeableRow>
    )
  }

  return content
}
