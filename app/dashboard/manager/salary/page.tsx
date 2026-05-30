"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CurrencyDollarIcon, PencilIcon, TrashIcon, PlusIcon, WalletIcon } from "@phosphor-icons/react"
import { cn, formatPrice } from "@/lib/utils"
import { DEDUCTION_TYPES } from "@/types"
import type { SalaryDeductionLimit, SalaryDeduction, DeductionType } from "@/types"
import { useMobile } from "@/components/mobile/hooks/use-mobile"
import MobileManagerSalaryPage from "@/components/mobile/mobile-manager-salary"

type TabValue = "limits" | "deductions"

function getCurrentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })
}

export default function ManagerSalaryPage() {
  const isMobile = useMobile()

  const { month: cMonth, year: cYear } = getCurrentMonthYear()

  // State
  const [limits, setLimits] = useState<(SalaryDeductionLimit & { id: string | null })[]>([])
  const [deductions, setDeductions] = useState<SalaryDeduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("limits")
  const [selectedMonth, setSelectedMonth] = useState(cMonth)
  const [selectedYear, setSelectedYear] = useState(cYear)

  // Limit edit dialog
  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  const [editingLimit, setEditingLimit] = useState<(SalaryDeductionLimit & { id: string | null }) | null>(null)
  const [newLimitValue, setNewLimitValue] = useState("")
  const [savingLimit, setSavingLimit] = useState(false)

  // Deduction create dialog
  const [dedDialogOpen, setDedDialogOpen] = useState(false)
  const [newDeduction, setNewDeduction] = useState({
    user_id: "",
    amount: "",
    deduction_type: "other" as DeductionType,
    reason: "",
  })
  const [savingDeduction, setSavingDeduction] = useState(false)

  // Deduction delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDeduction, setDeletingDeduction] = useState<SalaryDeduction | null>(null)

  // Fetch data
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

  // --- Limit handlers ---
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

  // --- Deduction handlers ---
  const openAddDeduction = () => {
    setNewDeduction({
      user_id: "",
      amount: "",
      deduction_type: "other",
      reason: "",
    })
    setDedDialogOpen(true)
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

  const confirmDeleteDeduction = async () => {
    if (!deletingDeduction) return
    try {
      const res = await fetch(`/api/salary/deductions?id=${deletingDeduction.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete deduction")
      toast.success("Deduction deleted")
      setDeleteDialogOpen(false)
      setDeletingDeduction(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  // --- Month navigation ---
  const changeMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1)
    setSelectedMonth(d.getMonth() + 1)
    setSelectedYear(d.getFullYear())
  }

  const monthLabel = `${monthName(selectedMonth)} ${selectedYear}`

  // Derived totals
  const totalLimits = limits.reduce((sum, l) => sum + (l.max_deduction_limit ?? 0), 0)
  const totalDeducted = deductions.reduce((sum, d) => sum + d.amount, 0)

  // Deduction type labels
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load salary data</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  if (isMobile) return <MobileManagerSalaryPage />

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-sm font-medium">Salary Deductions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage faculty and staff salary deductions and monthly limits
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            ← Prev
          </Button>
          <span className="text-xs font-medium tabular-nums min-w-[120px] text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            Next →
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Total Limit</CardTitle>
              <WalletIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-heading text-lg font-medium">{formatPrice(totalLimits)}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Total Deducted</CardTitle>
              <CurrencyDollarIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-heading text-lg font-medium">{formatPrice(totalDeducted)}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Remaining</CardTitle>
              <CurrencyDollarIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-heading text-lg font-medium">{formatPrice(totalLimits - totalDeducted)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Limits / Deductions */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <div className="flex items-center justify-between">
          <TabsList variant="line">
            <TabsTrigger value="limits">Deduction Limits</TabsTrigger>
            <TabsTrigger value="deductions">Deduction Entries</TabsTrigger>
          </TabsList>
        </div>

        {/* Limits Tab */}
        <TabsContent value="limits" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <WalletIcon className="size-4 inline mr-1" />
                  Monthly Deduction Limits — {monthLabel}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {limits.length} faculty/staff
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Max Limit</TableHead>
                    <TableHead>Deducted</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
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
                    : limits.map((limit) => {
                        const remaining = (limit.max_deduction_limit ?? 0) - (limit.total_deducted ?? 0)
                        const overLimit = remaining < 0
                        return (
                          <TableRow key={limit.user_id}>
                            <TableCell className="font-medium">{limit.user_name ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant={limit.user_role === "staff" ? "secondary" : "outline"} className="text-[10px] capitalize">
                                {limit.user_role ?? "Faculty"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={cn(limit.max_deduction_limit === 0 ? "text-muted-foreground" : "")}>
                                {formatPrice(limit.max_deduction_limit)}
                              </span>
                            </TableCell>
                            <TableCell>{formatPrice(limit.total_deducted)}</TableCell>
                            <TableCell>
                              <span className={cn(
                                overLimit ? "text-destructive font-medium" : "text-muted-foreground"
                              )}>
                                {formatPrice(Math.max(0, remaining))}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openLimitDialog(limit)}
                                title="Edit limit"
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  {!loading && limits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No faculty or staff users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions Tab */}
        <TabsContent value="deductions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <CurrencyDollarIcon className="size-4 inline mr-1" />
                  Deduction Entries — {monthLabel}
                </CardTitle>
                <Button size="sm" onClick={openAddDeduction}>
                  <PlusIcon className="size-4" />
                  Add Deduction
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-14" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : deductions.map((ded) => (
                        <TableRow key={ded.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(ded.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{ded.user_name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={typeVariants[ded.deduction_type]} className="text-[10px] capitalize">
                              {typeLabels[ded.deduction_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{formatPrice(ded.amount)}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {ded.reason ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{ded.created_by_name ?? "—"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setDeletingDeduction(ded)
                                setDeleteDialogOpen(true)
                              }}
                              title="Delete deduction"
                            >
                              <TrashIcon className="size-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!loading && deductions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No deductions recorded for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Limit Edit Dialog ===== */}
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Deduction Limit</DialogTitle>
            <DialogDescription>
              {editingLimit && (
                <>Update maximum deduction limit for <strong>{editingLimit.user_name}</strong> in {monthLabel}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Maximum Deduction Limit (PHP)</label>
              <Input
                value={newLimitValue}
                onChange={(e) => setNewLimitValue(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            {editingLimit && (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Already deducted: {formatPrice(editingLimit.total_deducted)}</span>
                <span>Currently remaining: {formatPrice(editingLimit.max_deduction_limit - editingLimit.total_deducted)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSaveLimit} disabled={savingLimit}>
              {savingLimit ? "Saving..." : "Save Limit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Deduction Dialog ===== */}
      <Dialog open={dedDialogOpen} onOpenChange={setDedDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Salary Deduction</DialogTitle>
            <DialogDescription>
              Record a new salary deduction for {monthLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Faculty/Staff *</label>
              <Select
                value={newDeduction.user_id}
                onValueChange={(v) => setNewDeduction({ ...newDeduction, user_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {limits.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>
                      {l.user_name ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Deduction Type *</label>
              <Select
                value={newDeduction.deduction_type}
                onValueChange={(v) => setNewDeduction({ ...newDeduction, deduction_type: v as DeductionType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DEDUCTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Amount (PHP) *</label>
              <Input
                value={newDeduction.amount}
                onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Reason / Notes</label>
              <Input
                value={newDeduction.reason}
                onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })}
                placeholder="Optional reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleCreateDeduction} disabled={savingDeduction}>
              {savingDeduction ? "Creating..." : "Create Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Deduction Confirmation ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deduction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deduction of{" "}
              <strong>{deletingDeduction ? formatPrice(deletingDeduction.amount) : ""}</strong>
              {" "}for{" "}
              <strong>{deletingDeduction?.user_name ?? "Unknown"}</strong>?
              This will also update the monthly deduction total.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" onClick={confirmDeleteDeduction}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

