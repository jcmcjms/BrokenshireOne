"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { User, ApiResponse } from "@/types"
import {
  House,
  Users,
  ForkKnife,
  Receipt,
  CreditCard,
  ChartBar,
  Gear,
  ShoppingCart,
  SignOut,
  List,
  PackageIcon,
} from "@phosphor-icons/react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

/**
 * Maps each dashboard route to the required permission(s).
 * Empty array = always visible to users with that role.
 * Non-empty = user must have at least one of these permissions.
 */
const routePermissionMap: Record<string, string[]> = {
  "/dashboard/admin": [],
  "/dashboard/admin/users": ["users.manage"],
  "/dashboard/admin/settings": [],
  "/dashboard/manager": [],
  "/dashboard/manager/menu": ["menu.view"],
  "/dashboard/manager/inventory": ["menu.manage"],
  "/dashboard/manager/orders": ["orders.view_all"],
  "/dashboard/manager/credits": ["credits.manage"],
  "/dashboard/manager/reports": ["reports.view"],
  "/dashboard/staff": ["orders.process"],
  "/dashboard/staff/orders": ["orders.view_own"],
  "/dashboard/faculty": [],
  "/dashboard/faculty/orders": ["orders.view_own"],
  "/dashboard/faculty/credits": ["credits.view_own"],
  "/dashboard/student": [],
  "/dashboard/student/menu": ["menu.view"],
  "/dashboard/student/orders": ["orders.view_own"],
  "/dashboard/faculty/menu": ["menu.view"],
  "/dashboard/order": ["orders.process"],
}

/**
 * Checks if a user can see a nav item based on their permissions.
 * - If routePermissionMap has no requirements → always visible
 * - If routePermissionMap has requirements → user must have at least one
 */
function canSeeNavItem(user: User | null, href: string): boolean {
  const requiredPerms = routePermissionMap[href]
  if (!requiredPerms || requiredPerms.length === 0) return true
  const userPerms = user?.permissions ?? []
  return requiredPerms.some((p) => userPerms.includes(p))
}

const navConfig: Record<string, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/dashboard/admin", icon: House },
    { label: "Users", href: "/dashboard/admin/users", icon: Users },
    { label: "Menu", href: "/dashboard/manager/menu", icon: ForkKnife },
    { label: "Orders", href: "/dashboard/manager/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard/manager/credits", icon: CreditCard },
    { label: "Reports", href: "/dashboard/manager/reports", icon: ChartBar },
    { label: "Settings", href: "/dashboard/admin/settings", icon: Gear },
  ],
  manager: [
    { label: "Dashboard", href: "/dashboard/manager", icon: House },
    { label: "Menu", href: "/dashboard/manager/menu", icon: ForkKnife },
    { label: "Inventory", href: "/dashboard/manager/inventory", icon: PackageIcon },
    { label: "Orders", href: "/dashboard/manager/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard/manager/credits", icon: CreditCard },
    { label: "Reports", href: "/dashboard/manager/reports", icon: ChartBar },
  ],
  staff: [
    { label: "Counter", href: "/dashboard/staff", icon: ShoppingCart },
    { label: "Orders", href: "/dashboard/staff/orders", icon: Receipt },
  ],
  faculty: [
    { label: "Dashboard", href: "/dashboard/faculty", icon: House },
    { label: "Menu", href: "/dashboard/faculty/menu", icon: ForkKnife },
    { label: "Place Order", href: "/dashboard/order", icon: ShoppingCart },
    { label: "My Orders", href: "/dashboard/faculty/orders", icon: Receipt },
    { label: "My Credits", href: "/dashboard/faculty/credits", icon: CreditCard },
  ],
  student: [
    { label: "Dashboard", href: "/dashboard/student", icon: House },
    { label: "Menu", href: "/dashboard/student/menu", icon: ForkKnife },
    { label: "Place Order", href: "/dashboard/order", icon: ShoppingCart },
    { label: "My Orders", href: "/dashboard/student/orders", icon: Receipt },
  ],
}

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard/admin") return "Admin Dashboard"
  if (pathname === "/dashboard/manager") return "Manager Dashboard"
  if (pathname === "/dashboard/staff") return "Staff Counter"
  if (pathname === "/dashboard/faculty") return "Faculty Dashboard"
  if (pathname === "/dashboard/student") return "Student Dashboard"
  if (pathname.includes("/users")) return "Users"
  if (pathname.includes("/student/menu") || pathname.includes("/faculty/menu")) return "Menu"
  if (pathname.includes("/menu")) return "Menu Management"
  if (pathname.includes("/orders")) return "Orders"
  if (pathname.includes("/credits")) return "Credits"
  if (pathname.includes("/inventory")) return "Inventory Management"
  if (pathname.includes("/reports")) return "Reports"
  if (pathname.includes("/settings")) return "Settings"
  return "Dashboard"
}

function SidebarContent({
  navItems,
  pathname,
  user,
  onNavigate,
}: {
  navItems: NavItem[]
  pathname: string
  user: User | null
  onNavigate?: () => void
}) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <div className="flex size-7 items-center justify-center bg-primary text-primary-foreground">
          <span className="text-[10px] font-bold">BO</span>
        </div>
        <span className="text-xs font-medium">BrokenshireOne</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.filter((item) => canSeeNavItem(user, item.href)).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-none px-2 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="border-t border-border p-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar size="sm">
              {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <Badge variant="secondary" className="text-[10px]">
                {user.role}
              </Badge>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={handleLogout} title="Logout">
              <SignOut />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        const data: ApiResponse<User> = await res.json()
        if (data.success && data.data) {
          setUser(data.data)
        } else {
          router.push("/login")
        }
      } catch {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  const role = user?.role
  const navItems = role ? navConfig[role] || [] : []

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-4 animate-spin rounded-full border border-current border-t-transparent text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-48 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <SidebarContent navItems={navItems} pathname={pathname} user={user} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <List />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" showCloseButton={false} className="w-56 p-0">
                <SidebarContent
                  navItems={navItems}
                  pathname={pathname}
                  user={user}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-sm font-medium">{getPageTitle(pathname)}</h1>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar size="sm">
                    {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs">{user.name}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">
                    {user.role}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
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

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
