"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Check, X, WarningCircle } from "@phosphor-icons/react"
import type { PermissionInfo, UserPermissionsResponse } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

export default function PermissionDialog({ open, onOpenChange, userId, userName }: Props) {
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([])
  const [userPerms, setUserPerms] = useState<UserPermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    if (open) {
      setLoading(true)
      Promise.all([
        fetch("/api/permissions").then((r) => r.json()),
        fetch(`/api/users/${userId}/permissions`).then((r) => r.json()),
      ])
        .then(([permsRes, userRes]) => {
          setAllPermissions(permsRes.data ?? permsRes ?? [])
          const userData = userRes.data ?? userRes
          setUserPerms(userData)
          // Clone overrides for local editing
          setLocalOverrides({ ...(userData?.overrides ?? {}) })
        })
        .catch(() => toast.error("Failed to load permissions"))
        .finally(() => setLoading(false))
    }
  }, [open, userId])

  // Get effective state for a permission:
  // true = granted, false = denied, null = role-based (use role_permissions)
  function getEffectiveState(code: string): boolean | null {
    // If there's a local override, use it
    if (code in localOverrides) {
      const ov = localOverrides[code]
      if (ov !== null) return ov
    }
    // Fall back to role-based
    if (userPerms) {
      return userPerms.role_permissions.includes(code) ? true : false
    }
    return false
  }

  // Get override state: true = grant, false = revoke, null = no override
  function getOverrideState(code: string): boolean | null {
    if (code in localOverrides) return localOverrides[code]
    if (userPerms && code in userPerms.overrides) return userPerms.overrides[code]
    return null
  }

  function togglePermission(code: string) {
    const current = getOverrideState(code)
    const effective = getEffectiveState(code)

    if (current === null) {
      // No override yet — set opposite of effective
      setLocalOverrides((prev) => ({ ...prev, [code]: !effective }))
    } else if (current === true) {
      // Currently granted as override — either revoke or reset
      if (effective === true && userPerms?.role_permissions.includes(code)) {
        // Was role-based, override was granting — reset to null (role default)
        setLocalOverrides((prev) => {
          const next = { ...prev }
          delete next[code]
          return next
        })
      } else {
        // Toggle to revoke
        setLocalOverrides((prev) => ({ ...prev, [code]: false }))
      }
    } else {
      // Currently revoked — reset to null
      setLocalOverrides((prev) => {
        const next = { ...prev }
        delete next[code]
        return next
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: localOverrides }),
      })
      if (!res.ok) throw new Error("Failed to save permissions")
      toast.success("Permissions updated")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permissions")
    } finally {
      setSaving(false)
    }
  }

  // Group permissions by module
  const grouped = allPermissions.reduce(
    (acc, perm) => {
      const module = perm.module || "other"
      if (!acc[module]) acc[module] = []
      acc[module].push(perm)
      return acc
    },
    {} as Record<string, PermissionInfo[]>,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Grant or revoke individual permissions for <strong>{userName}</strong>.
            Changes take effect on next login.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {module}
                </h4>
                <div className="flex flex-col gap-1">
                  {perms.map((perm) => {
                    const effective = getEffectiveState(perm.code)
                    const override = getOverrideState(perm.code)
                    const hasOverride = override !== null

                    return (
                      <div
                        key={perm.code}
                        className="flex items-center justify-between gap-2 rounded-none border border-border px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => togglePermission(perm.code)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`size-4 shrink-0 rounded-none border flex items-center justify-center transition-colors ${
                              effective
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-transparent border-muted-foreground/30"
                            }`}
                          >
                            {effective && <Check className="size-3" weight="bold" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{perm.code}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{perm.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasOverride && (
                            <Badge
                              variant={override ? "default" : "destructive"}
                              className="text-[9px] px-1 py-0 h-4"
                            >
                              {override ? "Granted" : "Revoked"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
