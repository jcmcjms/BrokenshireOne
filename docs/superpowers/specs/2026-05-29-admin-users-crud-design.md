# Admin Users CRUD — Design Spec

## Overview
Admin panel CRUD for managing system users. Admin can create, edit, view, and deactivate users. New users receive credentials via email through Resend.

## API Routes

| Method | Route | Handler | Auth |
|--------|-------|---------|------|
| `GET` | `/api/users` | List all users | admin |
| `GET` | `/api/users/[id]` | Get single user | admin |
| `POST` | `/api/users` | Create user (generates password, emails it) | admin |
| `PUT` | `/api/users/[id]` | Update user fields | admin |
| `DELETE` | `/api/users/[id]` | Soft-delete (toggles active=false) | admin |

## Data Model (users table)
- `name`, `email`, `employee_id`, `role_id`, `monthly_credit_limit`, `active`, `password_hash`, `avatar_url`

## Login Flow Change
Login uses `employee_id` + password instead of email + password.
- `/api/auth/login` modified to use `getUserByEmployeeId` instead of `getUserByEmail`
- Login form changed from email field to employee_id field

## Email Flow (Resend)
- On create: generate 12-char random password → hash + store → send via Resend
- Email includes: employee_id, generated password, login link
- `RESEND_API_KEY` in env variables

## Frontend (Admin Users Page)
- User table with action columns (Edit, Deactivate)
- "Add User" button → dialog/modal with form
- Edit → same modal pre-filled
- Deactivate → confirmation → soft-delete
- Search/filter bar

## Files

### New
- `lib/email.ts` — Resend client, `sendCredentials` function
- `app/api/users/[id]/route.ts` — GET/PUT/DELETE

### Modified
- `lib/supabase/queries.ts` — add `createUser`, `updateUser`, `deactivateUser`, `getUserByEmployeeId`
- `app/api/users/route.ts` — add POST handler
- `app/api/auth/login/route.ts` — use `employee_id` instead of email
- `app/login/page.tsx` — employee_id field instead of email
- `app/dashboard/admin/users/page.tsx` — CRUD UI with modal
- `.env.local` — add `RESEND_API_KEY`
- `package.json` — add `resend`
