/**
 * BrokenshireOne Module Registry
 *
 * Central navigation system that allows multiple school modules
 * (canteen, library, classroom, etc.) to coexist with a tab-bar UX.
 *
 * Each module defines:
 *  - Which roles can access it
 *  - Role-specific sidebar nav items (with permission filtering)
 *  - Optional mobile tab bar configuration
 *  - An accent colour for the module tab indicator
 *
 * Usage:
 *   import { MODULE_REGISTRY, getModulesForRole, getNavItemsForModule, getActiveModule } from '@/lib/modules'
 *
 *   const modules = getModulesForRole(user.role)
 *   const navItems = getNavItemsForModule('canteen', user.role, user.permissions ?? [])
 *   const active = getActiveModule(pathname) // → 'canteen' | 'library' | null
 */

import type { ElementType } from 'react'
import type { Role } from '@/types'
import {
  House,
  ForkKnife,
  BookOpen,
  Books,
  Chalkboard,
  Megaphone,
  Receipt,
  CreditCard,
  ChartBar,
  PackageIcon,
  Wallet,
  Users,
  ShoppingCart,
  Clock,
  CalendarCheck,
  NotePencil,
  Student,
  CurrencyDollar,
  Cross,
  Bus,
  HandFist,
  Gear,
} from '@phosphor-icons/react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NavItem {
  /** Display label in the sidebar / nav */
  label: string
  /** Route path (e.g. /dashboard/canteen/menu) */
  href: string
  /** Phosphor icon component */
  icon: ElementType
  /** RoutePermissionMap equivalent — empty / undefined = always visible */
  permissions?: string[]
}

/**
 * Mobile tab configuration per role.
 * - `primary`: Tabs shown directly in the bottom nav (max ~4).
 * - `overflow`: Tabs hidden behind a "More" sheet.
 */
export interface MobileTabConfig {
  primary: { label: string; href: string; icon: ElementType }[]
  overflow: { label: string; href: string; icon: ElementType }[]
}

export interface ModuleDefinition {
  /** Unique module identifier (e.g. "canteen", "library") — used in route paths */
  id: string
  /** Human-readable module name */
  label: string
  /** Phosphor icon for the module tab */
  icon: ElementType
  /** Tailwind text-colour class for the module tab accent (e.g. "text-orange-500") */
  color: string
  /** Roles that are allowed to see/use this module */
  roles: Role[]
  /** Sidebar nav items keyed by role slug — each role gets its own set of links */
  navItems: Record<string, NavItem[]>
  /** Optional mobile bottom-nav configuration per role */
  mobileNav?: Record<string, MobileTabConfig>
}

// ─── Canteen Module ──────────────────────────────────────────────────────────

const canteenModule: ModuleDefinition = {
  id: 'canteen',
  label: 'Canteen',
  icon: ForkKnife,
  color: 'text-orange-500',
  roles: ['admin', 'manager', 'staff', 'faculty', 'student'],
  navItems: {
    admin: [
      { label: 'Dashboard', href: '/dashboard/canteen', icon: House },
      { label: 'Menu', href: '/dashboard/canteen/menu', icon: ForkKnife, permissions: ['menu.manage'] },
      { label: 'Orders', href: '/dashboard/canteen/orders', icon: Receipt, permissions: ['orders.view_all'] },
      { label: 'Credits', href: '/dashboard/canteen/credits', icon: CreditCard, permissions: ['credits.manage'] },
      { label: 'Reports', href: '/dashboard/canteen/reports', icon: ChartBar, permissions: ['reports.view'] },
    ],
    manager: [
      { label: 'Dashboard', href: '/dashboard/canteen', icon: House },
      { label: 'Menu', href: '/dashboard/canteen/menu', icon: ForkKnife, permissions: ['menu.view'] },
      { label: 'Inventory', href: '/dashboard/canteen/inventory', icon: PackageIcon, permissions: ['menu.manage'] },
      { label: 'Orders', href: '/dashboard/canteen/orders', icon: Receipt, permissions: ['orders.view_all'] },
      { label: 'Credits', href: '/dashboard/canteen/credits', icon: CreditCard, permissions: ['credits.manage'] },
      { label: 'Salary', href: '/dashboard/canteen/salary', icon: Wallet, permissions: ['credits.manage'] },
      { label: 'Reports', href: '/dashboard/canteen/reports', icon: ChartBar, permissions: ['reports.view'] },
    ],
    staff: [
      { label: 'Counter', href: '/dashboard/canteen/staff', icon: ShoppingCart, permissions: ['orders.process'] },
      { label: 'Orders', href: '/dashboard/canteen/staff/orders', icon: Receipt, permissions: ['orders.view_own'] },
    ],
    faculty: [
      { label: 'Menu', href: '/dashboard/canteen/faculty/menu', icon: ForkKnife, permissions: ['menu.view'] },
      { label: 'Place Order', href: '/dashboard/order', icon: ShoppingCart },
      { label: 'My Orders', href: '/dashboard/canteen/faculty/orders', icon: Receipt, permissions: ['orders.view_own'] },
      { label: 'My Credits', href: '/dashboard/canteen/faculty/credits', icon: CreditCard, permissions: ['credits.view_own'] },
    ],
    student: [
      { label: 'Menu', href: '/dashboard/canteen/student/menu', icon: ForkKnife, permissions: ['menu.view'] },
      { label: 'Place Order', href: '/dashboard/order', icon: ShoppingCart },
      { label: 'My Orders', href: '/dashboard/canteen/student/orders', icon: Receipt, permissions: ['orders.view_own'] },
    ],
  },
}

