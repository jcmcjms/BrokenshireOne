"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useSwipeable, type SwipeAction } from "./hooks/use-swipeable"

export type { SwipeAction }

interface SwipeableRowProps {
  children: ReactNode
  actions?: SwipeAction[]
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * A swipeable row wrapper for mobile.
 * Swipe left to reveal action buttons (Complete, Cancel, Remove, etc.)
 */
export function SwipeableRow({
  children,
  actions = [],
  disabled = false,
  onOpenChange,
  className = "",
}: SwipeableRowProps) {
  const { bind, translateX, isOpen, close } = useSwipeable({
    actions,
    disabled: disabled || actions.length === 0,
  })

  const variantMap: Record<string, "default" | "destructive" | "secondary" | "outline" | "ghost"> = {
    default: "default",
    destructive: "destructive",
    success: "default",
    warning: "secondary",
  }

  const colorMap: Record<string, string> = {
    default: "",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Action buttons behind the content */}
      {actions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={variantMap[action.variant ?? "default"] as any}
              className={`h-full w-18 rounded-none text-xs flex-col gap-0.5 ${colorMap[action.variant ?? "default"]}`}
              onClick={() => {
                action.action()
                close()
              }}
            >
              {action.icon && <action.icon className="size-4" />}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Foreground content */}
      <div
        {...bind}
        className="relative z-10 bg-background transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${translateX}px)` }}
        onClick={() => {
          if (isOpen) close()
        }}
      >
        {children}
      </div>
    </div>
  )
}
