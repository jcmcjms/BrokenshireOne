"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn, formatPrice } from "@/lib/utils"
import { CreditCardIcon, CurrencyDollarIcon, ClockIcon } from "@phosphor-icons/react"
import type { CreditAllowance, CreditTransaction } from "@/types"
import { useMobile } from "@/components/mobile/hooks/use-mobile"
import MobileFacultyCreditsPage from "@/components/mobile/mobile-faculty-credits"

export default function FacultyCreditsPage() {
  const isMobile = useMobile()
  if (isMobile) return <MobileFacultyCreditsPage />

  const [allowance, setAllowance] = useState<CreditAllowance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [allowanceRes, txRes] = await Promise.all([
        fetch("/api/credits?current=true"),
        fetch("/api/credits/transactions"),
      ])
      if (!allowanceRes.ok) throw new Error("Failed to fetch allowance")
      if (!txRes.ok) throw new Error("Failed to fetch transactions")
      const allowanceData = await allowanceRes.json()
      const txData = await txRes.json()
      const a = Array.isArray(allowanceData.data) ? allowanceData.data[0] : (allowanceData.data ?? allowanceData)
      setAllowance(a ?? null)
      setTransactions(txData.data ?? txData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const creditLimit = allowance?.limit_amount ?? 0
  const creditUsed = allowance?.used_amount ?? 0
  const creditRemaining = allowance?.remaining ?? 0
  const creditPercent = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0

  const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
    meal: "default",
    deduction: "destructive",
    adjustment: "outline",
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load credit data</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-sm font-medium">My Credits</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Monthly credit allowance and transaction history</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <CreditCardIcon className="size-4 inline mr-1" />
              Current Month Allowance
            </CardTitle>
            <Badge variant="outline">{new Date().toLocaleString("default", { month: "long" })}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : allowance ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Limit</p>
                  <p className="font-heading text-base font-medium">{formatPrice(creditLimit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="font-heading text-base font-medium">{formatPrice(creditUsed)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={cn("font-heading text-base font-medium", creditRemaining <= 0 && "text-destructive")}>
                    {formatPrice(creditRemaining)}
                  </p>
                </div>
              </div>
              <div className="h-2.5 w-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    creditPercent > 80 ? "bg-destructive" : creditPercent > 50 ? "bg-primary" : "bg-primary/60"
                  )}
                  style={{ width: `${Math.min(creditPercent, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No allowance set for this month</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <ClockIcon className="size-3.5" />
          Transaction History
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeVariant[tx.type]} className="capitalize">{tx.type}</Badge>
                        </TableCell>
                        <TableCell className={cn(tx.amount < 0 ? "text-destructive" : "")}>
                          {tx.amount < 0 ? `-${formatPrice(Math.abs(tx.amount))}` : formatPrice(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{tx.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                {!loading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
