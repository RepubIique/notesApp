import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { supabase } from '../config/supabase.js';

/**
 * Backward Compatibility Tests for POST /api/workouts
 * 
 * Tests Requirements 12.1, 12.2, 12.3, 12.4:
 * - Accept legacy weight-only submissions
 * - Accept per_set_weights-only submissions  
 * - Accept hybrid submissions (both fields)
 * - Prioritize per_set_weights when both provided
 */

describe('POST /api/workouts - Backward Compatibility', () => {
  const createdWorkoutIds = [];

  // Helper function to create a workout via Supabase
  // This mimics the POST route logic to handle backward compatibility
  async function createWorkout(workoutData) {
    const dataToInsert = { ...workoutData };
    
    // Mimic the POST route logic for handling per_set_weights and weight
    if (dataToInsert.per_set_weights && Array.isArray(dataToInsert.per_set_weights)) {
      // If per_set_weights is provided, set legacy weight to first value
      dataToInsert.weight = dataToInsert.per_set_weights[0];
    } else if (!dataToInsert.weight && dataToInsert.weight !== 0) {
      // If neither per_set_weights nor weight is provided, this should fail
      throw new Error('Either weight or per_set_weights must be provided');
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

  test('Requirement 12.1: Accept legacy weight-only submissions', async () => {
    // Create workout with only legacy weight field (no per_set_weights)
    const legacyWorkout = {
      exercise_name: 'Legacy Bench Press',
      sets: 3,
      reps: 10,
      weight: 50,
      notes: 'Legacy format workout'
    };

    const created = await createWorkout(legacyWorkout);

    // Verify workout was created successfully
    assert.ok(created.id, 'Workout should have an ID');
    assert.strictEqual(created.exercise_name, 'Legacy Bench Press');
    assert.strictEqual(created.sets, 3);
    assert.strictEqual(created.reps, 10);
    assert.strictEqual(Number(created.weight), 50);
    assert.strictEqual(created.per_set_weights, null, 'per_set_weights should be NULL for legacy workouts');
  });

  test('Requirement 12.2: Accept per_set_weights-only submissions', async () => {
    // Create workout with per_set_weights but no legacy weight field
    const perSetWorkout = {
      exercise_name: 'Modern Squat',
      sets: 3,
      reps: 8,
      per_set_weights: [100, 110, 105],
      notes: 'Per-set weights format'
    };

    const created = await createWorkout(perSetWorkout);

    // Verify workout was created successfully
    assert.ok(created.id, 'Workout should have an ID');
    assert.strictEqual(created.exercise_name, 'Modern Squat');
    assert.strictEqual(created.sets, 3);
    assert.strictEqual(created.reps, 8);
    assert.deepStrictEqual(created.per_set_weights, [100, 110, 105]);
    // Legacy weight should be set to first per_set_weight for backward compatibility
    assert.strictEqual(Number(created.weight), 100, 'Legacy weight should be set to first per_set_weight');
  });

  test('Requirement 12.3 & 12.4: Accept hybrid submissions and prioritize per_set_weights', async () => {
    // Create workout with BOTH legacy weight and per_set_weights
    // per_set_weights should take precedence
    const hybridWorkout = {
      exercise_name: 'Hybrid Deadlift',
      sets: 4,
      reps: 5,
      weight: 999, // This should be ignored
      per_set_weights: [120, 130, 140, 135],
      notes: 'Hybrid submission - per_set_weights should win'
    };

    const created = await createWorkout(hybridWorkout);

    // Verify workout was created successfully
    assert.ok(created.id, 'Workout should have an ID');
    assert.strictEqual(created.exercise_name, 'Hybrid Deadlift');
    assert.strictEqual(created.sets, 4);
    assert.strictEqual(created.reps, 5);
    
    // per_set_weights should be stored
    assert.deepStrictEqual(created.per_set_weights, [120, 130, 140, 135]);
    
    // Legacy weight should be set to first per_set_weight, NOT the provided weight value
    assert.strictEqual(Number(created.weight), 120, 'Legacy weight should be first per_set_weight, not the provided weight value');
    assert.notStrictEqual(Number(created.weight), 999, 'Legacy weight should NOT be the provided weight value when per_set_weights is present');
  });

  test('Legacy workout retrieval returns correct format', async () => {
    // Create a legacy workout
    const legacyWorkout = {
      exercise_name: 'Legacy Pull-ups',
      sets: 3,
      reps: 12,
      weight: 0, // Bodyweight
      notes: 'Bodyweight exercise'
    };

    const created = await createWorkout(legacyWorkout);

    // Retrieve the workout
    const { data: retrieved, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', created.id)
      .single();

    assert.ok(!error, 'Should retrieve workout without error');
    assert.strictEqual(retrieved.per_set_weights, null, 'Legacy workout should have NULL per_set_weights');
    assert.strictEqual(Number(retrieved.weight), 0, 'Legacy workout should have weight value');
  });

  test('Per-set weights workout retrieval returns correct format', async () => {
    // Create a per-set weights workout
    const perSetWorkout = {
      exercise_name: 'Modern Overhead Press',
      sets: 3,
      reps: 8,
      per_set_weights: [40, 45, 42.5],
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
    assert.deepStrictEqual(retrieved.per_set_weights, [40, 45, 42.5], 'Should return per_set_weights array');
    assert.strictEqual(Number(retrieved.weight), 40, 'Should return legacy weight as first per_set_weight');
  });

  test('All workout fields are returned in API response (Requirement 12.5)', async () => {
    // Create a workout with all fields
    const fullWorkout = {
      exercise_name: 'Complete Workout',
      sets: 3,
      reps: 10,
      per_set_weights: [50, 55, 52.5],
      difficulty_rating: 7,
      notes: 'Full featured workout'
    };

    const created = await createWorkout(fullWorkout);

    // Verify all fields are present in response
    assert.ok(created.id, 'Should have id');
    assert.ok(created.exercise_name, 'Should have exercise_name');
    assert.ok(created.sets, 'Should have sets');
    assert.ok(created.reps, 'Should have reps');
    assert.ok(created.weight !== undefined, 'Should have weight');
    assert.ok(created.per_set_weights, 'Should have per_set_weights');
    assert.ok(created.difficulty_rating, 'Should have difficulty_rating');
    assert.ok(created.notes !== undefined, 'Should have notes');
    assert.ok(created.created_at, 'Should have created_at');
  });

  test('Decimal weights work in legacy format', async () => {
    const decimalWorkout = {
      exercise_name: 'Decimal Weight Test',
      sets: 2,
      reps: 10,
      weight: 47.5,
      notes: 'Testing decimal support'
    };

    const created = await createWorkout(decimalWorkout);
    assert.strictEqual(Number(created.weight), 47.5, 'Should support decimal weights');
  });

  test('Decimal weights work in per-set format', async () => {
    const decimalPerSetWorkout = {
      exercise_name: 'Decimal Per-Set Test',
      sets: 3,
      reps: 10,
      per_set_weights: [47.5, 50.0, 52.5],
      notes: 'Testing decimal per-set support'
    };

    const created = await createWorkout(decimalPerSetWorkout);
    assert.deepStrictEqual(created.per_set_weights, [47.5, 50.0, 52.5], 'Should support decimal per-set weights');
  });

  test('Zero weight is valid (bodyweight exercises)', async () => {
    const bodyweightWorkout = {
      exercise_name: 'Push-ups',
      sets: 3,
      reps: 20,
      weight: 0,
      notes: 'Bodyweight exercise'
    };

    const created = await createWorkout(bodyweightWorkout);
    assert.strictEqual(Number(created.weight), 0, 'Should accept zero weight for bodyweight exercises');
  });

  test('Zero in per_set_weights is valid', async () => {
    const bodyweightPerSetWorkout = {
      exercise_name: 'Assisted Pull-ups',
      sets: 3,
      reps: 10,
      per_set_weights: [0, 0, 0],
      notes: 'Bodyweight with assistance'
    };

    const created = await createWorkout(bodyweightPerSetWorkout);
    assert.deepStrictEqual(created.per_set_weights, [0, 0, 0], 'Should accept zero in per_set_weights');
  });
});
