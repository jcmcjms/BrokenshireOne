import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { supabase } from '@/lib/supabase/client';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('image');

  if (!file || !(file instanceof File)) {
    return badRequestResponse('No image file provided');
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return badRequestResponse('Invalid file type. Allowed types: JPEG, PNG, WebP, GIF.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return badRequestResponse('File too large. Maximum size is 5 MB.');
  }

  // Sanitize filename — remove special chars, replace spaces with hyphens
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\s+/g, '-')
    .toLowerCase();

  // Generate unique path: userId/timestamp-sanitizedName
  const filePath = `${session.user_id}/${Date.now()}-${sanitizedName}`;

  // Upload to Supabase Storage
  // Pass the File directly (File extends Blob, which Supabase accepts)
  const { error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error('Failed to upload image to storage');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('menu-images')
    .getPublicUrl(filePath);

  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    throw new Error('Failed to retrieve public URL');
  }

  // Return success
  return NextResponse.json<ApiResponse>(
    { success: true, data: { url: publicUrl } },
    { status: 200 },
  );
}, { permissions: ['menu.manage'] });