// ─── Library Module ──────────────────────────────────────────────────────────

const libraryModule: ModuleDefinition = {
  id: 'library',
  label: 'Library',
  icon: BookOpen,
  color: 'text-blue-500',
  roles: ['admin', 'manager', 'faculty', 'student'],
  navItems: {
    admin: [
      { label: 'Dashboard', href: '/dashboard/library', icon: House },
      { label: 'Books', href: '/dashboard/library/books', icon: Books, permissions: ['library.manage_books'] },
      { label: 'Borrowing', href: '/dashboard/library/borrowing', icon: Clock, permissions: ['library.manage_borrowing'] },
      { label: 'Members', href: '/dashboard/library/members', icon: Users, permissions: ['library.manage_borrowing'] },
      { label: 'Fines', href: '/dashboard/library/fines', icon: CurrencyDollar, permissions: ['library.manage_fines'] },
      { label: 'Reports', href: '/dashboard/library/reports', icon: ChartBar, permissions: ['library.view_reports'] },
    ],
    manager: [
      { label: 'Dashboard', href: '/dashboard/library', icon: House },
      { label: 'Books', href: '/dashboard/library/books', icon: Books, permissions: ['library.manage_books'] },
      { label: 'Borrowing', href: '/dashboard/library/borrowing', icon: Clock, permissions: ['library.manage_borrowing'] },
      { label: 'Members', href: '/dashboard/library/members', icon: Users, permissions: ['library.manage_borrowing'] },
      { label: 'Fines', href: '/dashboard/library/fines', icon: CurrencyDollar, permissions: ['library.manage_fines'] },
      { label: 'Reports', href: '/dashboard/library/reports', icon: ChartBar, permissions: ['library.view_reports'] },
    ],
    faculty: [
      { label: 'Browse Books', href: '/dashboard/library/faculty/books', icon: Books, permissions: ['library.browse'] },
      { label: 'My Borrowings', href: '/dashboard/library/faculty/borrowings', icon: Clock, permissions: ['library.borrow'] },
    ],
    student: [
      { label: 'Browse Books', href: '/dashboard/library/student/books', icon: Books, permissions: ['library.browse'] },
      { label: 'My Borrowings', href: '/dashboard/library/student/borrowings', icon: Clock, permissions: ['library.borrow'] },
    ],
  },
}

// ─── Central Registry ────────────────────────────────────────────────────────

/**
 * The master registry of all modules.
 *
 * To add a new module (e.g. "classroom", "accounting", "guidance"):
 *   1. Create a `ModuleDefinition` object.
 *   2. Add it to this record with its `id` as the key.
 *   3. Create the corresponding routes under `/dashboard/<module-id>/`.
 *   4. Update `proxy.ts`'s `roleRoutes` if needed for route access control.
 */
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  canteen: canteenModule,
  library: libraryModule,
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Returns all modules that a given role can access, sorted alphabetically.
 *
 * @example
 *   getModulesForRole('faculty')
 *   // → [canteenModule, libraryModule]
 *
 *   getModulesForRole('staff')
 *   // → [canteenModule]  (staff can't access library)
 */
