# Canteen Management System — Design Document

## Overview
Modular canteen management system built on Next.js 16 + Supabase (DB only) + Custom JWT Auth + shadcn/ui. Designed from day one for future modules (Library, Classroom, Property Custodian, etc.).

## Architecture
- **Modules**: `core/` (shared auth, RBAC, UI) + `canteen/` (menu, orders, payments, credits)
- **Auth**: Custom JWT (no Supabase Auth). bcrypt password hashing, JWT with user_id + role + permissions.
- **Supabase**: Database only. Direct PostgreSQL queries via `@supabase/supabase-js` with service_role key on server.
- **RBAC**: Roles → Permissions (many-to-many). Middleware guards on every API route.

## Roles & Permissions

| Permission | Admin | Manager | Staff | Faculty | Student |
|---|---|---|---|---|---|
| users.manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| menu.manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| orders.process | ✅ | ✅ | ✅ | ❌ | ❌ |
| orders.view_all | ✅ | ✅ | ❌ | ❌ | ❌ |
| payments.process | ✅ | ✅ | ✅ | ❌ | ❌ |
| reports.view | ✅ | ✅ | ❌ | ❌ | ❌ |
| credits.manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| credits.view_own | ✅ | ✅ | ❌ | ✅ | ❌ |
| orders.view_own | ✅ | ✅ | ✅ | ✅ | ✅ |
| menu.view | ✅ | ✅ | ✅ | ✅ | ✅ |

## Salary Deduction (Faculty/Staff)
- Monthly credit limit set by Admin/Manager
- Faculty/Staff meals deducted from credit balance at counter
- Dashboard shows: remaining credit, total used, projected salary deduction
- Payroll deduction occurs when credit is consumed (tracked monthly)

## Schema
- **users**: id, name, email, password_hash, role_id, employee_id, monthly_credit_limit, active, created_at
- **roles**: id, name, description
- **permissions**: id, code, description
- **role_permissions**: role_id, permission_id
- **menu_categories**: id, name, sort_order, active
- **menu_items**: id, category_id, name, description, price, image, available
- **orders**: id, order_number, user_id, staff_id, status, total, payment_method, notes, created_at
- **order_items**: id, order_id, item_id, quantity, unit_price
- **payments**: id, order_id, amount, method, reference, paid_at
- **credit_allowances**: id, user_id, month, year, limit_amount, used_amount
- **credit_transactions**: id, user_id, order_id, amount, type, month, year, created_at

## Routes
- `/` — Public landing / login
- `/dashboard` — Role-based redirect
- `/dashboard/admin` — Users, roles, system settings
- `/dashboard/manager` — Menu, reports, credit management
- `/dashboard/staff` — Counter terminal, order processing
- `/dashboard/faculty` — My orders, credit balance
- `/dashboard/student` — My orders, pay at counter

## Tech Stack
- Next.js 16 (App Router)
- Supabase (PostgreSQL database only)
- Custom JWT (jsonwebtoken + bcryptjs)
- shadcn/ui (Lyra style) + Phosphor icons
- Tailwind CSS v4
