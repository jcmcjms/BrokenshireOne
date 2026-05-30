# BrokenshireOne

**Brokenshire College Toril — One platform for all departments.**

BrokenshireOne is a full-stack canteen management system purpose-built for Brokenshire College Toril. It replaces manual order-taking, paper credit tracking, and disconnected spreadsheets with a single, role-based web application that students, faculty, staff, managers, and administrators use every day.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema](#database-schema)
- [Route Map](#route-map)
- [Feature Deep-Dive](#feature-deep-dive)
- [UI / UX](#ui--ux)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Supabase Heartbeat](#supabase-heartbeat)
- [Migration History](#migration-history)

---

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js | 16.2.6, App Router |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui | Radix-Lyra style, custom theme |
| Icons | Phosphor Icons | 2.1.10 |
| Animation | Motion | 12.40.0 (formerly framer-motion) |
| Database | Supabase (PostgreSQL) | Serverless, RLS-enabled |
| Auth | Custom JWT | jsonwebtoken + bcryptjs, httpOnly cookies |
| Fonts | Geist (sans), Geist Mono, JetBrains Mono | Variable fonts |
| Package Manager | npm | -- |
| QR Code | qrcode.react | 4.x |
| Barcode | html5-qrcode | Client-side scanning |
| Toast Notifications | Sonner | 2.x |
| Spreadsheet | xlsx | 0.18.5 (menu import/export) |
| Classnames | clsx + tailwind-merge | Through `cn()` utility |
| CI/CD | GitHub Actions | Heartbeat workflow |
| Hosting | Vercel | -- |

---

## Architecture Overview

### Frontend

BrokenshireOne uses Next.js 16's App Router with a **client-heavy** architecture. All dashboard pages, the login form, and the order placement page are `"use client"` components. The root layout is the only server component — it sets up fonts, the `TooltipProvider`, and a `PageWrapper` animation wrapper.

Every dashboard subpage fetches its data client-side by calling the REST API routes, which means the app behaves more like a Single Page Application (SPA) with server-side API endpoints, rather than a traditional server-rendered Next.js app.

### Backend

The backend is entirely API-driven:

- **Next.js API routes** (`app/api/`) serve as the REST layer. Each route handler imports a Supabase server client, executes queries, and returns JSON.
- **Supabase (PostgreSQL)** stores all data. Two client patterns exist:
  - **Browser client** (`lib/supabase/browser.ts`) — uses the anon key, can be imported in client components, respects Row-Level Security (RLS).
  - **Server client** (`lib/supabase/client.ts`) — uses the service_role key, can only be imported in API route handlers and server components, bypasses RLS. Includes a resilient stub client that surfaces missing-env errors through normal query channels instead of crashing at import time.
- **Custom JWT authentication** handles sessions, not Supabase Auth. This was chosen to keep full control over the auth flow and avoid Supabase Auth's opinionated session model.

### Middleware

The Next.js middleware (`proxy.ts`) sits between every request and the page/API handler:

1. Public routes (`/login`, `/api/auth/*`) pass through immediately.
2. API routes pass through (they authenticate themselves).
3. Dashboard routes without a valid `session_token` cookie are redirected to `/login`.
4. Dashboard routes with a valid token are checked against a role-route map. If the user's role does not have access, they are redirected to their role-specific dashboard.
5. Static files (`_next/static`, `favicon.ico`, etc.) pass through.

### Auth Flow

```
User → Login Page → POST /api/auth/login → Verify employee_id + password (bcrypt)
  → Sign JWT { user_id, email, role, permissions } → Set httpOnly cookie (24h)
  → Redirect to role-specific dashboard

Subsequent requests:
  → Middleware reads session_token cookie
  → Verifies JWT signature
  → Allows or redirects based on role + route permissions

Logout:
  → POST /api/auth/logout → Clear cookie → Redirect to /login
```

---

## Authentication & Authorization

### Custom JWT Authentication

BrokenshireOne does **not** use Supabase Auth. Instead, it implements a custom authentication layer:

| Component | File | Purpose |
|-----------|------|---------|
| JWT Signing | `lib/auth/jwt.ts` | `signToken()` creates JWTs with `jsonwebtoken`, 24h expiry |
| JWT Verification | `lib/auth/jwt.ts` | `verifyToken()` decodes and validates the JWT |
| Session Management | `lib/auth/session.ts` | `setSession()` / `getSession()` / `clearSession()` manage httpOnly cookies |
| Password Hashing | `lib/auth/password.ts` | bcryptjs for hash/compare |
| Auth API | `app/api/auth/login/route.ts` | Login endpoint: verifies credentials, signs token, sets cookie |
| Auth API | `app/api/auth/me/route.ts` | Returns the current user from the session cookie |

The JWT payload contains:

```typescript
interface JwtPayload {
  user_id: string;
  email: string;
  role: Role;         // 'admin' | 'manager' | 'staff' | 'faculty' | 'student'
  role_id: string;
  permissions: string[];  // Resolved permission codes
  iat?: number;
  exp?: number;
}
```

### Role-Based Access Control (RBAC)

Five roles with hierarchical permissions:

| Role | Default Dashboard | Access Scope |
|------|-------------------|--------------|
| `admin` | `/dashboard/admin` | Full system access, user management, settings |
| `manager` | `/dashboard/manager` | Menu, inventory, orders, credits, reports, salary |
| `staff` | `/dashboard/staff` | Order processing (counter), own order history |
| `faculty` | `/dashboard/faculty` | Menu browsing, own orders, own credits |
| `student` | `/dashboard/student` | Menu browsing, own orders |

### Permission System

Permissions are encoded as `module.action` strings:

| Code | Description |
|------|-------------|
| `menu.view` | View menu categories and items |
| `menu.manage` | Create, update, delete menu items and inventory |
| `orders.view_all` | View all orders (manager/admin) |
| `orders.view_own` | View own orders (faculty/student/staff) |
| `orders.process` | Process orders at the counter (staff) |
| `users.manage` | Create, update, deactivate users (admin) |
| `credits.manage` | Manage credit allowances and deductions (manager/admin) |
| `credits.view_own` | View own credit usage (faculty) |
| `reports.view` | View sales reports (manager/admin) |

Permission resolution follows a three-layer model:

1. **Role-based permissions** — every role has a set of permissions via `role_permissions`.
2. **User overrides** — the `user_permissions` table allows granting or denying specific permissions to individual users, overriding their role defaults.
3. **Effective permissions** — merged at login time and embedded in the JWT. Route-level permission checks use the `routePermissionMap` in `app/dashboard/layout.tsx` to conditionally show/hide navigation items.

### Middleware Route Protection

The middleware (`proxy.ts`) enforces access at the route level:

```typescript
const roleRoutes: Record<string, string[]> = {
  admin:   ['/dashboard/admin'],
  manager: ['/dashboard/manager', '/dashboard'],
  staff:   ['/dashboard/staff', '/dashboard'],
  faculty: ['/dashboard/faculty', '/dashboard', '/dashboard/order'],
  student: ['/dashboard/student', '/dashboard', '/dashboard/order'],
};
```

If a user navigates to a dashboard route outside their allowed set, they are redirected to their role-specific dashboard.

---

## Database Schema

All tables live in the `public` schema of a Supabase (PostgreSQL) project. UUIDs are generated with `gen_random_uuid()`.

### Tables

#### roles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default `gen_random_uuid()` |
| name | TEXT | NOT NULL, UNIQUE |
| description | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

#### permissions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| code | TEXT | NOT NULL, UNIQUE |
| description | TEXT | NOT NULL |
| module | TEXT | NOT NULL |

#### role_permissions
Junction table linking roles to permissions.
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| role_id | UUID | FK → roles(id), ON DELETE CASCADE |
| permission_id | UUID | FK → permissions(id), ON DELETE CASCADE |
| UNIQUE(role_id, permission_id) |

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| role_id | UUID | FK → roles(id), ON DELETE RESTRICT |
| employee_id | TEXT | nullable |
| monthly_credit_limit | NUMERIC(10,2) | NOT NULL, default 0 |
| active | BOOLEAN | NOT NULL, default TRUE |
| avatar_url | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated via trigger |

#### menu_categories
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| sort_order | INTEGER | NOT NULL, default 0 |
| active | BOOLEAN | NOT NULL, default TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated |

#### menu_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| category_id | UUID | FK → menu_categories(id), ON DELETE RESTRICT |
| name | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| price | NUMERIC(10,2) | NOT NULL |
| unit | TEXT | NOT NULL (e.g. serving, piece, bottle) |
| image_url | TEXT | nullable |
| available | BOOLEAN | NOT NULL, default TRUE |
| stock_quantity | INTEGER | NOT NULL, default 0 |
| barcode | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated |

#### orders
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_number | TEXT | NOT NULL, UNIQUE |
| user_id | UUID | FK → users(id), ON DELETE RESTRICT |
| staff_id | UUID | FK → users(id), ON DELETE SET NULL, nullable |
| status | TEXT | NOT NULL, CHECK IN ('pending', 'completed', 'cancelled') |
| total | NUMERIC(10,2) | NOT NULL |
| payment_method | TEXT | NOT NULL, CHECK IN ('cash', 'card', 'credit') |
| cash_given | NUMERIC(10,2) | nullable |
| change_amount | NUMERIC(10,2) | nullable |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated |

#### order_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → orders(id), ON DELETE CASCADE |
| item_id | UUID | FK → menu_items(id), ON DELETE RESTRICT |
| quantity | INTEGER | NOT NULL |
| unit_price | NUMERIC(10,2) | NOT NULL |

#### payments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → orders(id), ON DELETE RESTRICT |
| amount | NUMERIC(10,2) | NOT NULL |
| method | TEXT | NOT NULL, CHECK IN ('cash', 'card') |
| reference | TEXT | nullable |
| paid_at | TIMESTAMPTZ | NOT NULL, default NOW() |

#### credit_allowances
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), ON DELETE CASCADE |
| month | INTEGER | NOT NULL, CHECK 1-12 |
| year | INTEGER | NOT NULL |
| limit_amount | NUMERIC(10,2) | NOT NULL |
| used_amount | NUMERIC(10,2) | NOT NULL, default 0 |
| UNIQUE(user_id, month, year) |

#### credit_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), ON DELETE CASCADE |
| order_id | UUID | FK → orders(id), ON DELETE SET NULL, nullable |
| amount | NUMERIC(10,2) | NOT NULL |
| type | TEXT | NOT NULL, CHECK IN ('meal', 'deduction', 'adjustment') |
| month | INTEGER | NOT NULL, CHECK 1-12 |
| year | INTEGER | NOT NULL |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |

#### inventory_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| category | TEXT | NOT NULL, CHECK IN ('produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other') |
| quantity | DECIMAL | NOT NULL, default 0 |
| unit | TEXT | NOT NULL |
| min_stock_level | DECIMAL | NOT NULL, default 0 |
| unit_cost | DECIMAL | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated |

#### inventory_movements
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| item_id | UUID | FK → inventory_items(id), ON DELETE CASCADE |
| type | TEXT | NOT NULL, CHECK IN ('addition', 'removal', 'adjustment') |
| quantity_change | DECIMAL | NOT NULL |
| previous_quantity | DECIMAL | NOT NULL |
| new_quantity | DECIMAL | NOT NULL |
| reason | TEXT | nullable |
| performed_by | UUID | FK → users(id), ON DELETE RESTRICT |
| created_at | TIMESTAMPTZ | NOT NULL |

#### user_permissions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), ON DELETE CASCADE |
| permission_id | UUID | FK → permissions(id), ON DELETE CASCADE |
| is_granted | BOOLEAN | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

#### salary_deduction_limits
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), ON DELETE CASCADE |
| month | INTEGER | NOT NULL, CHECK 1-12 |
| year | INTEGER | NOT NULL |
| max_deduction_limit | NUMERIC(10,2) | NOT NULL |
| total_deducted | NUMERIC(10,2) | NOT NULL, default 0 |
| UNIQUE(user_id, month, year) |

#### salary_deductions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), ON DELETE CASCADE |
| amount | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| deduction_type | TEXT | NOT NULL, CHECK IN ('loan', 'uniform', 'damages', 'other') |
| reason | TEXT | nullable |
| month | INTEGER | NOT NULL, CHECK 1-12 |
| year | INTEGER | NOT NULL |
| created_by | UUID | FK → users(id), ON DELETE RESTRICT |
| created_at | TIMESTAMPTZ | NOT NULL |

#### notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id), NOT NULL |
| type | TEXT | NOT NULL, CHECK IN ('new_order', 'order_confirmed', 'order_cancelled', 'low_stock') |
| title | TEXT | NOT NULL |
| message | TEXT | NOT NULL |
| data | JSONB | default '{}' |
| read | BOOLEAN | default FALSE |
| created_at | TIMESTAMPTZ | default NOW() |

### Row-Level Security (RLS) Summary

| Table | RLS Enabled | Policy |
|-------|-------------|--------|
| notifications | YES | Users can SELECT/UPDATE their own notifications |
| salary_deduction_limits | YES | All authenticated users can SELECT |
| salary_deductions | YES | All authenticated users can SELECT |
| Other tables | YES | Varies by table — standard ownership patterns |

### Indexes

Key indexes beyond PKs:

- `idx_inventory_items_category`, `idx_inventory_items_updated_at`
- `idx_inventory_movements_item_id`, `idx_inventory_movements_created_at`
- `idx_salary_deduction_limits_user_id`, `idx_salary_deduction_limits_month_year`
- `idx_salary_deductions_user_id`, `idx_salary_deductions_month_year`, `idx_salary_deductions_deduction_type`, `idx_salary_deductions_created_by`
- `idx_notifications_user_unread` — composite index on (user_id, read, created_at desc)

---

## Route Map

### Public Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Redirects to `/login` |
| `/login` | GET | Login page (employee_id + password form) |

### Dashboard Routes

#### Admin (`/dashboard/admin/*`)
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/admin` | Always visible | Admin overview with system stats |
| `/dashboard/admin/users` | `users.manage` | User CRUD, role assignment, permission overrides |
| `/dashboard/admin/settings` | Always visible | System configuration |

#### Manager (`/dashboard/manager/*`)
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/manager` | Always visible | Key metrics dashboard |
| `/dashboard/manager/menu` | `menu.view` | Menu categories and items CRUD |
| `/dashboard/manager/inventory` | `menu.manage` | Inventory stock tracking, movements, low-stock alerts |
| `/dashboard/manager/orders` | `orders.view_all` | All orders with filtering and status management |
| `/dashboard/manager/credits` | `credits.manage` | Monthly credit allowance management |
| `/dashboard/manager/reports` | `reports.view` | Sales reports and analytics |
| `/dashboard/manager/salary` | `credits.manage` | Salary deduction limits and entries |

#### Staff (`/dashboard/staff/*`)
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/staff` | `orders.process` | Staff counter — process customer orders |
| `/dashboard/staff/orders` | `orders.view_own` | Staff order history |

#### Faculty (`/dashboard/faculty/*`)
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/faculty` | Always visible | Faculty dashboard |
| `/dashboard/faculty/orders` | `orders.view_own` | Own order history |
| `/dashboard/faculty/credits` | `credits.view_own` | Own credit usage and remaining balance |
| `/dashboard/faculty/menu` | `menu.view` | Browse menu items by category |

#### Student (`/dashboard/student/*`)
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/student` | Always visible | Student dashboard |
| `/dashboard/student/menu` | `menu.view` | Browse menu items |
| `/dashboard/student/orders` | `orders.view_own` | Own order history |

#### Shared
| Route | Permission | Description |
|-------|-----------|-------------|
| `/dashboard/order` | Always visible | Universal order placement with cart, barcode scanner, payment |

### API Routes

#### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Authenticate with employee_id + password, sets session cookie |
| POST | `/api/auth/logout` | Clears session cookie |
| GET | `/api/auth/me` | Returns current user from session |

#### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/users/[id]` | Get or update a user |
| GET/PUT | `/api/users/[id]/permissions` | Get or update user permission overrides |
| GET | `/api/users/stream` | Server-Sent Events stream for user changes |

#### Menu
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/menu/categories` | List or create categories |
| PUT/DELETE | `/api/menu/categories/[id]` | Update or delete a category |
| GET/POST | `/api/menu/items` | List or create menu items |
| PUT/DELETE | `/api/menu/items/[id]` | Update or delete a menu item |
| GET | `/api/menu/export` | Export menu items to Excel (.xlsx) |
| POST | `/api/menu/import` | Import menu items from Excel (.xlsx) |

#### Orders
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/orders/[id]` | Get or update an order |
| GET | `/api/orders/stream` | SSE stream for real-time order updates |

#### Credits
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/credits/allowances` | List or create credit allowances |
| GET | `/api/credits/stream` | SSE stream for credit changes |

#### Payments
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/payments` | Record a payment against an order |

#### Inventory
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/inventory/items` | List or create inventory items |
| PUT/DELETE | `/api/inventory/items/[id]` | Update or delete an inventory item |
| GET | `/api/inventory/items/[id]/movements` | Get movement history for an item |
| GET | `/api/inventory/movements` | List all inventory movements |
| GET | `/api/inventory/low-stock` | Get low-stock items (inventory + menu items) |

#### Dashboard
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/stats` | Aggregated dashboard statistics |

#### Notifications
| Method | Route | Description |
|--------|-------|-------------|
| PUT | `/api/notifications/[id]` | Mark notification as read |

#### Permissions
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/permissions` | List all available permission codes |

#### Roles
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/roles` | List all roles |

#### Salary
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/salary/deductions` | List or create salary deductions |
| GET/POST | `/api/salary/limits` | List or create salary deduction limits |
| GET | `/api/salary/stream` | SSE stream for salary changes |

#### Upload
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload` | Upload a file/image |

#### Heartbeat
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/heartbeat` | Keep Supabase free-tier project alive |

---

## Feature Deep-Dive

### 1. Role-Based Access Control (RBAC)

RBAC operates at three enforcement layers:

**Layer 1 — Middleware (route-level)**
The Next.js middleware (`proxy.ts`) intercepts every dashboard request. If the user's role does not match the route pattern, they are redirected to their role-appropriate dashboard. This prevents URL-based privilege escalation.

**Layer 2 — Navigation (UI-level)**
The dashboard sidebar is dynamically built from `navConfig[role]` in `app/dashboard/layout.tsx`. Each nav item is then filtered through `canSeeNavItem()`, which checks the user's resolved permissions against a `routePermissionMap`. A user cannot see a nav link they do not have permission for.

**Layer 3 — API (data-level)**
API routes check the JWT payload's `role` and `permissions` before returning data. Staff cannot access manager-level data even if they know the API URL.

### 2. Order Placement System

The `/dashboard/order` page is the universal order placement interface used by all roles.

**Flow:**
1. User browses menu items by category or searches by name.
2. Items are added to a cart with quantity adjustment (+/- buttons, delete).
3. Barcode input field for quick item lookup.
4. Order summary shows subtotal with per-item quantities and prices.
5. Payment method selection:
   - **Cash** — staff enters cash_given, system calculates change.
   - **Card** — records card payment.
   - **Credit** — deducts from the user's monthly credit allowance.
6. On place order, the system:
   - Creates an order record.
   - Creates order_items.
   - Records payment.
   - If credit: creates a credit_transaction of type 'meal' and updates used_amount.
   - Creates a notification for staff/manager (if cash order).
   - Sends real-time updates via Supabase Realtime.
7. Order confirmation displays order number and QR code.

**Cart state:** Managed client-side as `CartItem[]` with `cartQuantity` field.

### 3. Meal Credits System

Faculty and staff receive monthly meal credit allowances. Students do not receive credits.

**Key behaviors:**
- Monthly credit allowances are set by managers/admin (`credit_allowances` table).
- `used_amount` tracks how much of the allowance has been consumed.
- When an order is placed with `payment_method = 'credit'`, a `credit_transaction` of type 'meal' is created and `used_amount` is incremented.
- Faculty can view their remaining balance on the `/dashboard/faculty/credits` page.
- Managers can view all credit allowances, adjust limits, and see usage reports.
- Deductions (from salary) and manual adjustments are tracked as separate transaction types.

### 4. Inventory Management

Managers can track physical inventory stock and its relationship to menu items.

**Features:**
- **Inventory items** with categories (produce, meat, dairy, dry_goods, beverage, other).
- **Full audit trail** — every stock change records previous/new quantity, performer, and reason.
- **Low-stock alerts** — the dashboard shows items where `quantity < min_stock_level`, including both inventory items and menu items with low `stock_quantity`.
- **Unit cost tracking** — optional, for cost analysis.
- **Adjustment dialogs** — add stock, remove stock, or set precise quantities with reason capture.

### 5. Salary Deductions

Managers can set up monthly salary deduction limits and record individual deductions.

**Key behaviors:**
- Each user has a monthly `max_deduction_limit` and `total_deducted` counter.
- Deductions are typed: loan, uniform, damages, other.
- The system prevents exceeding the monthly limit.
- All deductions are audited with `created_by` tracking.
- Deduction limits are scoped to `(user_id, month, year)`.

### 6. Real-Time Notifications

Powered by Supabase Realtime publication on the `notifications` table.

**Notification types:**
- `new_order` — broadcast when a cash order is placed (targets staff/manager).
- `order_confirmed` — when staff processes an order.
- `order_cancelled` — when an order is cancelled.
- `low_stock` — triggered when inventory runs low.

**Client-side architecture:**
- `NotificationProvider` wraps the dashboard layout and subscribes to Realtime channels.
- `NotificationBellWidget` shows the unread count with a badge.
- `NotificationPanel` lists notifications with mark-as-read.
- `NotificationToast` shows a brief popup for each new notification.

### 7. Menu Management

Managers can fully manage the canteen menu:

- **Categories** — create, reorder (sort_order), activate/deactivate.
- **Items** — name, description, price, unit, barcode, image, availability, stock quantity.
- **Bulk import/export** via Excel (.xlsx) using the `xlsx` library.
- **Units** — standardized unit list: serving, piece, pack, bottle, can, cup, glass, slice, bowl, plate.
- **Default units** per category (e.g., Meals → serving, Beverages → bottle).

### 8. User Management

Admin-only feature for managing system users:

- Create users with name, email, employee_id, role, monthly credit limit.
- Edit user details and deactivate accounts.
- Manage role assignments.
- **Permission overrides** — grant or deny specific permissions to individual users via the `PermissionDialog` component, overriding their role defaults.

### 9. Excel Import/Export

Menu data can be exchanged with spreadsheets:

- **Export** (`GET /api/menu/export`) — downloads all menu items as an .xlsx file.
- **Import** (`POST /api/menu/import`) — uploads an .xlsx file to bulk-create or update menu items.
- Useful for initial data loading, seasonal menu changes, or batch updates.

---

## UI / UX

### Component Library

The project uses **shadcn/ui** with a custom "Radix-Lyra" style. Components are installed individually under `components/ui/` and customized for the BrokenshireOne design system.

**Design decisions:**
- **Icons** — All icons come from `@phosphor-icons/react`. No other icon library is used. This ensures visual consistency across the entire application.
- **Formatting** — The `formatPrice()` utility uses the "PHP" prefix instead of the peso sign (₱) because the peso sign (U+20B1) is missing from most common fonts (Inter, system UI), which causes uneven font fallback rendering.
- **Typography** — Three fonts are loaded: Geist (body), Geist Mono (monospace), and JetBrains Mono (code/mono alternative).
- **Animations** — Motion (formerly framer-motion) powers page transitions, logout overlays, and subtle UI animations.

### Mobile Responsiveness

The application has a **dual-layout strategy**:

| Viewport | Navigation | Layout |
|----------|-----------|--------|
| Desktop (md+) | Sidebar (w-48) | Full dashboard with header, sidebar, content area |
| Mobile (<md) | Bottom navigation tab bar | `MobileLayout` wrapper with role-specific tabs |

**Mobile components (24 files):**
- `MobileLayout` — wraps mobile pages with bottom nav and top bar
- `MobileDashboardShell` — consistent mobile page layout
- Role-specific dashboards: `MobileAdminDashboard`, `MobileManagerDashboard`, `MobileFacultyDashboard`, `MobileStudentDashboard`
- `MobileOrderPage` — touch-optimized ordering
- `MobileCartSheet` — slide-up cart on mobile
- `MobileOrdersList / MobileOrdersPage` — order views for mobile
- `BottomNav` — configurable per role with `primary` and `overflow` tabs
- `SwipeableRow` — swipe gestures for mobile interactions
- `DataCard` — compact stat display cards

The breakpoint detection uses the `useMobile()` hook, which enables server-render-friendly mobile/desktop decisions.

### Accessibility

- Semantic HTML structure
- shadcn/ui components include ARIA attributes by default
- TooltipProvider wraps all tooltip-enabled elements
- Form inputs have proper labels and error states
- Keyboard navigation supported on all interactive elements

---

## Project Structure

```
canteen_management/
├── app/
│   ├── api/                          # REST API routes
│   │   ├── auth/                     # login, logout, me
│   │   ├── credits/                  # allowances, stream
│   │   ├── dashboard/                # stats
│   │   ├── heartbeat/                # Supabase keep-alive
│   │   ├── inventory/                # items, movements, low-stock
│   │   ├── menu/                     # categories, items, export, import
│   │   ├── notifications/            # mark as read
│   │   ├── orders/                   # CRUD, stream
│   │   ├── payments/                 # record payment
│   │   ├── permissions/              # list all
│   │   ├── roles/                    # list all
│   │   ├── salary/                   # deductions, limits, stream
│   │   ├── upload/                   # file upload
│   │   └── users/                    # CRUD, permissions, stream
│   ├── dashboard/                    # Role-based dashboards
│   │   ├── admin/                    # overview, users, settings
│   │   ├── faculty/                  # overview, orders, credits, menu
│   │   ├── manager/                  # overview, menu, inventory, orders, credits, reports, salary
│   │   ├── order/                    # universal order placement
│   │   ├── staff/                    # counter, orders
│   │   ├── student/                  # overview, menu, orders
│   │   ├── layout.tsx                # dashboard shell with sidebar/nav
│   │   └── page.tsx                  # redirect to first role dashboard
│   ├── login/                        # authentication page
│   ├── favicon.ico
│   ├── globals.css                   # Tailwind + custom styles
│   ├── layout.tsx                    # root layout with fonts
│   └── page.tsx                      # redirects to /login
├── components/
│   ├── admin/                        # PermissionDialog
│   ├── animations/                   # PageWrapper
│   ├── inventory/                    # AddItemDialog, AdjustStockDialog, ItemDetailSheet
│   ├── mobile/                       # 24 mobile-specific components
│   ├── notifications/                # Provider, Bell, Panel, Toast
│   ├── ui/                           # shadcn/ui components
│   └── menu-viewer.tsx               # shared menu browser
├── lib/
│   ├── auth/                         # jwt.ts, password.ts, session.ts
│   ├── supabase/                     # browser.ts, client.ts, notifications.ts, queries.ts
│   ├── realtime/                     # (future use)
│   ├── units.ts                      # menu unit constants
│   └── utils.ts                      # cn(), formatPrice(), formatRelativeTime()
├── modules/
│   ├── canteen/                      # credits, dashboard, menu, orders, payments
│   └── core/                         # auth, rbac, ui
├── scripts/
│   ├── heartbeat.mjs                 # Supabase keep-alive script
│   ├── check-db.mjs                  # database diagnostics
│   ├── deploy.ps1                    # deployment script
│   ├── seed.mjs                      # database seed data
│   └── test-login.mjs                # login test helper
├── supabase/
│   └── migrations/                   # 9 SQL migrations
├── types/                            # TypeScript interfaces
│   ├── database.ts                   # Db* row types for all tables
│   └── index.ts                      # UI types, API responses, enums
├── docs/
│   ├── heartbeat.md                  # Heartbeat system documentation
│   └── brokenshireone.md             # This file
├── .env.local                        # Environment variables (gitignored)
├── .github/
│   └── workflows/
│       └── heartbeat.yml             # GitHub Actions heartbeat workflow
├── proxy.ts                          # Next.js middleware
├── next.config.ts
├── package.json
├── tsconfig.json
└── components.json                   # shadcn/ui configuration
```

---

## Development

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier)
- A Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Custom JWT (must match Supabase JWT setting for RLS compatibility)
JWT_SECRET=<your-secret>
```

### Local Setup

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run heartbeat     # Run Supabase heartbeat check
npm run heartbeat:check  # Run database diagnostics
```

### Seed Data

The project includes a seed script at `scripts/seed.mjs` that populates the database with:

- 5 roles (admin, manager, staff, faculty, student)
- Permission codes for all features
- Test user accounts for each role

Run it directly with Node.js after setting up `.env.local`:

```bash
node scripts/seed.mjs
```

---

## Deployment

### Vercel

The project is designed for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set the following environment variables in the Vercel dashboard:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings > API > anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings > API > service_role key |
| `JWT_SECRET` | Custom secret (must match Supabase JWT setting) |

### Supabase

1. Create a new Supabase project.
2. Run all migrations in `supabase/migrations/` in order via the Supabase SQL Editor.
3. Enable Realtime on the `notifications` table in the Supabase dashboard.
4. Set the JWT Secret in **Project Settings > API > JWT Settings** to match your `JWT_SECRET`.
5. Run the seed script to populate initial data.

### Production Readiness

Before going live:

- [ ] Verify all RLS policies are correct for the production data model.
- [ ] Run the seed script to create roles, permissions, and test accounts.
- [ ] Test each role's dashboard access and permission enforcement.
- [ ] Verify the heartbeat system is active (see [docs/heartbeat.md](./heartbeat.md)).
- [ ] Confirm that the JWT secret in Supabase settings matches `.env.local`.
- [ ] Check that file/image uploads are working and stored in the Supabase storage bucket.
- [ ] Review error handling on all API routes — ensure 500 errors return useful messages without leaking internals.
- [ ] Test the Excel import/export flow end-to-end.

---

## Supabase Heartbeat

BrokenshireOne includes a heartbeat system to prevent the Supabase free-tier project from being auto-paused after 7 days of inactivity.

**Components:**
- **API endpoint** at `GET /api/heartbeat` — runs a lightweight DB query.
- **Standalone script** `scripts/heartbeat.mjs` — can be run locally or in CI.
- **GitHub Actions workflow** `.github/workflows/heartbeat.yml` — runs every 6 hours using two methods (API and script) in parallel.

For full details, including setup instructions, troubleshooting, and alternative cron services, see [docs/heartbeat.md](./heartbeat.md).

---

## Migration History

| # | File | Description |
|---|------|-------------|
| 1 | `00001_schema.sql` | Core schema: roles, permissions, role_permissions, users, menu_categories, menu_items, orders, order_items, payments, credit_allowances, credit_transactions, user_permissions. Extensions: uuid-ossp, pgcrypto. Trigger: `update_updated_at_column()`. |
| 2 | `00002_inventory.sql` | Inventory management: `inventory_items`, `inventory_movements` tables. Adds `stock_quantity` column to `menu_items`. Creates indexes. |
| 3 | `00003_user_permissions.sql` | Per-user permission override system. |
| 4 | `00004_storage_buckets.sql` | Storage buckets for image uploads (e.g., menu item photos, avatars). |
| 5 | `00005_add_barcode.sql` | Adds `barcode` column to `menu_items` for barcode scanning support. |
| 6 | `00006_add_unit.sql` | Adds `unit` column to `menu_items` for serving size tracking (e.g., serving, piece, bottle). |
| 7 | `00007_cash_payment.sql` | Adds `cash_given` and `change_amount` columns to `orders` for cash payment processing. |
| 8 | `00008_salary_deductions.sql` | HR features: `salary_deduction_limits`, `salary_deductions` tables with RLS policies and indexes. |
| 9 | `20260530_notifications.sql` | Real-time notifications: `notifications` table, publication for Supabase Realtime, RLS policies, unread query index. |
