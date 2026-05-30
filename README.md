# BrokenshireOne

> A full-stack Canteen Management System for **Brokenshire College Toril**. One platform for all departments.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

---

## Overview

BrokenshireOne replaces manual order-taking, paper credit tracking, and disconnected spreadsheets with a single, role-based web application. The platform serves five distinct user groups -- administrators, managers, canteen staff, faculty, and students -- each with tailored views and permissions.

The system handles the full lifecycle of canteen operations: menu management with barcode support, order placement with multiple payment methods (cash, card, meal credits), inventory tracking with low-stock alerts, monthly credit allowances for faculty and staff, salary deduction management, and real-time notifications powered by Supabase Realtime.

Authentication uses a custom JWT implementation with httpOnly cookies and bcryptjs password hashing, bypassing Supabase Auth entirely to maintain full control over the session model. Row-Level Security on the Supabase PostgreSQL database provides an additional authorization layer.

---

## Features

### Order Management
- Browse menu items by category with search and barcode scanning
- Cart management with quantity controls
- Multi-payment support: cash, card, and meal credits
- QR code receipt generation via `qrcode.react`
- Order status tracking and history

### Role-Based Dashboards
- **Admin** -- user management, role assignment, system settings
- **Manager** -- menu, inventory, orders, credits, reports, salary deductions
- **Staff** -- counter order processing, order queue
- **Faculty** -- menu browsing, order placement, credit balance, order history
- **Student** -- menu browsing, order placement, order history

### Meal Credits System
- Monthly credit allowances for faculty and staff
- Usage tracking with transaction history
- Balance inquiries and rollover handling

### Inventory Management
- Stock tracking with per-item unit costs
- Audit trail via inventory movement records
- Low-stock threshold alerts
- Reorder tracking

### Salary Deductions
- Monthly deduction limits per user
- Typed deduction categories: loan, uniform, damages, other
- Deduction history and reporting

### Menu Management
- Full CRUD for categories and items
- Excel import/export via the `xlsx` library
- Barcode generation and scanning support
- Item availability toggling

### User Management
- Admin CRUD for all users
- Role assignment (5 roles)
- Per-user permission overrides for fine-grained access control

### Permission System
9 permission codes with role-based defaults and per-user overrides:

| Code | Description |
|------|-------------|
| `menu.view` | View menu items |
| `menu.manage` | Create, update, delete menu items and categories |
| `orders.view_all` | View all orders (across all users) |
| `orders.view_own` | View own orders only |
| `orders.process` | Process and fulfill orders |
| `users.manage` | Manage user accounts and roles |
| `credits.manage` | Manage meal credit allowances |
| `credits.view_own` | View own credit balance and history |
| `reports.view` | View financial and operational reports |

### Real-Time Notifications
- Supabase Realtime-powered alerts for new orders, order confirmations, and low stock
- Per-user notification streams

### Mobile Responsiveness
- Dedicated mobile layouts with bottom navigation for all roles
- Touch-optimized interfaces for counter staff and order placement

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui (Radix-Lyra theme) | -- |
| Icons | Phosphor Icons | 2.1.10 |
| Animation | Motion (formerly framer-motion) | 12.40.0 |
| Database | Supabase (PostgreSQL) | -- |
| Authentication | Custom JWT (jsonwebtoken + bcryptjs) | -- |
| QR Codes | qrcode.react | 4.x |
| Barcode Scanning | html5-qrcode | 2.x |
| Toast Notifications | Sonner | 2.x |
| Spreadsheet | xlsx | 0.18.5 |
| Classnames | clsx + tailwind-merge | -- |
| CI/CD | GitHub Actions | -- |
| Hosting | Vercel | -- |

---

## Architecture

### Frontend

The application uses a **client-heavy architecture** within Next.js 16's App Router. All dashboard pages, the login form, and the order placement page are `"use client"` components. The root layout is the only server component -- it sets up fonts, the `TooltipProvider`, and animation wrappers.

Data is fetched client-side by calling REST API routes, making the app behave more like a Single Page Application (SPA) with server-side API endpoints, rather than a traditional server-rendered Next.js app.

### Backend

The backend is entirely API-driven through Next.js API routes in `app/api/`. Two Supabase client patterns are used:

- **Browser client** (`lib/supabase/browser.ts`) -- uses the anon key, can be imported in client components, respects Row-Level Security (RLS).
- **Server client** (`lib/supabase/client.ts`) -- uses the service_role key, imported exclusively in API route handlers and server components, bypasses RLS. Includes a resilient stub client that surfaces missing environment variable errors through normal query channels instead of crashing at import time.

