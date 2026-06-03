-- ============================================================================
-- Canteen Management System - Library Module
-- Migration: 00009_library_module.sql
-- ============================================================================

-- 1. Library Books (Catalog)
-- ============================================================================
CREATE TABLE library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE,
    publisher TEXT,
    published_year INTEGER,
    category TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    shelf_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_library_books_updated_at
    BEFORE UPDATE ON library_books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Library Members (links users to library membership)
-- ============================================================================
CREATE TABLE library_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    membership_type TEXT NOT NULL CHECK (membership_type IN ('student', 'faculty', 'staff')),
    max_books_allowed INTEGER NOT NULL DEFAULT 3,
    borrow_duration_days INTEGER NOT NULL DEFAULT 14,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Library Borrowings (checkouts)
-- ============================================================================
CREATE TABLE library_borrowings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    renewed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'lost')),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Library Reservations (holds on books)
-- ============================================================================
CREATE TABLE library_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
    fulfilled_borrowing_id UUID REFERENCES library_borrowings(id) ON DELETE SET NULL
);

-- 5. Library Fines (penalties for overdue, damaged, or lost books)
-- ============================================================================
CREATE TABLE library_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrowing_id UUID REFERENCES library_borrowings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('overdue', 'damaged', 'lost')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    waived_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Library Books
CREATE INDEX idx_library_books_isbn ON library_books(isbn);
CREATE INDEX idx_library_books_title ON library_books(title);
CREATE INDEX idx_library_books_author ON library_books(author);
CREATE INDEX idx_library_books_category ON library_books(category);

-- Library Members
CREATE INDEX idx_library_members_user_id ON library_members(user_id);

-- Library Borrowings
CREATE INDEX idx_library_borrowings_member_id ON library_borrowings(member_id);
CREATE INDEX idx_library_borrowings_book_id ON library_borrowings(book_id);
CREATE INDEX idx_library_borrowings_status ON library_borrowings(status);
CREATE INDEX idx_library_borrowings_due_at ON library_borrowings(due_at);

-- Library Reservations
CREATE INDEX idx_library_reservations_member_id ON library_reservations(member_id);
CREATE INDEX idx_library_reservations_status ON library_reservations(status);

-- Library Fines
CREATE INDEX idx_library_fines_member_id ON library_fines(member_id);
CREATE INDEX idx_library_fines_status ON library_fines(status);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_fines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the library catalog
CREATE POLICY "All authenticated can read library books"
    ON library_books FOR SELECT
    TO authenticated
    USING (true);

-- Users can read their own library member record
CREATE POLICY "Users can read own library member record"
    ON library_members FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can read their own borrowings (via member linkage)
CREATE POLICY "Users can read own borrowings"
    ON library_borrowings FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM library_members
        WHERE library_members.id = library_borrowings.member_id
        AND library_members.user_id = auth.uid()
    ));

-- Users can read their own reservations (via member linkage)
CREATE POLICY "Users can read own reservations"
    ON library_reservations FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM library_members
        WHERE library_members.id = library_reservations.member_id
        AND library_members.user_id = auth.uid()
    ));

-- Users can read their own fines (via member linkage)
CREATE POLICY "Users can read own fines"
    ON library_fines FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM library_members
        WHERE library_members.id = library_fines.member_id
        AND library_members.user_id = auth.uid()
    ));

-- ============================================================================
-- API Access Grants
-- ============================================================================

GRANT SELECT ON library_books TO authenticated;
GRANT SELECT ON library_members TO authenticated;
GRANT SELECT ON library_borrowings TO authenticated;
GRANT SELECT ON library_reservations TO authenticated;
GRANT SELECT ON library_fines TO authenticated;

-- ============================================================================
-- Permissions & Roles
-- ============================================================================

-- Add librarian role (safe insert — may already exist in seed)
INSERT INTO roles (name, description) VALUES ('librarian', 'Library management and operations')
ON CONFLICT (name) DO NOTHING;

-- Add library permissions
INSERT INTO permissions (code, description, module) VALUES
    ('library.browse', 'Search and browse the library catalog', 'library'),
    ('library.borrow', 'Borrow and reserve books', 'library'),
    ('library.manage_books', 'Add, edit, and remove library books', 'library'),
    ('library.manage_borrowing', 'Process checkouts, returns, and renewals', 'library'),
    ('library.manage_fines', 'Manage library fines and waivers', 'library'),
    ('library.view_reports', 'View library usage reports', 'library'),
    ('library.reserve', 'Reserve books for future borrowing', 'library')
ON CONFLICT (code) DO NOTHING;

-- Assign ALL library permissions to librarian role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'librarian' AND p.code LIKE 'library.%'
ON CONFLICT DO NOTHING;

-- Assign ALL library permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.code LIKE 'library.%'
ON CONFLICT DO NOTHING;

-- Grant limited library permissions to faculty (browse, borrow, reserve)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'faculty' AND p.code IN ('library.browse', 'library.borrow', 'library.reserve')
ON CONFLICT DO NOTHING;

-- Grant limited library permissions to students (browse, borrow, reserve)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.code IN ('library.browse', 'library.borrow', 'library.reserve')
ON CONFLICT DO NOTHING;
