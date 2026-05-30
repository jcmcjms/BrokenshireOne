"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SignOut } from "@phosphor-icons/react"
import type { User } from "@/types"
import { NotificationBellWidget } from "@/components/notifications/notification-bell-widget"
import { BottomNav } from "./bottom-nav"
import { MoreMenu } from "./more-menu"
interface MobileTab {
  label: string
  href: string
  icon: React.ElementType
}

interface MobileLayoutProps {
  user: User
  children: React.ReactNode
  /** Overflow nav items for "More" menu */
  overflowItems: MobileTab[]
}

export function MobileLayout({ user, children, overflowItems }: MobileLayoutProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  // Extract page title from pathname
  const getTitle = () => {
    const p = pathname
    if (p === "/dashboard/admin") return "Admin"
    if (p === "/dashboard/manager") return "Manager"
    if (p === "/dashboard/staff") return "Staff"
    if (p === "/dashboard/faculty") return "Faculty"
    if (p === "/dashboard/student") return "Student"
    if (p === "/dashboard/order") return "Place Order"
    if (p.includes("/student/menu") || p.includes("/faculty/menu")) return "Menu"
    if (p.includes("/manager/menu") || p.includes("/admin") && p.includes("/menu")) return "Menu"
    if (p.includes("/orders")) return "Orders"
    if (p.includes("/credits")) return "Credits"
    if (p.includes("/inventory")) return "Inventory"
    if (p.includes("/salary")) return "Salary"
    if (p.includes("/reports")) return "Reports"
    if (p.includes("/users")) return "Users"
    if (p.includes("/settings")) return "Settings"
    return "Dashboard"
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-4">
        <h1 className="text-sm font-medium">{getTitle()}</h1>

        <div className="flex items-center gap-1">
          <NotificationBellWidget />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar size="sm">
                  {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {user.role}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <SignOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page content — offset for header + bottom nav */}
      <main className="flex-1 pt-12 pb-16 overflow-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav user={user} onMorePress={() => setMoreOpen(true)} />

      {/* "More" bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-xl p-4 pb-8"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <MoreMenu items={overflowItems} user={user} onClose={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
