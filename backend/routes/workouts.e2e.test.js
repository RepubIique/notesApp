import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import workoutsRouter from './workouts.js';
import { supabase } from '../config/supabase.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/workouts', workoutsRouter);

describe('End-to-End Workout Creation Flow', () => {
  let createdWorkoutIds = [];

  // Cleanup after tests
  after(async () => {
    // Delete all test workouts
    for (const id of createdWorkoutIds) {
      await supabase.from('workouts').delete().eq('id', id);
    }
  });

  describe('Task 13.1: Test end-to-end workout creation flow', () => {
    test('Create workout with per-set weights → Verify storage → Verify display', async () => {
      // Step 1: Create workout with per-set weights
      const workoutData = {
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        per_set_weights: [40, 50, 45],
        difficulty_rating: 7,
        notes: 'Progressive overload test'
      };

      const createResponse = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(201);

      // Verify response structure
      assert.ok(createResponse.body.workout, 'Response should contain workout object');
      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify created workout has correct data
      assert.strictEqual(createdWorkout.exercise_name, 'Bench Press');
      assert.strictEqual(createdWorkout.sets, 3);
      assert.strictEqual(createdWorkout.reps, 10);
      assert.strictEqual(createdWorkout.difficulty_rating, 7);
      assert.strictEqual(createdWorkout.notes, 'Progressive overload test');
      
      // Verify per_set_weights array
      assert.ok(Array.isArray(createdWorkout.per_set_weights), 'per_set_weights should be an array');
      assert.strictEqual(createdWorkout.per_set_weights.length, 3);
      assert.strictEqual(createdWorkout.per_set_weights[0], 40);
      assert.strictEqual(createdWorkout.per_set_weights[1], 50);
      assert.strictEqual(createdWorkout.per_set_weights[2], 45);
      
      // Verify legacy weight is set to first per-set weight
      assert.strictEqual(createdWorkout.weight, 40);

      // Step 2: Verify storage in database (direct query)
      const { data: dbWorkout, error: dbError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.ok(!dbError, 'Database query should not error');
      assert.ok(dbWorkout, 'Workout should exist in database');
      
      // Verify database stored values correctly
      assert.strictEqual(dbWorkout.exercise_name, 'Bench Press');
      assert.strictEqual(dbWorkout.sets, 3);
      assert.strictEqual(dbWorkout.reps, 10);
      assert.strictEqual(dbWorkout.difficulty_rating, 7);
      assert.ok(Array.isArray(dbWorkout.per_set_weights), 'Database per_set_weights should be an array');
      assert.strictEqual(dbWorkout.per_set_weights.length, 3);
      assert.strictEqual(dbWorkout.per_set_weights[0], 40);
      assert.strictEqual(dbWorkout.per_set_weights[1], 50);
      assert.strictEqual(dbWorkout.per_set_weights[2], 45);
      assert.strictEqual(dbWorkout.weight, 40);

      // Step 3: Verify display in workout list (GET endpoint)
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      assert.ok(listResponse.body.workouts, 'Response should contain workouts array');
      assert.ok(Array.isArray(listResponse.body.workouts), 'Workouts should be an array');
      
      // Find our created workout in the list
      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.ok(displayedWorkout, 'Created workout should appear in workout list');
      
      // Verify all fields are present for display
      assert.strictEqual(displayedWorkout.exercise_name, 'Bench Press');
      assert.strictEqual(displayedWorkout.sets, 3);
      assert.strictEqual(displayedWorkout.reps, 10);
      assert.strictEqual(displayedWorkout.difficulty_rating, 7);
      assert.strictEqual(displayedWorkout.notes, 'Progressive overload test');
      assert.ok(Array.isArray(displayedWorkout.per_set_weights), 'Displayed per_set_weights should be an array');
      assert.strictEqual(displayedWorkout.per_set_weights.length, 3);
      assert.strictEqual(displayedWorkout.per_set_weights[0], 40);
      assert.strictEqual(displayedWorkout.per_set_weights[1], 50);
      assert.strictEqual(displayedWorkout.per_set_weights[2], 45);
      assert.strictEqual(displayedWorkout.weight, 40);
      assert.ok(displayedWorkout.created_at, 'Should have created_at timestamp');
    });

    test('Create workout with difficulty rating only → Verify storage → Verify display', async () => {
      // Test workout with difficulty rating but no per-set weights
      const workoutData = {
        exercise_name: 'Squats',
        sets: 4,
        reps: 8,
        weight: 100,
        difficulty_rating: 9,
        notes: 'Heavy day'
      };

      const createResponse = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(201);

      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify response
      assert.strictEqual(createdWorkout.exercise_name, 'Squats');
      assert.strictEqual(createdWorkout.sets, 4);
      assert.strictEqual(createdWorkout.reps, 8);
      assert.strictEqual(createdWorkout.weight, 100);
      assert.strictEqual(createdWorkout.difficulty_rating, 9);
      assert.strictEqual(createdWorkout.per_set_weights, null);

      // Verify database storage
      const { data: dbWorkout } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.strictEqual(dbWorkout.difficulty_rating, 9);
      assert.strictEqual(dbWorkout.per_set_weights, null);
      assert.strictEqual(dbWorkout.weight, 100);

      // Verify display
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.ok(displayedWorkout, 'Workout should appear in list');
      assert.strictEqual(displayedWorkout.difficulty_rating, 9);
      assert.strictEqual(displayedWorkout.per_set_weights, null);
      assert.strictEqual(displayedWorkout.weight, 100);
    });

    test('Create legacy workout (no per-set weights, no difficulty) → Verify backward compatibility', async () => {
      // Test legacy format workout
      const workoutData = {
        exercise_name: 'Deadlift',
        sets: 5,
        reps: 5,
        weight: 150,
        notes: 'Legacy format'
      };

      const createResponse = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(201);

      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify response
      assert.strictEqual(createdWorkout.exercise_name, 'Deadlift');
      assert.strictEqual(createdWorkout.sets, 5);
      assert.strictEqual(createdWorkout.reps, 5);
      assert.strictEqual(createdWorkout.weight, 150);
      assert.strictEqual(createdWorkout.per_set_weights, null);
      assert.strictEqual(createdWorkout.difficulty_rating, null);

      // Verify database storage
      const { data: dbWorkout } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.strictEqual(dbWorkout.weight, 150);
      assert.strictEqual(dbWorkout.per_set_weights, null);
      assert.strictEqual(dbWorkout.difficulty_rating, null);

      // Verify display
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.ok(displayedWorkout, 'Legacy workout should appear in list');
      assert.strictEqual(displayedWorkout.weight, 150);
      assert.strictEqual(displayedWorkout.per_set_weights, null);
      assert.strictEqual(displayedWorkout.difficulty_rating, null);
    });

    test('Create workout with decimal per-set weights → Verify precision', async () => {
      // Test decimal weights (0.5 kg increments)
      const workoutData = {
        exercise_name: 'Overhead Press',
        sets: 3,
        reps: 8,
        per_set_weights: [42.5, 45, 42.5],
        difficulty_rating: 6,
        notes: 'Decimal weights test'
      };

      const createResponse = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(201);

      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify decimal precision in response
      assert.strictEqual(createdWorkout.per_set_weights[0], 42.5);
      assert.strictEqual(createdWorkout.per_set_weights[1], 45);
      assert.strictEqual(createdWorkout.per_set_weights[2], 42.5);
      assert.strictEqual(createdWorkout.weight, 42.5);

      // Verify database storage preserves decimals
      const { data: dbWorkout } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.strictEqual(dbWorkout.per_set_weights[0], 42.5);
      assert.strictEqual(dbWorkout.per_set_weights[1], 45);
      assert.strictEqual(dbWorkout.per_set_weights[2], 42.5);

      // Verify display preserves decimals
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.strictEqual(displayedWorkout.per_set_weights[0], 42.5);
      assert.strictEqual(displayedWorkout.per_set_weights[1], 45);
      assert.strictEqual(displayedWorkout.per_set_weights[2], 42.5);
    });

    test('Create workout with many sets → Verify all weights stored and displayed', async () => {
      // Test with 8 sets
      const workoutData = {
        exercise_name: 'Bicep Curls',
        sets: 8,
        reps: 12,
        per_set_weights: [15, 15, 17.5, 17.5, 20, 20, 17.5, 15],
        difficulty_rating: 6,
        notes: 'Volume training'
      };

      const createResponse = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(201);

      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify all 8 weights in response
      assert.strictEqual(createdWorkout.per_set_weights.length, 8);
      assert.deepStrictEqual(createdWorkout.per_set_weights, [15, 15, 17.5, 17.5, 20, 20, 17.5, 15]);

      // Verify database storage
      const { data: dbWorkout } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.strictEqual(dbWorkout.per_set_weights.length, 8);
      assert.deepStrictEqual(dbWorkout.per_set_weights, [15, 15, 17.5, 17.5, 20, 20, 17.5, 15]);

      // Verify display
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.strictEqual(displayedWorkout.per_set_weights.length, 8);
      assert.deepStrictEqual(displayedWorkout.per_set_weights, [15, 15, 17.5, 17.5, 20, 20, 17.5, 15]);
    });

    test('Workout list ordering → Verify newest workouts appear first', async () => {
      // Create two workouts in sequence
      const workout1Data = {
        exercise_name: 'Test Exercise 1',
        sets: 3,
        reps: 10,
        weight: 50,
        notes: 'First workout'
      };

      const workout2Data = {
        exercise_name: 'Test Exercise 2',
        sets: 3,
        reps: 10,
        weight: 60,
        notes: 'Second workout'
      };

      const response1 = await request(app)
        .post('/api/workouts')
        .send(workout1Data)
        .expect(201);
      createdWorkoutIds.push(response1.body.workout.id);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await request(app)
        .post('/api/workouts')
        .send(workout2Data)
        .expect(201);
      createdWorkoutIds.push(response2.body.workout.id);

      // Get workout list
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const workouts = listResponse.body.workouts;
      
      // Find our test workouts
      const workout1Index = workouts.findIndex(w => w.id === response1.body.workout.id);
      const workout2Index = workouts.findIndex(w => w.id === response2.body.workout.id);

      // Verify workout2 (newer) appears before workout1 (older)
      assert.ok(workout2Index < workout1Index, 'Newer workout should appear before older workout');
    });

    test('Complete workflow with all features → Verify end-to-end integration', async () => {
      // Create a workout with all features enabled
      const completeWorkoutData = {
        exercise_name: 'Complete Test Exercise',
        sets: 4,
        reps: 10,
        per_set_weights: [50, 55, 60, 55],
        difficulty_rating: 8,
        notes: 'Full feature test with per-set weights and difficulty rating'
      };

      // Step 1: Create
      const createResponse = await request(app)
        .post('/api/workouts')
        .send(completeWorkoutData)
        .expect(201);

      const createdWorkout = createResponse.body.workout;
      createdWorkoutIds.push(createdWorkout.id);

      // Verify all fields in creation response
      assert.strictEqual(createdWorkout.exercise_name, 'Complete Test Exercise');
      assert.strictEqual(createdWorkout.sets, 4);
      assert.strictEqual(createdWorkout.reps, 10);
      assert.deepStrictEqual(createdWorkout.per_set_weights, [50, 55, 60, 55]);
      assert.strictEqual(createdWorkout.difficulty_rating, 8);
      assert.strictEqual(createdWorkout.notes, 'Full feature test with per-set weights and difficulty rating');
      assert.strictEqual(createdWorkout.weight, 50); // Legacy weight = first per-set weight
      assert.ok(createdWorkout.id, 'Should have ID');
      assert.ok(createdWorkout.created_at, 'Should have timestamp');

      // Step 2: Verify database storage
      const { data: dbWorkout, error: dbError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', createdWorkout.id)
        .single();

      assert.ok(!dbError, 'Database query should succeed');
      assert.ok(dbWorkout, 'Workout should exist in database');
      assert.strictEqual(dbWorkout.exercise_name, 'Complete Test Exercise');
      assert.strictEqual(dbWorkout.sets, 4);
      assert.strictEqual(dbWorkout.reps, 10);
      assert.deepStrictEqual(dbWorkout.per_set_weights, [50, 55, 60, 55]);
      assert.strictEqual(dbWorkout.difficulty_rating, 8);
      assert.strictEqual(dbWorkout.weight, 50);

      // Step 3: Verify display in list
      const listResponse = await request(app)
        .get('/api/workouts')
        .expect(200);

      const displayedWorkout = listResponse.body.workouts.find(w => w.id === createdWorkout.id);
      assert.ok(displayedWorkout, 'Workout should appear in list');
      assert.strictEqual(displayedWorkout.exercise_name, 'Complete Test Exercise');
      assert.strictEqual(displayedWorkout.sets, 4);
      assert.strictEqual(displayedWorkout.reps, 10);
      assert.deepStrictEqual(displayedWorkout.per_set_weights, [50, 55, 60, 55]);
      assert.strictEqual(displayedWorkout.difficulty_rating, 8);
      assert.strictEqual(displayedWorkout.weight, 50);

      // Step 4: Verify data integrity across all stages
      assert.deepStrictEqual(
        createdWorkout.per_set_weights,
        dbWorkout.per_set_weights,
        'Per-set weights should match between creation response and database'
      );
      assert.deepStrictEqual(
        createdWorkout.per_set_weights,
        displayedWorkout.per_set_weights,
        'Per-set weights should match between creation response and display'
      );
      assert.strictEqual(
        createdWorkout.difficulty_rating,
        dbWorkout.difficulty_rating,
        'Difficulty rating should match between creation response and database'
      );
      assert.strictEqual(
        createdWorkout.difficulty_rating,
        displayedWorkout.difficulty_rating,
        'Difficulty rating should match between creation response and display'
      );
    });
  });
});
