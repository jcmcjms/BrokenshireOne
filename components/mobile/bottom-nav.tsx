"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { User } from "@/types"
import {
  House,
  ForkKnife,
  ShoppingCart,
  Receipt,
  CreditCard,
  ChartBar,
  PackageIcon,
  Wallet,
  Users,
  Gear,
  DotsThree,
} from "@phosphor-icons/react"

export interface MobileTab {
  label: string
  href: string
  icon: React.ElementType
}

/**
 * Primary tabs (shown in bottom nav) + overflow (shown in "More" sheet).
 * Each role gets up to 4 primary tabs + "More" for the rest.
 */
export const mobileNavConfig: Record<string, { primary: MobileTab[]; overflow: MobileTab[] }> = {
  student: {
    primary: [
      { label: "Dashboard", href: "/dashboard/student", icon: House },
      { label: "Menu", href: "/dashboard/student/menu", icon: ForkKnife },
      { label: "Order", href: "/dashboard/order", icon: ShoppingCart },
      { label: "Orders", href: "/dashboard/student/orders", icon: Receipt },
    ],
    overflow: [],
  },
  faculty: {
    primary: [
      { label: "Dashboard", href: "/dashboard/faculty", icon: House },
      { label: "Menu", href: "/dashboard/faculty/menu", icon: ForkKnife },
      { label: "Order", href: "/dashboard/order", icon: ShoppingCart },
      { label: "Orders", href: "/dashboard/faculty/orders", icon: Receipt },
    ],
    overflow: [
      { label: "Credits", href: "/dashboard/faculty/credits", icon: CreditCard },
    ],
  },
  staff: {
    primary: [
      { label: "Counter", href: "/dashboard/staff", icon: ShoppingCart },
      { label: "Orders", href: "/dashboard/staff/orders", icon: Receipt },
    ],
    overflow: [],
  },
  manager: {
    primary: [
      { label: "Dashboard", href: "/dashboard/manager", icon: House },
      { label: "Menu", href: "/dashboard/manager/menu", icon: ForkKnife },
      { label: "Orders", href: "/dashboard/manager/orders", icon: Receipt },
      { label: "Credits", href: "/dashboard/manager/credits", icon: CreditCard },
    ],
    overflow: [
      { label: "Inventory", href: "/dashboard/manager/inventory", icon: PackageIcon },
      { label: "Salary", href: "/dashboard/manager/salary", icon: Wallet },
      { label: "Reports", href: "/dashboard/manager/reports", icon: ChartBar },
    ],
  },
  admin: {
    primary: [
      { label: "Dashboard", href: "/dashboard/admin", icon: House },
      { label: "Menu", href: "/dashboard/manager/menu", icon: ForkKnife },
      { label: "Orders", href: "/dashboard/manager/orders", icon: Receipt },
      { label: "Users", href: "/dashboard/admin/users", icon: Users },
    ],
    overflow: [
      { label: "Settings", href: "/dashboard/admin/settings", icon: Gear },
    ],
  },
}

interface BottomNavProps {
  user: User
  onMorePress: () => void
}

export function BottomNav({ user, onMorePress }: BottomNavProps) {
  const pathname = usePathname()
  const config = mobileNavConfig[user.role] ?? { primary: [], overflow: [] }
  const hasOverflow = config.overflow.length > 0

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-border bg-background px-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {config.primary.map((tab) => {
        const Icon = tab.icon
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-none py-1 text-[10px] transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              className={cn("size-5", active && "fill-primary")}
              weight={active ? "fill" : "regular"}
            />
            <span className="leading-none">{tab.label}</span>
          </Link>
        )
      })}

      {/* "More" tab — only shown if there are overflow items */}
      {hasOverflow && (
        <button
          onClick={onMorePress}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <DotsThree className="size-5" />
          <span className="leading-none">More</span>
        </button>
      )}
    </nav>
  )
}