### Authentication

Custom JWT authentication manages all sessions. Supabase Auth is not used.

**Login flow:**
1. User submits employee ID and password via `POST /api/auth/login`
2. Password is verified against the bcrypt hash in the database
3. A JWT is signed with the payload `{ user_id, email, role, permissions }` using `JWT_SECRET`
4. An httpOnly cookie (`session_token`) is set with a 24-hour expiry
5. User is redirected to their role-specific dashboard

**Subsequent requests:**
- Next.js middleware (`proxy.ts`) reads the `session_token` cookie
- Verifies the JWT signature and expiry
- Checks the user's role against a route-permission map
- Allows access or redirects to `/login` or the user's role-appropriate dashboard

**Logout:**
- `POST /api/auth/logout` clears the cookie and redirects to `/login`

### Middleware

The Next.js middleware (`proxy.ts`) intercepts all requests:

- Public routes (`/login`, `/api/auth/*`) pass through immediately
- API routes pass through (they authenticate internally)
- Dashboard routes without a valid `session_token` cookie are redirected to `/login`
- Dashboard routes with a valid token are validated against a role-to-route map. Unauthorized access is redirected to the user's role-specific dashboard
- Static files (`_next/static`, `favicon.ico`, etc.) pass through

### Real-Time

Supabase Realtime subscriptions power live notifications for new orders, order confirmations, and low-stock alerts. Notifications are scoped per user via RLS policies.

---

<!-- ## Screenshots

<!-- TODO: Add screenshots of key pages -->

<!-- ### Login Page -->
<!-- ![Login Page](public/screenshots/login.png) -->

<!-- ### Admin Dashboard -->
<!-- ![Admin Dashboard](public/screenshots/admin-dashboard.png) -->

<!-- ### Manager Dashboard -->
<!-- ![Manager Dashboard](public/screenshots/manager-dashboard.png) -->

<!-- ### Order Placement -->
<!-- ![Order Placement](public/screenshots/order-placement.png) -->

<!-- ### Staff Counter -->
<!-- ![Staff Counter](public/screenshots/staff-counter.png) -->

<!-- ### Faculty Dashboard -->
<!-- ![Faculty Dashboard](public/screenshots/faculty-dashboard.png) -->

<!-- ### Student Menu -->
<!-- ![Student Menu](public/screenshots/student-menu.png) -->

<!-- ### Inventory Management -->
<!-- ![Inventory Management](public/screenshots/inventory.png) -->

<!-- ### Mobile View -->
<!-- ![Mobile View](public/screenshots/mobile.png) -->

---

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+
- A Supabase project (free tier works)
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/jcmcjms/BrokenshireOne.git
cd canteen_management

# 2. Install dependencies
npm install

# 3. Create environment file
# Create .env.local with your Supabase credentials and JWT secret
# (see Environment Variables section below for the required variables)

# 4. Run database migrations
# Execute SQL files in supabase/migrations/ in numeric order
# against your Supabase project's SQL editor or via the Supabase CLI

# 5. Seed the database with initial data
node scripts/seed.mjs

# 6. Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

The following environment variables are required in `.env.local`:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://cqoebgtrludstqsmsgtd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | (from Supabase dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (bypasses RLS) | (from Supabase dashboard) |
| `JWT_SECRET` | Secret key for signing JWTs | (any secure random string) |

**Security note:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security. Store it securely, never commit it to version control, and do not expose it client-side.

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start the development server with hot reload |
| `build` | `next build` | Create a production build |
| `start` | `next start` | Start the production server |
| `lint` | `eslint` | Run ESLint across the codebase |
| `heartbeat` | `node scripts/heartbeat.mjs` | Check Supabase database connectivity (keep-alive) |

---

## Project Structure

