-- Migration: Create workouts table for fitness tracker
-- Requirements: 4.1, 4.2, 4.5

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight NUMERIC NOT NULL CHECK (weight >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient chronological queries (newest first)
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow anonymous select" ON workouts;
DROP POLICY IF EXISTS "Allow anonymous insert" ON workouts;

-- Allow anonymous read access (SELECT)
CREATE POLICY "Allow anonymous select" ON workouts
  FOR SELECT
  USING (true);

-- Allow anonymous write access (INSERT)
CREATE POLICY "Allow anonymous insert" ON workouts
  FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE workouts IS 'Stores workout entries for the public fitness tracker (no authentication required)';
COMMENT ON COLUMN workouts.exercise_name IS 'Name of the exercise (e.g., Bench Press, Squats)';
COMMENT ON COLUMN workouts.sets IS 'Number of sets performed (must be positive)';
COMMENT ON COLUMN workouts.reps IS 'Number of repetitions per set (must be positive)';
COMMENT ON COLUMN workouts.weight IS 'Weight used in pounds or kg (must be non-negative)';
COMMENT ON COLUMN workouts.notes IS 'Optional notes about the workout';
COMMENT ON COLUMN workouts.created_at IS 'Timestamp when workout was logged';
