"use client"

import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, CheckCircle, XCircle, WarningCircle, Bell, Trash } from "@phosphor-icons/react"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { Notification } from "./types"

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: Notification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

const iconMap: Record<string, React.ElementType> = {
  new_order: ShoppingCart,
  order_confirmed: CheckCircle,
  order_cancelled: XCircle,
  low_stock: WarningCircle,
}

const colorMap: Record<string, string> = {
  new_order: "text-blue-500",
  order_confirmed: "text-emerald-500",
  order_cancelled: "text-destructive",
  low_stock: "text-amber-500",
}

function getNavPath(n: Notification): string {
  switch (n.type) {
    case "new_order":
    case "order_confirmed":
    case "order_cancelled":
      return "/dashboard/manager/orders"
    case "low_stock":
      return "/dashboard/manager/inventory"
    default:
      return "#"
  }
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const router = useRouter()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="size-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px]">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onMarkAllRead}>
                <Trash className="size-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="size-8 mb-2 opacity-40" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => {
                const Icon = iconMap[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 border-b border-border/50",
                      !n.read && "bg-accent/20",
                    )}
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id)
                      onOpenChange(false)
                      router.push(getNavPath(n))
                    }}
                  >
                    <Icon className={cn("size-5 mt-0.5 shrink-0", colorMap[n.type] || "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs", !n.read && "font-medium")}>{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
