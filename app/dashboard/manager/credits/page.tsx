"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CreditCardIcon, PencilIcon, CurrencyDollarIcon } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { CreditAllowance } from "@/types"

export default function ManagerCreditsPage() {
  const [allowances, setAllowances] = useState<CreditAllowance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAllowance, setEditingAllowance] = useState<CreditAllowance | null>(null)
  const [newLimit, setNewLimit] = useState("")
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchAllowances = useCallback(async () => {
    try {
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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Credit Management</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage faculty and staff monthly credit allowances</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <CreditCardIcon className="size-4 inline mr-1" />
            Current Month Allowances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Monthly Limit</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : allowances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.user_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>{formatPrice(a.limit_amount)}</TableCell>
                      <TableCell>{formatPrice(a.used_amount)}</TableCell>
                      <TableCell>
                        <span className={a.remaining <= 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {formatPrice(a.remaining <= 0 ? 0 : a.remaining)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" onClick={() => openSetLimit(a)}>
                          <PencilIcon className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && allowances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No credit allowances found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSaveLimit} disabled={saving}>
              {saving ? "Saving..." : "Save Limit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
