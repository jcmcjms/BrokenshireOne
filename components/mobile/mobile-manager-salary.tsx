"use client"
import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Wallet, Pencil, Trash, Plus } from "@phosphor-icons/react"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import { formatPrice } from "@/lib/utils"
import type { SalaryDeductionLimit, SalaryDeduction, DeductionType } from "@/types"

type TabValue = "limits" | "deductions"

function getCurrentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }) }))

const typeLabels: Record<DeductionType, string> = {
  loan: "Loan",
  uniform: "Uniform",
  damages: "Damages",
  other: "Other",
}

const typeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  loan: "default",
  uniform: "secondary",
  damages: "destructive",
  other: "outline",
}

export default function MobileManagerSalaryPage() {
  const { month: cMonth, year: cYear } = getCurrentMonthYear()

  const [limits, setLimits] = useState<(SalaryDeductionLimit & { id: string | null })[]>([])
  const [deductions, setDeductions] = useState<SalaryDeduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("limits")
  const [selectedMonth, setSelectedMonth] = useState(cMonth)
  const [selectedYear, setSelectedYear] = useState(cYear)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  const [editingLimit, setEditingLimit] = useState<(SalaryDeductionLimit & { id: string | null }) | null>(null)
  const [newLimitValue, setNewLimitValue] = useState("")
  const [savingLimit, setSavingLimit] = useState(false)

  const [dedDialogOpen, setDedDialogOpen] = useState(false)
  const [newDeduction, setNewDeduction] = useState({
    user_id: "",
    amount: "",
    deduction_type: "other" as DeductionType,
    reason: "",
  })
  const [savingDeduction, setSavingDeduction] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = `month=${selectedMonth}&year=${selectedYear}`
      const [limitsRes, dedRes] = await Promise.all([
        fetch(`/api/salary/limits?${params}`),
        fetch(`/api/salary/deductions?${params}`),
      ])
      if (!limitsRes.ok) throw new Error("Failed to fetch deduction limits")
      if (!dedRes.ok) throw new Error("Failed to fetch deductions")
      const limitsJson = await limitsRes.json()
      const dedJson = await dedRes.json()
      setLimits(limitsJson.data ?? [])
      setDeductions(dedJson.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetch("/api/users?role=staff&role=faculty")
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => {})
  }, [])

  const { refreshing, pullDistance } = usePullToRefresh({ onRefresh: fetchData })

  const openLimitDialog = (limit: (SalaryDeductionLimit & { id: string | null }) | null) => {
    setEditingLimit(limit)
    setNewLimitValue(limit?.max_deduction_limit?.toString() ?? "0")
    setLimitDialogOpen(true)
  }

  const handleSaveLimit = async () => {
    if (!editingLimit || !newLimitValue) return
    setSavingLimit(true)
    try {
      const res = await fetch("/api/salary/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingLimit.user_id,
          max_deduction_limit: parseFloat(newLimitValue),
          month: selectedMonth,
          year: selectedYear,
        }),
      })
      if (!res.ok) throw new Error("Failed to save limit")
      toast.success("Deduction limit updated")
      setLimitDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingLimit(false)
    }
  }

  const handleCreateDeduction = async () => {
    if (!newDeduction.user_id || !newDeduction.amount || !newDeduction.deduction_type) {
      toast.error("Please fill in required fields")
      return
    }
    if (parseFloat(newDeduction.amount) <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }
    setSavingDeduction(true)
    try {
      const res = await fetch("/api/salary/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: newDeduction.user_id,
          amount: parseFloat(newDeduction.amount),
          deduction_type: newDeduction.deduction_type,
          reason: newDeduction.reason || null,
          month: selectedMonth,
          year: selectedYear,
        }),
      })
      if (!res.ok) throw new Error("Failed to create deduction")
      toast.success("Deduction created")
      setDedDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setSavingDeduction(false)
    }
  }

  const confirmDeleteDeduction = async (ded: SalaryDeduction) => {
    try {
      const res = await fetch(`/api/salary/deductions?id=${ded.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete deduction")
      toast.success("Deduction deleted")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load salary data</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  const currentYears = Array.from({ length: 5 }, (_, i) => cYear - 2 + i)
  const selectedUserName = (userId: string) => users.find((u) => u.id === userId)?.name ?? userId

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentYears.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full">
          <TabsTrigger value="limits" className="flex-1">Limits</TabsTrigger>
          <TabsTrigger value="deductions" className="flex-1">Deductions</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "limits" && (
        <div className="flex flex-col gap-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))
          ) : limits.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No limits found for this period</p>
          ) : (
            limits.map((limit) => (
              <DataCard
                key={limit.user_id}
                title={limit.user_name ?? "Unknown"}
                subtitle={`Used: ${formatPrice(limit.total_deducted)} / ${formatPrice(limit.max_deduction_limit)}`}
                right={`${formatPrice(limit.remaining)} left`}
                badge={limit.remaining <= 0 ? <Badge variant="destructive" className="text-[10px]">Exhausted</Badge> : undefined}
                onClick={() => openLimitDialog(limit)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "deductions" && (
        <div className="flex flex-col gap-2">
          <Button size="sm" className="self-end mb-1" onClick={() => setDedDialogOpen(true)}>
            <Plus className="size-4 mr-1" /> Add
          </Button>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))
          ) : deductions.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No deductions for this period</p>
          ) : (
            deductions.map((ded) => (
              <DataCard
                key={ded.id}
                title={ded.user_name ?? "Unknown"}
                subtitle={ded.reason ?? "No reason provided"}
                right={formatPrice(ded.amount)}
                badge={<Badge variant={typeVariants[ded.deduction_type]} className="text-[10px]">{typeLabels[ded.deduction_type]}</Badge>}
                swipeActions={[
                  {
                    label: "Delete",
                    icon: Trash,
                    action: () => confirmDeleteDeduction(ded),
                    variant: "destructive",
                  },
                ]}
              />
            ))
          )}
        </div>
      )}

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deduction Limit</DialogTitle>
            <DialogDescription>
              {editingLimit?.user_name ?? "Unknown"} — {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Current deductions</label>
              <p className="text-sm">{formatPrice(editingLimit?.total_deducted ?? 0)}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Max deduction limit</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newLimitValue}
                onChange={(e) => setNewLimitValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLimitDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveLimit} disabled={savingLimit}>
              {savingLimit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dedDialogOpen} onOpenChange={setDedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Staff / Faculty</label>
              <Select
                value={newDeduction.user_id}
                onValueChange={(v) => setNewDeduction((p) => ({ ...p, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newDeduction.amount}
                onChange={(e) => setNewDeduction((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Type</label>
              <Select
                value={newDeduction.deduction_type}
                onValueChange={(v) => setNewDeduction((p) => ({ ...p, deduction_type: v as DeductionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["loan", "uniform", "damages", "other"] as DeductionType[]).map((t) => (
                    <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Reason</label>
              <Input
                placeholder="Optional reason"
                value={newDeduction.reason}
                onChange={(e) => setNewDeduction((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDedDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateDeduction} disabled={savingDeduction}>
              {savingDeduction ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
