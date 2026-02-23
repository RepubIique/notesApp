# Database Migrations

This directory contains SQL migration files for setting up the Supabase database schema for the Discreet Chat application.

## Migration Files

1. **001_create_messages_table.sql** - Creates the messages table with constraints
2. **002_create_reactions_table.sql** - Creates the reactions table with foreign keys
3. **003_create_push_subscriptions_table.sql** - Creates the push_subscriptions table (optional feature)
4. **004_create_storage_bucket.md** - Instructions for creating the images storage bucket
5. **005_add_message_status.sql** - Adds message status tracking
6. **006_create_workouts_table.sql** - Creates the workouts table for fitness tracker (public access)

## Running Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of each migration file in order (001, 002, 003, 005, 006)
5. Click **Run** for each migration
6. Follow the instructions in `004_create_storage_bucket.md` to set up the storage bucket

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: psql Command Line

If you have direct database access:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run each migration file
\i backend/migrations/001_create_messages_table.sql
\i backend/migrations/002_create_reactions_table.sql
\i backend/migrations/003_create_push_subscriptions_table.sql
```

## Verification

After running all migrations, verify the schema:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'reactions', 'push_subscriptions', 'workouts');

-- Check messages table structure
\d messages

-- Check reactions table structure
\d reactions

-- Check push_subscriptions table structure
\d push_subscriptions

-- Check workouts table structure
\d workouts

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('messages', 'reactions', 'push_subscriptions', 'workouts');

-- Verify RLS policies on workouts table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workouts';

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'images';
```

## Schema Overview

### messages Table
- Stores all text and image messages
- Enforces sender constraint ('A' or 'B')
- Enforces type constraint ('text' or 'image')
- Supports soft deletion via `deleted` flag
- Indexed on `created_at` for efficient retrieval

### reactions Table
- Stores emoji reactions to messages
- Foreign key to messages with CASCADE DELETE
- Unique constraint prevents duplicate reactions
- Indexed on `message_id` for efficient lookups

### push_subscriptions Table (Optional)
- Stores push notification subscriptions for PWA
- Enforces owner constraint ('A' or 'B')
- Unique constraint on endpoint prevents duplicates
- Indexed on `owner` for efficient retrieval

### workouts Table
- Stores workout entries for public fitness tracker
- No authentication required (public access via RLS policies)
- Enforces positive values for sets and reps
- Enforces non-negative values for weight
- Indexed on `created_at` for chronological queries
- Completely separate from chat-related tables

### images Storage Bucket
- Private bucket for image uploads
- 25MB file size limit
- Accepts image MIME types only
- Requires authentication for access

## Rollback

If you need to rollback the migrations:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Delete storage bucket (via dashboard or API)
DELETE FROM storage.buckets WHERE id = 'images';
```

## Notes

- The migrations are idempotent (use `IF NOT EXISTS` clauses)
- Run migrations in numerical order to respect dependencies
- The push_subscriptions table is optional and only needed if implementing PWA push notifications
- The storage bucket must be created separately (see 004_create_storage_bucket.md)
