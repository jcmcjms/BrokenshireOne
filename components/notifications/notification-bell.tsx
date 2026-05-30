"use client"

import { Bell } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
  /** Show offline indicator */
  offline?: boolean
}

/**
 * Bell icon with unread count badge.
 * Used in both desktop and mobile headers.
 */
export function NotificationBell({ unreadCount, onClick, offline = false }: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell
        className={cn(
          "size-4",
          offline ? "text-amber-500" : "text-muted-foreground",
        )}
        weight={unreadCount > 0 ? "fill" : "regular"}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  )
}
