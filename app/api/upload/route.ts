import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // 2. Authorize — only users with menu.manage permission can upload
    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    // 3. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No image file provided' },
        { status: 400 },
      );
    }

    // 4. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, GIF.',
        },
        { status: 400 },
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'File too large. Maximum size is 5 MB.' },
        { status: 400 },
      );
    }

    // 6. Sanitize filename — remove special chars, replace spaces with hyphens
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '-')
      .toLowerCase();

    // 7. Generate unique path: userId/timestamp-sanitizedName
    const filePath = `${session.user_id}/${Date.now()}-${sanitizedName}`;

    // 8. Upload to Supabase Storage
    //    Pass the File directly (File extends Blob, which Supabase accepts)
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload] Supabase storage error:', uploadError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to upload image to storage' },
        { status: 500 },
      );
    }

    // 9. Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to retrieve public URL' },
        { status: 500 },
      );
    }

    // 10. Return success
    return NextResponse.json<ApiResponse>(
      { success: true, data: { url: publicUrl } },
      { status: 200 },
    );
  } catch (error) {
    console.error('[upload] Unexpected error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
