"use client"

import { useState } from "react"
import { useNotifications } from "./notification-provider"
import { NotificationBell } from "./notification-bell"
import { NotificationPanel } from "./notification-panel"

/**
 * Bell icon + notification panel combo.
 * Place this in header areas of layouts.
 */
export function NotificationBellWidget() {
  const [panelOpen, setPanelOpen] = useState(false)
  const { unreadCount, notifications, offline, markAsRead, markAllAsRead } = useNotifications()

  return (
    <>
      <NotificationBell
        unreadCount={unreadCount}
        offline={offline}
        onClick={() => setPanelOpen(true)}
      />
      <NotificationPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
      />
    </>
  )
}
