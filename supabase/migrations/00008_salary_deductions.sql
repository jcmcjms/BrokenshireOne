-- ============================================================================
-- Canteen Management System - Salary Deductions
-- Migration: 00008_salary_deductions.sql
-- ============================================================================

-- 1. Salary Deduction Limits (monthly cap per user)
-- ============================================================================
CREATE TABLE salary_deduction_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    max_deduction_limit NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_deducted NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

CREATE TRIGGER set_salary_deduction_limits_updated_at
    BEFORE UPDATE ON salary_deduction_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Salary Deductions (individual deduction entries)
-- ============================================================================
CREATE TABLE salary_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    deduction_type TEXT NOT NULL CHECK (deduction_type IN ('loan', 'uniform', 'damages', 'other')),
    reason TEXT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_salary_deduction_limits_user_id ON salary_deduction_limits(user_id);
CREATE INDEX idx_salary_deduction_limits_month_year ON salary_deduction_limits(month, year);

CREATE INDEX idx_salary_deductions_user_id ON salary_deductions(user_id);
CREATE INDEX idx_salary_deductions_month_year ON salary_deductions(month, year);
CREATE INDEX idx_salary_deductions_deduction_type ON salary_deductions(deduction_type);
CREATE INDEX idx_salary_deductions_created_by ON salary_deductions(created_by);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE salary_deduction_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_deductions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read salary deduction limits
CREATE POLICY "All authenticated can read salary deduction limits"
    ON salary_deduction_limits FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read salary deductions
CREATE POLICY "All authenticated can read salary deductions"
    ON salary_deductions FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- API Access Grants
-- ============================================================================

GRANT SELECT ON salary_deduction_limits TO authenticated;
GRANT SELECT ON salary_deductions TO authenticated;
