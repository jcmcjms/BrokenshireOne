import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('member_id') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  let query = db('library_fines')
    .select('*, library_members!member_id(membership_type)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['library.browse', 'library.manage_fines'] });
