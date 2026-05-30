"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/browser"
import { showNotificationToast } from "./notification-toast"
import type { Notification } from "./types"

interface NotificationContextValue {
  unreadCount: number
  notifications: Notification[]
  offline: boolean
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  notifications: [],
  offline: false,
  refresh: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

interface NotificationProviderProps {
  user: { id: string; role: string }
  children: ReactNode
}

export function NotificationProvider({ user, children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [offline, setOffline] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications`)
      if (res.ok) {
        const json = await res.json()
        const list: Notification[] = json.data ?? json ?? []
        setNotifications(list)
        setUnreadCount(list.filter((n) => !n.read).length)
      }
    } catch {
      // Silently fail — Realtime will catch up
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    } catch {
      // Ignore
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read_all: true }),
      })
    } catch {
      // Ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // Initial fetch + Supabase Realtime subscription
  useEffect(() => {
    refresh()

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev])
          setUnreadCount((prev) => prev + 1)
          showNotificationToast(newNotif)
        },
      )
      .subscribe((status) => {
        setOffline(status !== "SUBSCRIBED")
      })

    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      channel.unsubscribe()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [user.id, refresh])

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, offline, refresh, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