export function getModulesForRole(role: Role): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m) => m.roles.includes(role))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Returns nav items for a specific module + role, filtered by the user's
 * effective permissions. Items without a `permissions` array are always shown.
 *
 * @param moduleId  The module identifier (e.g. "canteen", "library")
 * @param role      The user's role slug
 * @param permissions  The user's effective permission strings
 *
 * @example
 *   getNavItemsForModule('canteen', 'manager', ['menu.view', 'orders.view_all'])
 *   // → [Dashboard, Menu, Orders]  (Inventory, Credits, Salary, Reports filtered out)
 */
export function getNavItemsForModule(
  moduleId: string,
  role: string,
  permissions: string[],
): NavItem[] {
  const mod = MODULE_REGISTRY[moduleId]
  if (!mod) return []

  const items = mod.navItems[role]
  if (!items) return []

  return items.filter((item: NavItem) => {
    if (!item.permissions || item.permissions.length === 0) return true
    return item.permissions.some((p) => permissions.includes(p))
  })
}

/**
 * Detects which module is currently active based on the URL pathname.
 *
 * Route pattern:  /dashboard/<module-id>/...
 *
 * @returns The module ID string (e.g. "canteen", "library") or `null` if
 *          the pathname doesn't correspond to a registered module.
 *
 * @example
 *   getActiveModule('/dashboard/canteen/menu')   // → "canteen"
 *   getActiveModule('/dashboard/library/books')  // → "library"
 *   getActiveModule('/dashboard/order')          // → null
 *   getActiveModule('/dashboard/admin')          // → null
 */
export function getActiveModule(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)

  // Expect /dashboard/<module-id>/...
  if (parts.length >= 2 && parts[0] === 'dashboard') {
    const candidate = parts[1]
    if (MODULE_REGISTRY[candidate]) {
      return candidate
    }
  }

  return null
}

/**
 * Returns the first accessible module for a given role.
 * Useful for redirect logic (e.g. after login, send user to their first module).
 *
 * @example
 *   getPrimaryModuleForRole('faculty')  // → canteenModule  (sorted: canteen, library)
 */
export function getPrimaryModuleForRole(role: Role): ModuleDefinition | null {
  const modules = getModulesForRole(role)
  return modules.length > 0 ? modules[0] : null
}

/**
 * Returns the default dashboard route for a given role within a specific module,
 * or the role's current implicit home if no module match.
 *
 * @example
 *   getModuleHome('canteen', 'admin')   // → "/dashboard/canteen"
 *   getModuleHome('library', 'faculty') // → "/dashboard/library/faculty/books"
 */
export function getModuleHome(moduleId: string, role: string): string | null {
  const items = getNavItemsForModule(moduleId, role, [])
  return items.length > 0 ? items[0].href : null
}

/**
 * Resolves a module-aware page title from a pathname.
 * Extends the existing `getDashboardTitle` from `@/lib/titles` with module context.
 *
 * @example
 *   getModuleTitle('/dashboard/canteen/menu')   // → "Menu Management"
 *   getModuleTitle('/dashboard/library/books')  // → "Books"
 */
const moduleTitles: Record<string, string> = {
  canteen: 'Canteen',
  library: 'Library',
}

/**
 * Resolves a module-aware page title from a pathname.
 * Falls back to the existing `getDashboardTitle` from `@/lib/titles`.
 *
 * @example
 *   getModuleTitle('/dashboard/canteen/menu')   // → "Menu Management"
 *   getModuleTitle('/dashboard/library/books')  // → "Browse Books"
 */
export function getModuleTitle(pathname: string): string {
  const activeModule = getActiveModule(pathname)
  if (activeModule && moduleTitles[activeModule]) {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 2) {
      // At the module root → return module label
      const mod = MODULE_REGISTRY[activeModule]
      return mod?.label ?? moduleTitles[activeModule]
    }
  }
  // Fall back to existing title resolver (lazy-loaded to avoid circular deps if titles.ts ever imports from modules)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getDashboardTitle } = require('@/lib/titles') as { getDashboardTitle: (p: string) => string }
  return getDashboardTitle(pathname)
}
