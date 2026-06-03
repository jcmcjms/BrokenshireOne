import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { getSalaryDeductions, createSalaryDeduction, deleteSalaryDeduction } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { getCurrentMonthYear, badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month')) || getCurrentMonthYear().month;
  const year = Number(searchParams.get('year')) || getCurrentMonthYear().year;

  const data = await getSalaryDeductions(month, year);
  return NextResponse.json<ApiResponse>({ success: true, data });
}, { roles: ['admin', 'manager'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { user_id, amount, deduction_type, reason, month, year } = await request.json();

  if (!user_id || !amount || !deduction_type) {
    return badRequestResponse('user_id, amount, and deduction_type are required');
  }

  if (amount <= 0) {
    return badRequestResponse('Amount must be greater than 0');
  }

  const validTypes = ['loan', 'uniform', 'damages', 'other'];
  if (!validTypes.includes(deduction_type)) {
    return badRequestResponse('Invalid deduction type');
  }

  const targetMonth = month || getCurrentMonthYear().month;
  const targetYear = year || getCurrentMonthYear().year;

  const data = await createSalaryDeduction({
    user_id,
    amount,
    deduction_type,
    reason: reason ?? null,
    month: targetMonth,
    year: targetYear,
    created_by: session.user_id,
  });

  logAdminAction(session, AuditActions.SALARY_DEDUCTION, 'salary_deduction', data?.id ?? null, {
    user_id,
    amount,
    deduction_type,
    reason: reason ?? null,
    month: targetMonth,
    year: targetYear,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { roles: ['admin', 'manager'] });

export const DELETE = apiHandler(async (request: NextRequest, _params, session) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return badRequestResponse('Deduction ID is required');
  }

  const data = await deleteSalaryDeduction(id);

  logAdminAction(session, AuditActions.SALARY_DEDUCTION, 'salary_deduction', id);

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { roles: ['admin', 'manager'] });
