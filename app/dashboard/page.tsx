"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ApiResponse, User } from "@/types"

export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirectByRole() {
      try {
        const res = await fetch("/api/auth/me")
        const data: ApiResponse<User> = await res.json()

        if (data.success && data.data) {
          const role = data.data.role
          const dashboards: Record<string, string> = {
            admin: "/dashboard/admin",
            manager: "/dashboard/manager",
            staff: "/dashboard/staff",
            faculty: "/dashboard/faculty",
            student: "/dashboard/student",
          }
          router.push(dashboards[role] || "/login")
        } else {
          router.push("/login")
        }
      } catch {
        router.push("/login")
      }
    }

    redirectByRole()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-4 animate-spin rounded-full border border-current border-t-transparent text-muted-foreground" />
    </div>
  )
}
