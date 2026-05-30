-- ============================================================================
-- Menu Images Storage Bucket - Migration 00004
-- Supabase Storage (PostgreSQL)
-- ============================================================================

-- 1. Create the menu-images storage bucket
-- ============================================================================
-- Idempotent: uses ON CONFLICT to skip if already exists.
-- Bucket is public (anyone can view images via URL).
-- File size limit: 5 MB (5,242,880 bytes).
-- Allowed MIME types: JPEG, PNG, WebP, GIF.
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('menu-images', 'menu-images', true, false, 5242880, '{"image/jpeg","image/png","image/webp","image/gif"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Row Level Security Policies
-- ============================================================================

-- Public read: anyone can view menu images (they display on menu cards etc.)
CREATE POLICY "Public can view menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

-- Authenticated users with a session can upload images.
-- The API route performs additional permission checks (menu.manage).
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- Authenticated users can update their own uploads (e.g. replace an image).
CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

-- Authenticated users can delete menu images (handled via API route).
CREATE POLICY "Authenticated users can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');
