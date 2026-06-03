import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const category = searchParams.get('category') ?? undefined;

  let query = db('library_books').select('*');

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`,
    );
  }
  if (category) {
    query = query.eq('category', category);
  }

  query = query.order('title', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['library.browse', 'library.manage_books'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const body = await request.json();
  const {
    title,
    author,
    isbn,
    publisher,
    published_year,
    category,
    description,
    cover_image_url,
    total_copies,
    shelf_location,
  } = body;

  if (!title) return badRequestResponse('Title is required');
  if (!author) return badRequestResponse('Author is required');

  const { data, error } = await db('library_books')
    .insert({
      title,
      author,
      isbn: isbn ?? null,
      publisher: publisher ?? null,
      published_year: published_year ?? null,
      category: category ?? 'fiction',
      description: description ?? null,
      cover_image_url: cover_image_url ?? null,
      total_copies: total_copies ?? 1,
      available_copies: total_copies ?? 1,
      shelf_location: shelf_location ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(session, AuditActions.LIBRARY_BOOK_CREATE, 'library_book', data?.id ?? null, {
    title,
    author,
    isbn,
    category: category ?? 'fiction',
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['library.manage_books'] });
