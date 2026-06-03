import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import {
  getSalaryDeductionLimits,
  upsertSalaryDeductionLimit,
  getFacultyAndStaffUsers,
} from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { getCurrentMonthYear, badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month')) || getCurrentMonthYear().month;
  const year = Number(searchParams.get('year')) || getCurrentMonthYear().year;

  // Get all faculty and staff users
  const users = await getFacultyAndStaffUsers();

  // Get existing limits for the month/year
  const limits = await getSalaryDeductionLimits(month, year);

  // Merge: for users without a limit, create an entry with zero limit
  const limitMap = new Map(limits.map((l) => [l.user_id, l]));
  const merged = users.map((user) => {
    const existing = limitMap.get(user.id);
    if (existing) {
      // Ensure role from user list overrides any missing value
      return { ...existing, user_role: existing.user_role ?? user.role };
    }
    return {
      id: null,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      month,
      year,
      max_deduction_limit: 0,
      total_deducted: 0,
      remaining: 0,
    };
  });

  return NextResponse.json<ApiResponse>({ success: true, data: merged });
}, { roles: ['admin', 'manager'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { user_id, month, year, max_deduction_limit } = await request.json();

  if (!user_id || max_deduction_limit === undefined) {
    return badRequestResponse('user_id and max_deduction_limit are required');
  }

  if (max_deduction_limit < 0) {
    return badRequestResponse('Limit must be 0 or greater');
  }

  const targetMonth = month || getCurrentMonthYear().month;
  const targetYear = year || getCurrentMonthYear().year;

  const data = await upsertSalaryDeductionLimit(user_id, targetMonth, targetYear, max_deduction_limit);

  logAdminAction(session, AuditActions.SALARY_DEDUCTION, 'salary_deduction_limit', data?.id ?? null, {
    user_id,
    month: targetMonth,
    year: targetYear,
    max_deduction_limit,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { roles: ['admin', 'manager'] });
