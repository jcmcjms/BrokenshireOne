"use client"

import { useEffect, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import type { User } from "@/types"

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "ghost"> = {
  admin: "destructive",
  manager: "default",
  staff: "secondary",
  faculty: "outline",
  student: "ghost",
}

export default function MobileAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchUsers = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchUsers,
    threshold: 60,
  })

  const filteredUsers = users.filter((user) => {
    if (search === "") return true
    const q = search.toLowerCase()
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.employee_id ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="font-heading text-base font-medium">User Management</h1>
        <p className="text-xs text-muted-foreground mt-0.5">View and manage all system users</p>
      </div>

      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: Math.min(pullDistance, 60), opacity: Math.min(pullDistance / 60, 1) }}
        >
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchUsers} className="ml-auto text-xs h-6">
            Retry
          </Button>
        </div>
      )}

      {!loading && (
        <p className="text-[11px] text-muted-foreground">
          {filteredUsers.length} of {users.length} users
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MagnifyingGlass className="size-8 mb-2 opacity-40" />
          <p className="text-xs">
            {search ? "No users match your search" : "No users found."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredUsers.map((user) => (
            <DataCard
              key={user.id}
              title={user.name}
              subtitle={user.email}
              badge={
                <Badge variant={roleBadgeVariant[user.role] ?? "ghost"} className="text-[10px]">
                  {user.role}
                </Badge>
              }
              topLeft={user.employee_id ? `ID: ${user.employee_id}` : undefined}
              onClick={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
