"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CreditCard, Pencil } from "@phosphor-icons/react"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import { cn, formatPrice } from "@/lib/utils"
import type { CreditAllowance } from "@/types"

export default function MobileManagerCreditsPage() {
  const [allowances, setAllowances] = useState<CreditAllowance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAllowance, setEditingAllowance] = useState<CreditAllowance | null>(null)
  const [newLimit, setNewLimit] = useState("")
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchAllowances = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/credits")
      if (!res.ok) throw new Error("Failed to fetch credit allowances")
      const json = await res.json()
      setAllowances(json.data ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAllowances() }, [fetchAllowances])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await fetchAllowances()
  }, [fetchAllowances])

  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
  })

  const openSetLimit = (allowance: CreditAllowance) => {
    setEditingAllowance(allowance)
    setNewLimit(allowance.limit_amount.toString())
    setDialogOpen(true)
  }

  const handleSaveLimit = async () => {
    if (!editingAllowance || !newLimit) return
    setSaving(true)
    try {
      const res = await fetch("/api/credits/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingAllowance.user_id,
          limit_amount: parseFloat(newLimit),
          month: editingAllowance.month,
          year: editingAllowance.year,
        }),
      })
      if (!res.ok) throw new Error("Failed to update allowance")
      toast.success("Credit limit updated")
      setDialogOpen(false)
      fetchAllowances()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const cardVariant = (a: CreditAllowance): "default" | "destructive" | "success" | "warning" => {
    if (a.remaining <= 0) return "destructive"
    if (a.remaining < a.limit_amount * 0.2) return "warning"
    return "default"
  }

  const getUsagePercent = (a: CreditAllowance) =>
    a.limit_amount > 0 ? Math.round((a.used_amount / a.limit_amount) * 100) : 0

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load credit data</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchAllowances}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {pullDistance > 0 && !refreshing && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <div className="text-[10px] text-muted-foreground">Pull to refresh</div>
        </div>
      )}

      <div>
        <h1 className="font-heading text-sm font-medium">Credit Management</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage faculty and staff monthly credit allowances</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      ) : allowances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CreditCard className="size-8 mb-2 opacity-40" />
          <p className="text-xs">No credit allowances found for this month</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allowances.map((a) => {
            const percent = getUsagePercent(a)
            return (
              <DataCard
                key={a.id}
                title={a.user_name ?? "—"}
                subtitle={
                  <span className="flex items-center gap-1">
                    <Pencil className="size-3 text-muted-foreground" />
                    Tap to edit limit
                  </span>
                }
                right={formatPrice(a.remaining)}
                badge={
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] h-4",
                      a.remaining <= 0 && "text-destructive border-destructive/30"
                    )}
                  >
                    {a.remaining <= 0 ? "Exhausted" : `${percent}% used`}
                  </Badge>
                }
                variant={cardVariant(a)}
                onClick={() => openSetLimit(a)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Limit: {formatPrice(a.limit_amount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Used: {formatPrice(a.used_amount)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full transition-all rounded-full",
                      percent > 80 ? "bg-destructive" : percent > 50 ? "bg-primary" : "bg-primary/60"
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </DataCard>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Credit Limit</DialogTitle>
            <DialogDescription>
              Update monthly credit allowance for {editingAllowance?.user_name ?? "this user"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Monthly Limit (PHP)</label>
              <Input
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
              />
            </div>
            {editingAllowance && (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Currently used: {formatPrice(editingAllowance.used_amount)}</span>
                <span>Currently remaining: {formatPrice(editingAllowance.remaining)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveLimit} disabled={saving}>
              {saving ? "Saving..." : "Save Limit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
