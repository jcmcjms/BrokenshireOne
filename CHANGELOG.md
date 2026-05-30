# Changelog

All notable changes to the BrokenshireOne Canteen Management System project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-30

### Added

- Admin CRUD for users with employee_id login
- Self-service ordering and category management
- Inventory management workflow for managers
- Permission management workflow for admins
- Image upload functionality with validation and storage integration
- Barcode functionality to menu items
- Barcode scanner with multi-format support and improved error handling
- Image uploader with gallery and camera source options
- Unit field to menu items
- Stock quantity display on menu items with auto-decrement on orders
- Read-only menu viewer for students and faculty
- Cash payment with QR code, item images in order page, and staff confirmation flow
- Date filter to manager dashboard, orders, and reports pages
- Salary deduction workflow for faculty and staff
- Mobile student dashboard and notifications system
- Smooth page transitions on login/logout with Framer Motion
- Supabase heartbeat to prevent free-tier auto-pause

### Fixed

- Login 500 error with resilient Supabase client stub and improved error logging
- Stub client query builder chaining for Supabase pattern
- Stub client then/catch type signatures (Function type errors)
- 401 login error, 404 API/users, 404 settings, and proxy middleware issues
- "Cannot read properties of undefined (reading 'toFixed')" with safe formatPrice() utility
- Peso sign font mismatch by using PHP prefix instead of ₱ symbol
- 403 Forbidden on /api/users and /api/roles for staff and manager roles
- Escaped curly quotes in manager/menu page JSX
- Students and faculty now able to place orders by removing orders.process gate
- Stock quantity included in menu item POST handler so new items save the entered value
- Stock quantity field now clearable by storing as string
- Grant column renamed to is_granted to avoid PostgreSQL reserved word
- Permission overrides resilient to missing user_permissions table
- Actual user roles shown in salary deductions instead of hardcoded 'Faculty'
- Mobile dashboard rendering moved to the end of component functions

### Changed

- Rebranded to BrokenshireOne — institutional platform name
- Changed currency from USD ($) to Philippine Peso (₱)
- Replaced Resend with GoodSender for free email delivery
- Updated user password hashes to real bcrypt values for demo purposes

### Removed

- Removed Vercel deployment configuration files
- Removed email requirement — admins set or auto-generate password on user creation
- Removed diagnostic endpoint
- Removed docs/ from tracking and added to .gitignore

### Documentation

- Added comprehensive BrokenshireOne project documentation
- Added heartbeat system documentation
- Replaced boilerplate README with comprehensive BrokenshireOne documentation

## [Unreleased]

### Added

### Fixed

### Changed

### Removed

[Unreleased]: https://github.com/jcmcjms/canteen_management_v2/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jcmcjms/canteen_management_v2/releases/tag/v1.0.0
