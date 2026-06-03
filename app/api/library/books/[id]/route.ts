import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request: NextRequest, params) => {
  const { id } = params;

  const { data, error } = await db('library_books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Library book');
    }
    throw error;
  }

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['library.browse', 'library.manage_books'] });

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.author !== undefined) updates.author = body.author;
  if (body.isbn !== undefined) updates.isbn = body.isbn;
  if (body.publisher !== undefined) updates.publisher = body.publisher;
  if (body.published_year !== undefined) updates.published_year = body.published_year;
  if (body.category !== undefined) updates.category = body.category;
  if (body.description !== undefined) updates.description = body.description;
  if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
  if (body.total_copies !== undefined) updates.total_copies = body.total_copies;
  if (body.available_copies !== undefined) updates.available_copies = body.available_copies;
  if (body.shelf_location !== undefined) updates.shelf_location = body.shelf_location;

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('library_books')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Library book');
    }
    throw error;
  }

  await logAdminAction(session, AuditActions.LIBRARY_BOOK_UPDATE, 'library_book', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['library.manage_books'] });

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  const { id } = params;

  const { error } = await db('library_books').delete().eq('id', id);

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Library book');
    }
    throw error;
  }

  await logAdminAction(session, AuditActions.LIBRARY_BOOK_DELETE, 'library_book', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Library book deleted',
  });
}, { permissions: ['library.manage_books'] });