```
canteen_management/
├── app/                          # Next.js App Router pages and API routes
│   ├── api/                      # REST API route handlers
│   │   ├── auth/                 # Login, logout, session
│   │   ├── credits/              # Credit allowance and transactions
│   │   ├── dashboard/            # Dashboard data endpoints
│   │   ├── heartbeat/            # Database keep-alive
│   │   ├── inventory/            # Inventory items and movements
│   │   ├── menu/                 # Menu categories and items
│   │   ├── notifications/        # Real-time notification endpoints
│   │   ├── orders/               # Order CRUD and processing
│   │   ├── payments/             # Payment processing
│   │   ├── permissions/          # Permission management
│   │   ├── roles/                # Role management
│   │   ├── salary/               # Salary deduction limits and deductions
│   │   ├── upload/               # File upload (Excel import)
│   │   └── users/                # User CRUD
│   ├── dashboard/                # Role-based dashboard pages
│   │   ├── admin/                # Admin dashboard (users, settings)
│   │   ├── faculty/              # Faculty dashboard (menu, orders, credits)
│   │   ├── manager/              # Manager dashboard (menu, inventory, orders, credits, reports, salary)
│   │   ├── staff/                # Staff counter dashboard
│   │   └── student/              # Student dashboard (menu, orders)
│   ├── login/                    # Login page
│   ├── globals.css               # Global styles and Tailwind imports
│   └── layout.tsx                # Root layout (fonts, providers)
├── components/                   # Shared React components
│   ├── admin/                    # Admin-specific components
│   ├── animations/               # Motion animation components
│   ├── inventory/                # Inventory UI components
│   ├── mobile/                   # Mobile-specific components (bottom nav)
│   ├── notifications/            # Notification components
│   └── ui/                       # shadcn/ui primitives
├── docs/                         # Project documentation
│   ├── brokenshireone.md         # Complete architecture and feature documentation
│   └── heartbeat.md              # Supabase keep-alive system documentation
├── lib/                          # Shared utilities and clients
│   ├── auth/                     # JWT, password hashing, session utilities
│   │   ├── jwt.ts                # JWT sign/verify helpers
│   │   ├── password.ts           # bcrypt hash/compare helpers
│   │   └── session.ts            # Session cookie management
│   ├── realtime/                 # Supabase Realtime subscriptions
│   ├── supabase/                 # Supabase client instances
│   │   ├── browser.ts            # Browser client (anon key, respects RLS)
│   │   ├── client.ts             # Server client (service_role key, bypasses RLS)
│   │   ├── notifications.ts      # Notification query helpers
│   │   └── queries.ts            # Reusable query builders
│   ├── units.ts                  # Unit conversion utilities
│   └── utils.ts                  # General utilities (cn, etc.)
├── modules/                      # Domain modules
│   ├── canteen/                  # Canteen-specific business logic
│   └── core/                     # Core domain logic
├── public/                       # Static assets
├── scripts/                      # Utility and automation scripts
│   ├── check-db.mjs              # Database diagnostics
│   ├── deploy.ps1                # Deployment helper (PowerShell)
│   ├── heartbeat.mjs             # Standalone database keep-alive
│   ├── seed.mjs                  # Database seed script
│   └── test-login.mjs            # Login flow test
├── supabase/                     # Database configuration
│   └── migrations/               # SQL migration files (9 total)
│       ├── 00001_schema.sql
│       ├── 00002_inventory.sql
│       ├── 00003_user_permissions.sql
│       ├── 00004_storage_buckets.sql
│       ├── 00005_add_barcode.sql
│       ├── 00006_add_unit.sql
│       ├── 00007_cash_payment.sql
│       ├── 00008_salary_deductions.sql
│       └── 20260530_notifications.sql
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Generated Supabase database types
│   └── index.ts                  # Shared application types
├── proxy.ts                      # Next.js middleware (route protection, JWT verification)
├── .github/                      # GitHub configuration
│   └── workflows/
│       └── heartbeat.yml         # Supabase keep-alive workflow
├── .github/                      # GitHub configuration
│   └── workflows/
│       └── heartbeat.yml         # Supabase keep-alive workflow
├── proxy.ts                      # Next.js middleware (route protection, JWT verification)
├── components.json               # shadcn/ui configuration
├── next.config.ts                # Next.js configuration
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project dependencies and scripts
```

---

## Role Overview

| Role | Access Scope | Primary Routes |
|------|-------------|----------------|
| **Admin** | Full system access, user management, settings | `/dashboard/admin/*` |
| **Manager** | Operations management: menu, inventory, orders, credits, reports, salary | `/dashboard/manager/*` |
| **Staff** | Counter operations: process orders at point of sale | `/dashboard/staff/*` |
| **Faculty** | Personal: menu browsing, order placement, credit balance, order history | `/dashboard/faculty/*` |
| **Student** | Personal: menu browsing, order placement, order history | `/dashboard/student/*` |

Admin and Manager roles have access to the full permission matrix. Staff, Faculty, and Student roles have restricted permissions based on their default role configuration, with optional per-user overrides.

