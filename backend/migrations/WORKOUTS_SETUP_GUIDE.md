# Workouts Table Setup Guide

This guide walks you through setting up the workouts table for the fitness tracker feature.

## Prerequisites

- Access to your Supabase project dashboard
- Backend `.env` file configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Step 1: Run the Migration

### Option A: Supabase SQL Editor (Recommended)

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of `backend/migrations/006_create_workouts_table.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see a success message

### Option B: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're linked to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option C: Direct psql Connection

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f backend/migrations/006_create_workouts_table.sql
```

## Step 2: Verify the Migration

After running the migration, verify it was successful:

### In Supabase Dashboard

1. Go to **Table Editor** in the left sidebar
2. You should see a new table called `workouts`
3. Click on the table to view its structure
4. Verify the columns:
   - `id` (uuid, primary key)
   - `exercise_name` (text, not null)
   - `sets` (int4, not null)
   - `reps` (int4, not null)
   - `weight` (numeric, not null)
   - `notes` (text, nullable)
   - `created_at` (timestamptz, not null)

### Using SQL Query

Run this query in the SQL Editor:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'workouts'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'workouts';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'workouts';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workouts';
```

Expected results:
- Table should have 7 columns as listed above
- Index `idx_workouts_created_at` should exist
- RLS should be enabled (`rowsecurity = true`)
- Two policies should exist: "Allow anonymous select" and "Allow anonymous insert"

## Step 3: Test the Database Setup

Run the automated test script to verify everything works:

```bash
# From the project root directory
node backend/test-workouts-db.js
```

This script will:
1. ✅ Verify the workouts table exists
2. ✅ Insert a test workout (anonymous access)
3. ✅ Query the workout back (anonymous access)
4. ✅ Test chronological ordering
5. ✅ Verify constraints (negative values should be rejected)
6. ✅ Clean up test data

If all tests pass, you'll see:
```
🎉 All database tests passed!
✅ Database schema is correctly configured
✅ Row Level Security policies are working
✅ Constraints are enforced
✅ Chronological indexing is working
```

## Step 4: Manual Testing (Optional)

You can also manually test the table in the Supabase SQL Editor:

```sql
-- Insert a test workout
INSERT INTO workouts (exercise_name, sets, reps, weight, notes)
VALUES ('Bench Press', 3, 10, 135, 'Felt strong today');

-- Query all workouts (newest first)
SELECT * FROM workouts ORDER BY created_at DESC;

-- Test constraint: This should fail (negative sets)
INSERT INTO workouts (exercise_name, sets, reps, weight)
VALUES ('Invalid', -1, 10, 100);

-- Test constraint: This should fail (zero reps)
INSERT INTO workouts (exercise_name, sets, reps, weight)
VALUES ('Invalid', 3, 0, 100);

-- Test constraint: This should fail (negative weight)
INSERT INTO workouts (exercise_name, sets, reps, weight)
VALUES ('Invalid', 3, 10, -50);

-- Clean up test data
DELETE FROM workouts WHERE exercise_name = 'Bench Press';
```

## Troubleshooting

### Error: "relation 'workouts' does not exist"

**Solution:** The migration hasn't been run yet. Go back to Step 1 and run the migration.

### Error: "permission denied for table workouts"

**Solution:** Check that RLS policies are correctly configured. Run this query:

```sql
-- Re-create RLS policies
DROP POLICY IF EXISTS "Allow anonymous select" ON workouts;
DROP POLICY IF EXISTS "Allow anonymous insert" ON workouts;

CREATE POLICY "Allow anonymous select" ON workouts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert" ON workouts
  FOR INSERT
  WITH CHECK (true);
```

### Error: "new row violates check constraint"

**Solution:** This is expected behavior! The constraints are working correctly. Make sure you're providing:
- Positive integers for `sets` and `reps` (> 0)
- Non-negative number for `weight` (>= 0)
- Non-empty string for `exercise_name`

### Test script fails with "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

**Solution:** Make sure your `backend/.env` file is configured with the correct Supabase credentials:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

You can find these values in your Supabase Dashboard under **Project Settings > API**.

## What's Next?

Once the database setup is complete and all tests pass, you can proceed to:

1. **Task 2**: Implement backend workout API endpoints (`POST /api/workouts`, `GET /api/workouts`)
2. **Task 3**: Create frontend workout API client
3. **Task 4+**: Build the fitness tracker UI components

## Database Schema Reference

```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight NUMERIC NOT NULL CHECK (weight >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workouts_created_at ON workouts(created_at DESC);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select" ON workouts
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON workouts
  FOR INSERT WITH CHECK (true);
```

## Key Features

- **No Authentication Required**: Anyone can read and write workouts (by design)
- **Data Validation**: Database-level constraints ensure data integrity
- **Chronological Queries**: Optimized index for newest-first ordering
- **Separate from Chat**: Completely isolated from chat-related tables
- **Timestamps**: Automatic timestamp tracking for each workout

## Requirements Satisfied

This database setup satisfies the following requirements:

- **4.1**: Workout data stored in separate Supabase table from chat data
- **4.2**: No authentication required to read or write workout data
- **4.5**: Timestamp included for each workout entry
