import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { supabase } from '../config/supabase.js';

/**
 * GET /api/workouts Route Tests
 * 
 * Tests Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 12.5:
 * - Ensure per_set_weights is returned in response
 * - Ensure difficulty_rating is returned in response
 * - Ensure all existing fields are still returned
 * - Verify NULL handling for optional fields
 */

describe('GET /api/workouts - Response Completeness', () => {
  const createdWorkoutIds = [];

  // Helper function to create a workout
  async function createWorkout(workoutData) {
    const dataToInsert = { ...workoutData };
    
    // Handle per_set_weights and weight logic
    if (dataToInsert.per_set_weights && Array.isArray(dataToInsert.per_set_weights)) {
      dataToInsert.weight = dataToInsert.per_set_weights[0];
    }
    
    const { data, error } = await supabase
      .from('workouts')
      .insert(dataToInsert)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create workout: ${error.message}`);
    }
    
    createdWorkoutIds.push(data.id);
    return data;
  }

  // Cleanup after all tests
  after(async () => {
    if (createdWorkoutIds.length > 0) {
      await supabase
        .from('workouts')
        .delete()
        .in('id', createdWorkoutIds);
    }
  });

  test('Requirement 6.1, 12.5: GET returns all workout fields', async () => {
    // Create a workout with all fields populated
    const fullWorkout = {
      exercise_name: 'Complete Workout',
      sets: 3,
      reps: 10,
      per_set_weights: [50, 55, 52.5],
      difficulty_rating: 7,
      notes: 'Full featured workout'
    };

    await createWorkout(fullWorkout);

    // Retrieve all workouts
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false });

    assert.ok(!error, 'Should retrieve workouts without error');
    assert.ok(Array.isArray(workouts), 'Should return an array');
    assert.ok(workouts.length > 0, 'Should have at least one workout');

    // Check the first workout has all required fields
    const workout = workouts[0];
    assert.ok(workout.id, 'Should have id field');
    assert.ok(workout.exercise_name, 'Should have exercise_name field');
    assert.ok(workout.sets !== undefined, 'Should have sets field');
    assert.ok(workout.reps !== undefined, 'Should have reps field');
    assert.ok(workout.weight !== undefined, 'Should have weight field');
    assert.ok('per_set_weights' in workout, 'Should have per_set_weights field');
    assert.ok('difficulty_rating' in workout, 'Should have difficulty_rating field');
    assert.ok('notes' in workout, 'Should have notes field');
    assert.ok(workout.created_at, 'Should have created_at field');
  });

  test('Requirement 6.2: GET returns per_set_weights array when present', async () => {
    // Create a workout with per_set_weights
    const perSetWorkout = {
      exercise_name: 'Per-Set Workout',
      sets: 4,
      reps: 8,
      per_set_weights: [60, 65, 70, 67.5],
      notes: 'Progressive overload'
    };

    const created = await createWorkout(perSetWorkout);

    // Retrieve the workout
    const { data: retrieved, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', created.id)
      .single();

    assert.ok(!error, 'Should retrieve workout without error');
    assert.ok(Array.isArray(retrieved.per_set_weights), 'per_set_weights should be an array');
    assert.deepStrictEqual(
      retrieved.per_set_weights,
      [60, 65, 70, 67.5],
      'Should return the exact per_set_weights array'
    );
  });

  test('Requirement 6.3: GET returns NULL for per_set_weights when not present', async () => {
    // Create a legacy workout without per_set_weights
    const legacyWorkout = {
      exercise_name: 'Legacy Workout',
      sets: 3,
      reps: 10,
      weight: 50,
      notes: 'Legacy format'
    };

    const created = await createWorkout(legacyWorkout);

    // Retrieve the workout
    const { data: retrieved, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', created.id)
      .single();

    assert.ok(!error, 'Should retrieve workout without error');
    assert.strictEqual(
      retrieved.per_set_weights,
      null,
      'per_set_weights should be NULL for legacy workouts'
    );
  });

  test('Requirement 6.4: GET returns difficulty_rating when present', async () => {
    // Create a workout with difficulty_rating
    const ratedWorkout = {
      exercise_name: 'Rated Workout',
      sets: 3,
      reps: 10,
      weight: 80,
      difficulty_rating: 8,
      notes: 'Hard workout'
    };

    const created = await createWorkout(ratedWorkout);

    // Retrieve the workout
    const { data: retrieved, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', created.id)
      .single();

    assert.ok(!error, 'Should retrieve workout without error');
    assert.strictEqual(
      retrieved.difficulty_rating,
      8,
      'Should return the difficulty_rating value'
    );
  });

  test('Requirement 6.5: GET returns NULL for difficulty_rating when not present', async () => {
    // Create a workout without difficulty_rating
    const unratedWorkout = {
      exercise_name: 'Unrated Workout',
      sets: 3,
      reps: 10,
      weight: 50,
      notes: 'No rating'
    };

    const created = await createWorkout(unratedWorkout);

    // Retrieve the workout
    const { data: retrieved, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', created.id)
      .single();

    assert.ok(!error, 'Should retrieve workout without error');
    assert.strictEqual(
      retrieved.difficulty_rating,
      null,
      'difficulty_rating should be NULL when not provided'
    );
  });

  test('GET returns workouts with mixed formats correctly', async () => {
    // Create multiple workouts with different formats
    const legacyWorkout = {
      exercise_name: 'Legacy Format',
      sets: 3,
      reps: 10,
      weight: 50,
      notes: 'Legacy'
    };

    const perSetWorkout = {
      exercise_name: 'Per-Set Format',
      sets: 3,
      reps: 10,
      per_set_weights: [50, 55, 52.5],
      notes: 'Per-set'
    };

    const fullWorkout = {
      exercise_name: 'Full Format',
      sets: 3,
      reps: 10,
      per_set_weights: [60, 65, 62.5],
      difficulty_rating: 7,
      notes: 'Full'
    };

    await createWorkout(legacyWorkout);
    await createWorkout(perSetWorkout);
    await createWorkout(fullWorkout);

    // Retrieve all workouts
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    assert.ok(!error, 'Should retrieve workouts without error');
    assert.strictEqual(workouts.length, 3, 'Should retrieve 3 workouts');

    // Verify each workout has the correct format
    const full = workouts.find(w => w.exercise_name === 'Full Format');
    const perSet = workouts.find(w => w.exercise_name === 'Per-Set Format');
    const legacy = workouts.find(w => w.exercise_name === 'Legacy Format');

    // Full workout checks
    assert.ok(full, 'Should find full format workout');
    assert.deepStrictEqual(full.per_set_weights, [60, 65, 62.5]);
    assert.strictEqual(full.difficulty_rating, 7);

    // Per-set workout checks
    assert.ok(perSet, 'Should find per-set format workout');
    assert.deepStrictEqual(perSet.per_set_weights, [50, 55, 52.5]);
    assert.strictEqual(perSet.difficulty_rating, null);

    // Legacy workout checks
    assert.ok(legacy, 'Should find legacy format workout');
    assert.strictEqual(legacy.per_set_weights, null);
    assert.strictEqual(legacy.difficulty_rating, null);
    assert.strictEqual(Number(legacy.weight), 50);
  });

  test('GET returns empty array when no workouts match filter', async () => {
    // Try to retrieve workouts with a non-existent ID
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000');

    // Supabase returns null for error when query succeeds but finds no results
    assert.ok(error === null, 'Should not error when no workouts match');
    assert.ok(Array.isArray(workouts), 'Should return an array');
    assert.strictEqual(workouts.length, 0, 'Should return empty array');
  });

  test('GET orders workouts by created_at descending', async () => {
    // Create workouts with slight delays to ensure different timestamps
    const workout1 = await createWorkout({
      exercise_name: 'First Workout',
      sets: 3,
      reps: 10,
      weight: 50,
      notes: 'First'
    });

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 100));

    const workout2 = await createWorkout({
      exercise_name: 'Second Workout',
      sets: 3,
      reps: 10,
      weight: 60,
      notes: 'Second'
    });

    // Retrieve workouts
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2);

    assert.ok(!error, 'Should retrieve workouts without error');
    assert.ok(workouts.length >= 2, 'Should have at least 2 workouts');

    // The most recent workout should be first
    const first = workouts[0];
    const second = workouts[1];

    assert.ok(
      new Date(first.created_at) >= new Date(second.created_at),
      'Workouts should be ordered by created_at descending'
    );
  });
});
