-- ============================================================================
-- User-level Permission Overrides - Migration 00003
-- Supabase (PostgreSQL)
-- ============================================================================

-- 1. User Permissions (overrides to role-based permissions)
-- ============================================================================
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    grant BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- Fast lookups when resolving permissions on login
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read user_permissions (needed for permission resolution)
CREATE POLICY "All authenticated can read user permissions"
    ON user_permissions FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- API Access Grants
-- ============================================================================
GRANT SELECT ON user_permissions TO authenticated;
