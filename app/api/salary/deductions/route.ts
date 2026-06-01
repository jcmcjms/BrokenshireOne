import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSalaryDeductions, createSalaryDeduction, deleteSalaryDeduction } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import type { ApiResponse } from '@/types';

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin' && session.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month')) || getCurrentMonthYear().month;
    const year = Number(searchParams.get('year')) || getCurrentMonthYear().year;

    const data = await getSalaryDeductions(month, year);
    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch salary deductions' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin' && session.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { user_id, amount, deduction_type, reason, month, year } = await request.json();

    if (!user_id || !amount || !deduction_type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'user_id, amount, and deduction_type are required' },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 },
      );
    }

    const validTypes = ['loan', 'uniform', 'damages', 'other'];
    if (!validTypes.includes(deduction_type)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid deduction type' },
        { status: 400 },
      );
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

    await logAdminAction(session, AuditActions.SALARY_DEDUCTION, 'salary_deduction', data?.id ?? null, {
      user_id,
      amount,
      deduction_type,
      reason: reason ?? null,
      month: targetMonth,
      year: targetYear,
    }).catch(() => {});

    return NextResponse.json<ApiResponse>(
      { success: true, data },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create salary deduction' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin' && session.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Deduction ID is required' },
        { status: 400 },
      );
    }

    const data = await deleteSalaryDeduction(id);

    await logAdminAction(session, AuditActions.SALARY_DEDUCTION, 'salary_deduction', id).catch(() => {});

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete salary deduction' },
      { status: 500 },
    );
  }
}
