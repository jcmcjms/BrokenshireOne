import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { createUser } from '@/lib/supabase/queries';
import { hashPassword } from '@/lib/auth/password';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';
import type { DbUser } from '@/types/database';
import { randomBytes } from 'crypto';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function generateEmployeeId(role: string): string {
  const prefix = role.substring(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
}

export const GET = apiHandler(async (request: NextRequest, _params, session) => {
  // Admin & manager can list all users. Staff can search users (for customer lookup at checkout).
  if (!session.permissions.includes('users.view') && session.role !== 'admin') {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search');

  let query = db('users')
    .select('*, roles(name)')
    .order('name', { ascending: true });

  // If a search query is provided, filter by name or employee_id
  if (searchQuery && searchQuery.length > 0) {
    const pattern = `%${searchQuery}%`;
    query = query
      .or(`name.ilike.${pattern},employee_id.ilike.${pattern}`)
      .limit(20);
  }

  const { data: users, error } = await query;

  if (error) {
    throw error;
  }

  // Staff only get basic info (id, name, email, employee_id) for customer lookup
  const safeUsers = (users as unknown as DbUser[]).map((user: any) => {
    const roleName = user.roles?.name ?? 'student';
    const { password_hash, roles, ...safeUser } = user;
    const result: Record<string, unknown> = { ...safeUser, role: roleName };

    // Staff only need minimal fields for customer search
    if (session.role === 'staff') {
      return {
        id: result.id as string,
        name: result.name as string,
        email: result.email as string,
        employee_id: result.employee_id as string | null,
        role: roleName,
      };
    }

    return result;
  });

  return NextResponse.json<ApiResponse>({
    success: true,
    data: safeUsers,
  });
});

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.email || !body.role_id) {
    return badRequestResponse('Name, email, and role are required');
  }

  // Check for duplicate email
  const { data: existing } = await db('users')
    .select('id')
    .eq('email', body.email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'A user with this email already exists' },
      { status: 409 },
    );
  }

  // Generate employee_id if not provided
  const roleName = body.role_name || 'student';
  const employeeId = body.employee_id || generateEmployeeId(roleName);

  // Check for duplicate employee_id
  const { data: existingEmp } = await db('users')
    .select('id')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (existingEmp) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'A user with this Employee ID already exists' },
      { status: 409 },
    );
  }

  // Use provided password or auto-generate
  const plainPassword = body.password || generatePassword();
  const passwordHash = await hashPassword(plainPassword);

  // Create user
  const newUser = await createUser({
    name: body.name,
    email: body.email.toLowerCase(),
    password_hash: passwordHash,
    role_id: body.role_id,
    employee_id: employeeId,
    monthly_credit_limit: body.monthly_credit_limit ?? 0,
  });

  const { password_hash, roles, ...safeUser } = newUser as any;
  const roleName2 = roles?.name ?? 'student';

  logAdminAction(session, AuditActions.USER_CREATE, 'user', newUser?.id ?? null, {
    name: body.name,
    email: body.email.toLowerCase(),
    role: roleName2,
    employee_id: employeeId,
  });

  // Return credentials so the admin can share them with the user
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      ...safeUser,
      role: roleName2,
      generated_password: plainPassword,
      generated_employee_id: employeeId,
    },
  }, { status: 201 });
}, { roles: ['admin'] });
