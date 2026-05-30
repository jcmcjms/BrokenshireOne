"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SignOut, Gear } from "@phosphor-icons/react"
import type { User } from "@/types"

interface OverflowItem {
  label: string
  href: string
  icon: React.ElementType
}

interface MoreMenuProps {
  items: OverflowItem[]
  user: User
  onClose: () => void
  onLogout?: () => void
}

/**
 * The "More" overflow panel shown as a bottom sheet.
 * Displays extra nav items in a grid + Settings/Logout at the bottom.
 */
export function MoreMenu({ items, user, onClose, onLogout }: MoreMenuProps) {
  const router = useRouter()

  async function handleLogout() {
    if (onLogout) {
      onLogout()
    } else {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    }
  }

  return (
    <div className="flex flex-col gap-4" onClick={onClose}>
      {/* Grid of overflow nav items */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1.5 rounded-lg p-4 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Icon className="size-6" />
                <span className="text-center leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-1">
        {items.some((i) => i.href.includes("settings")) && (
          <Button variant="ghost" className="justify-start gap-2 h-10 text-xs" asChild>
            <Link href="/dashboard/admin/settings">
              <Gear className="size-4" />
              Settings
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          className="justify-start gap-2 h-10 text-xs text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <SignOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
