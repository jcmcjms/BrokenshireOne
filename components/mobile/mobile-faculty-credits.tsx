"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataCard } from "@/components/mobile/data-card"
import { usePullToRefresh } from "@/components/mobile/hooks/use-pull-to-refresh"
import { cn, formatPrice } from "@/lib/utils"
import { CreditCard, CurrencyDollar, Clock } from "@phosphor-icons/react"
import type { CreditAllowance, CreditTransaction } from "@/types"

export default function MobileFacultyCreditsPage() {
  const [allowance, setAllowance] = useState<CreditAllowance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
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

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await fetchData()
  }, [fetchData])

  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    containerRef,
  })

  const creditLimit = allowance?.limit_amount ?? 0
  const creditUsed = allowance?.used_amount ?? 0
  const creditRemaining = allowance?.remaining ?? 0
  const creditPercent = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0

  const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    meal: "default",
    deduction: "destructive",
    adjustment: "outline",
  }

  const cardVariant: Record<string, "default" | "destructive" | "success" | "warning"> = {
    meal: "default",
    deduction: "destructive",
    adjustment: "warning",
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
    <div
      ref={containerRef}
      className="flex flex-col gap-4 px-4 py-4 overflow-y-auto h-full"
    >
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
        <h1 className="font-heading text-sm font-medium">My Credits</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Monthly credit allowance and transaction history</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[10px] flex items-center gap-1">
              <CreditCard className="size-3.5 text-muted-foreground" />
              Current Month Allowance
            </CardTitle>
            <Badge variant="outline" className="text-[9px] h-4">
              {new Date().toLocaleString("default", { month: "long" })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-32" />
            </div>
          ) : allowance ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Limit</p>
                  <p className="font-heading text-xs font-medium">{formatPrice(creditLimit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Used</p>
                  <p className="font-heading text-xs font-medium">{formatPrice(creditUsed)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                  <p className={cn("font-heading text-xs font-medium", creditRemaining <= 0 && "text-destructive")}>
                    {formatPrice(creditRemaining)}
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    creditPercent > 80 ? "bg-destructive" : creditPercent > 50 ? "bg-primary" : "bg-primary/60"
                  )}
                  style={{ width: `${Math.min(creditPercent, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">No allowance set for this month</p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xs font-medium mb-2 flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          Transaction History
        </h2>
        <div className="flex flex-col gap-1.5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))
            : transactions.map((tx) => (
                <DataCard
                  key={tx.id}
                  title={tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  subtitle={tx.notes ?? undefined}
                  right={tx.amount < 0 ? `-${formatPrice(Math.abs(tx.amount))}` : formatPrice(tx.amount)}
                  badge={
                    <Badge variant={typeVariant[tx.type]} className="text-[9px] h-4 capitalize">
                      {tx.type}
                    </Badge>
                  }
                  topLeft={
                    <span className="flex items-center gap-1">
                      <CurrencyDollar className="size-3" />
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  }
                  variant={cardVariant[tx.type]}
                />
              ))}
          {!loading && transactions.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
