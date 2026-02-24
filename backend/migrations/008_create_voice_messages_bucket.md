# Voice Messages Storage Bucket Setup

## Overview
This document describes the manual setup required for the `voice-messages` Supabase storage bucket.

## Requirements
- Requirements: 6.1, 6.2, 6.3

## Setup Instructions

### 1. Create Storage Bucket

Navigate to Supabase Dashboard → Storage → Create a new bucket:

- **Bucket name**: `voice-messages`
- **Public bucket**: No (private)
- **File size limit**: 10 MB (configurable)
- **Allowed MIME types**: `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`

### 2. Configure Storage Policies

Add the following RLS policies to the `voice-messages` bucket:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
);
```

#### Policy 2: Allow authenticated users to read their messages
```sql
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages'
);
```

#### Policy 3: Allow authenticated users to delete their messages
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages'
);
```

### 3. Verify Setup

Test the bucket by:
1. Uploading a test audio file via the API
2. Retrieving a signed URL for the file
3. Deleting the test file

## File Naming Convention

Files are stored with the following naming pattern:
```
{messageId}_{timestamp}.{extension}
```

Example: `550e8400-e29b-41d4-a716-446655440000_1704067200000.webm`

## Access Control

- Only authenticated users can upload, read, and delete files
- Files are accessed via signed URLs with 1-hour expiry
- Storage paths are validated on the backend to prevent unauthorized access
