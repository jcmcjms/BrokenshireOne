"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UserListIcon, CaretLeftIcon } from "@phosphor-icons/react"
import type { User } from "@/types"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users")
        if (!res.ok) throw new Error("Failed to fetch users")
        const json = await res.json()
        setUsers(json.data ?? json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const roleBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "ghost"> = {
    admin: "destructive",
    manager: "default",
    staff: "secondary",
    faculty: "outline",
    student: "ghost",
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <a href="/dashboard/admin">
            <CaretLeftIcon className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="font-heading text-sm font-medium">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">View and manage all system users</p>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <p className="text-destructive text-xs">Failed to load users</p>
          <p className="text-muted-foreground text-xs">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <UserListIcon className="size-4 inline mr-1" />
              All Users
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {loading ? "..." : `${users.length} total`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role]}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.employee_id ?? "—"}</TableCell>
                      <TableCell>${user.monthly_credit_limit.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
