# Supabase Storage Bucket Setup

## Requirements: 5.1, 5.2

This document describes how to create the 'images' storage bucket in Supabase for the discreet chat application.

## Manual Setup via Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket with the following settings:
   - **Name**: `images`
   - **Public bucket**: **OFF** (private access - requires authentication)
   - **File size limit**: `25MB` (26214400 bytes)
   - **Allowed MIME types**: `image/*` (or specifically: `image/jpeg`, `image/png`, `image/gif`, `image/webp`)

5. Click **Create bucket**

## Setup via Supabase SQL Editor (Alternative)

You can also create the bucket using SQL in the Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  false,  -- private bucket
  26214400,  -- 25MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

## Setup via Supabase Management API (Programmatic)

If you prefer to automate bucket creation, you can use the Supabase Management API:

```bash
curl -X POST 'https://api.supabase.com/v1/projects/{project-ref}/storage/buckets' \
  -H "Authorization: Bearer {service-role-key}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "images",
    "name": "images",
    "public": false,
    "file_size_limit": 26214400,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]
  }'
```

## Storage Policies

After creating the bucket, you may need to set up Row Level Security (RLS) policies if not using the service role key:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to read images
CREATE POLICY "Authenticated users can read images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'images');

-- Allow authenticated users to delete their own images (optional)
CREATE POLICY "Users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');
```

**Note**: Since the application uses the Supabase service role key for backend operations, RLS policies are bypassed. The policies above are only needed if you plan to access storage directly from the frontend.

## Verification

After setup, verify the bucket exists:

```sql
SELECT * FROM storage.buckets WHERE id = 'images';
```

Expected result:
- `id`: images
- `name`: images
- `public`: false
- `file_size_limit`: 26214400
- `allowed_mime_types`: {image/jpeg, image/png, image/gif, image/webp}

## File Naming Convention

The application will store images using UUID-based filenames:
- Format: `{uuid}.{extension}`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

This ensures unique filenames and prevents collisions.
