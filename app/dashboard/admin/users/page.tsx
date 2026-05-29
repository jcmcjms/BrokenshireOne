"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  UserPlus,
  PencilSimple,
  TrashSimple,
  MagnifyingGlass,
  CaretLeft,
  Check,
  X,
  Warning,
} from "@phosphor-icons/react"
import type { User } from "@/types"

interface Role {
  id: string
  name: string
  description: string
}

interface FormData {
  name: string
  email: string
  employee_id: string
  role_id: string
  monthly_credit_limit: string
}

const emptyForm: FormData = {
  name: "",
  email: "",
  employee_id: "",
  role_id: "",
  monthly_credit_limit: "0",
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "ghost"> = {
  admin: "destructive",
  manager: "default",
  staff: "secondary",
  faculty: "outline",
  student: "ghost",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & filter
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
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

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles")
      if (res.ok) {
        const json = await res.json()
        setRoles(json.data ?? [])
      }
    } catch {
      // Roles fetch is optional — fallback below
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      search === "" ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.employee_id || "").toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  function openCreateDialog() {
    setEditingUser(null)
    setForm(emptyForm)
    setFormError(null)
    setFormSuccess(null)
    setDialogOpen(true)
  }

  function openEditDialog(user: User) {
    setEditingUser(user)
    setForm({
      name: user.name,
      email: user.email,
      employee_id: user.employee_id || "",
      role_id: user.role_id,
      monthly_credit_limit: user.monthly_credit_limit.toString(),
    })
    setFormError(null)
    setFormSuccess(null)
    setDialogOpen(true)
  }

  function openDeleteDialog(user: User) {
    setDeleteTarget(user)
    setDeleteOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const isEdit = !!editingUser
      const url = isEdit ? `/api/users/${editingUser!.id}` : "/api/users"
      const method = isEdit ? "PUT" : "POST"

      const body: Record<string, any> = {
        name: form.name,
        email: form.email,
        employee_id: form.employee_id,
        role_id: form.role_id,
        monthly_credit_limit: parseFloat(form.monthly_credit_limit) || 0,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save user")
      }

      setFormSuccess(isEdit ? "User updated successfully" : "User created successfully. Credentials emailed.")

      // Refresh list
      await fetchUsers()

      // Close dialog after short delay
      setTimeout(() => {
        setDialogOpen(false)
        setEditingUser(null)
        setFormSuccess(null)
      }, 2000)
    } catch (err: any) {
      setFormError(err.message || "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to deactivate user")
      }

      setDeleteOpen(false)
      setDeleteTarget(null)
      await fetchUsers()
    } catch (err: any) {
      setFormError(err.message || "An error occurred")
    } finally {
      setDeleting(false)
    }
  }

  const roleOptions = Array.from(new Set(users.map((u) => u.role)))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <a href="/dashboard/admin">
              <CaretLeft className="size-4" />
            </a>
          </Button>
          <div>
            <h1 className="font-heading text-sm font-medium">User Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage all system users</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">
          {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-medium">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {user.employee_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role]} className="text-[10px]">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${user.monthly_credit_limit.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`size-1.5 rounded-full ${
                              user.active ? "bg-emerald-500" : "bg-zinc-300"
                            }`}
                          />
                          <span className="text-xs">{user.active ? "Active" : "Inactive"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditDialog(user)}
                            title="Edit user"
                          >
                            <PencilSimple className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openDeleteDialog(user)}
                            title={user.active ? "Deactivate user" : "Activate user"}
                            disabled={user.role === "admin"}
                          >
                            {user.active ? (
                              <TrashSimple className="size-3.5 text-destructive" />
                            ) : (
                              <Check className="size-3.5 text-emerald-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {search || roleFilter !== "all"
                      ? "No users match your search"
                      : "No users found. Click 'Add User' to create one."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details below."
                : "Create a new user. Credentials will be emailed to them."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Full Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                className="h-8 text-xs"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@school.edu"
                className="h-8 text-xs"
              />
            </div>

            {/* Employee ID */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Employee ID <span className="text-zinc-400">(auto-generated if empty)</span>
              </label>
              <Input
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value.toUpperCase() })}
                placeholder="e.g. STU-001"
                className="h-8 text-xs uppercase"
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Role</label>
              <Select
                value={form.role_id}
                onValueChange={(value) => setForm({ ...form, role_id: value })}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Credit Limit */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Monthly Credit Limit ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_credit_limit}
                onChange={(e) => setForm({ ...form, monthly_credit_limit: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            {formError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            {formSuccess && (
              <Alert className="py-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20">
                <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400">
                  {formSuccess}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Saving...
                </>
              ) : editingUser ? (
                "Save Changes"
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning className="size-4 text-destructive" />
              {deleteTarget?.active ? "Deactivate User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.active
                ? `Are you sure you want to deactivate "${deleteTarget?.name}"? They will not be able to log in.`
                : `Reactivate "${deleteTarget?.name}"? They will regain access to the system.`}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant={deleteTarget?.active ? "destructive" : "default"}
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Processing...
                </>
              ) : deleteTarget?.active ? (
                <>
                  <TrashSimple className="size-3.5" />
                  Deactivate
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Reactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
