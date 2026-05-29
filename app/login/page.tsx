"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SignIn, IdentificationCard, Lock } from "@phosphor-icons/react"
import type { ApiResponse } from "@/types"

export default function LoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, password }),
      })

      const data: ApiResponse = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || data.message || "Login failed")
        return
      }

      router.push("/dashboard")
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
              <span className="text-xs font-bold">CM</span>
            </div>
            <div>
              <CardTitle>BrokenshireOne</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="employee-id" className="text-xs text-muted-foreground">
                Employee ID
              </label>
              <div className="relative">
                <IdentificationCard className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employee-id"
                  type="text"
                  placeholder="e.g. STU-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="pl-7 uppercase"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <SignIn />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