---

## API Routes

The application exposes REST API endpoints under `app/api/`. All authenticated routes require the `session_token` cookie. Key endpoint groups:

| Group | Base Path | Purpose |
|-------|-----------|---------|
| Auth | `/api/auth/*` | Login, logout, session validation |
| Menu | `/api/menu/*` | Categories and items CRUD, barcode lookup |
| Orders | `/api/orders/*` | Order creation, status updates, history |
| Payments | `/api/payments/*` | Payment processing |
| Credits | `/api/credits/*` | Credit allowances, transactions, balances |
| Inventory | `/api/inventory/*` | Stock items, movements, alerts |
| Users | `/api/users/*` | User CRUD, role assignment |
| Permissions | `/api/permissions/*` | Permission defaults and overrides |
| Roles | `/api/roles/*` | Role definitions and defaults |
| Salary | `/api/salary/*` | Deduction limits and deduction records |
| Notifications | `/api/notifications/*` | User notification streams |
| Dashboard | `/api/dashboard/*` | Aggregated dashboard data per role |
| Upload | `/api/upload/*` | Excel file import for menu items |

---

## Database

The Supabase PostgreSQL database consists of 13+ tables across 9 migrations:

- **roles** -- Role definitions (admin, manager, staff, faculty, student)
- **permissions** -- Available permission codes (9 total)
- **role_permissions** -- Default permission assignments per role
- **users** -- User accounts with employee ID, password hash, role, and status
- **user_permissions** -- Per-user permission overrides
- **menu_categories** -- Menu category groupings
- **menu_items** -- Individual menu items with pricing, barcode, and availability
- **orders** -- Order headers with status tracking
- **order_items** -- Line items within orders
- **payments** -- Payment records (cash, card, credit)
- **credit_allowances** -- Monthly credit budgets for faculty/staff
- **credit_transactions** -- Credit usage and adjustment history
- **inventory_items** -- Stock items with quantities and thresholds
- **inventory_movements** -- Audit trail for inventory changes
- **salary_deduction_limits** -- Monthly deduction caps per user
- **salary_deductions** -- Individual deduction records by type (loan, uniform, damages, other)
- **notifications** -- Real-time notification records

Row-Level Security (RLS) policies are enabled on all tables, enforced through the browser client, and bypassed by the server client using the service_role key.

---

## Documentation

For detailed information beyond this README, see the companion documentation files:

| Document | Description |
|----------|-------------|
| [docs/brokenshireone.md](docs/brokenshireone.md) | Complete architecture overview, database schema, route map, feature deep-dives, UI/UX details, deployment guide, and migration history |
| [docs/heartbeat.md](docs/heartbeat.md) | Supabase keep-alive heartbeat system: architecture, components, setup guide, troubleshooting, and alternatives |

---

## Deployment

### Vercel

The application is deployed on Vercel. To deploy your own instance:

1. Push the repository to GitHub
2. Import the project into Vercel
3. Configure the following environment variables in the Vercel project dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
4. Deploy. Vercel automatically detects Next.js and applies the correct build configuration.

### Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run all migration files from `supabase/migrations/` in numeric order
3. Enable Row-Level Security on all tables
4. Run `node scripts/seed.mjs` to populate initial roles, permissions, and test data
5. Configure authentication as needed in the Supabase dashboard (API settings)

### GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/heartbeat.yml`) that prevents the free-tier Supabase project from auto-pausing after 7 days of inactivity. It runs a lightweight database query every 6 hours via two methods:

- **API method**: Calls `/api/heartbeat` on the deployed Vercel app
- **Script method**: Runs `scripts/heartbeat.mjs` directly against Supabase

See [docs/heartbeat.md](docs/heartbeat.md) for setup instructions.

---

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes with clear, descriptive messages
4. Push to your fork (`git push origin feature/your-feature`)
5. Open a Pull Request

Before submitting, ensure:
- Code compiles without errors (`npm run build`)
- Linting passes (`npm run lint`)
- New API routes include proper error handling and authorization checks
- Database migrations are backward-compatible where possible
- Documentation is updated to reflect changes

---

## License

MIT

Copyright (c) 2026 Brokenshire College Toril

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Contributors

BrokenshireOne is maintained by the development team at Brokenshire College Toril.

Repository: [https://github.com/jcmcjms/BrokenshireOne](https://github.com/jcmcjms/BrokenshireOne)
