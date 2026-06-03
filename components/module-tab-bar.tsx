'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getModulesForRole, getActiveModule, getModuleHome } from '@/lib/modules'
import type { User } from '@/types'
import { House } from '@phosphor-icons/react'

interface ModuleTabBarProps {
  user: User
}

export function ModuleTabBar({ user }: ModuleTabBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const modules = getModulesForRole(user.role)
  const activeModule = getActiveModule(pathname)

  // Don't show the tab bar on the hub dashboard
  if (pathname === '/dashboard' || modules.length <= 1) return null

  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-border bg-background px-2">
      {/* Home button */}
      <button
        onClick={() => router.push('/dashboard')}
        className={cn(
          "flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs transition-colors",
          pathname === '/dashboard'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        title="Dashboard Home"
      >
        <House className="size-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Module tabs */}
      {modules.map((mod) => {
        const Icon = mod.icon
        const isActive = activeModule === mod.id
        return (
          <button
            key={mod.id}
            onClick={() => router.push(getModuleHome(mod.id, user.role) || `/dashboard/${mod.id}`)}
            className={cn(
              "flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", !isActive && mod.color)} />
            <span>{mod.label}</span>
          </button>
        )
      })}
    </div>
  )
}
