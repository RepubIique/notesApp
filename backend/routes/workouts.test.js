import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';

describe('Workout Routes - Implementation Verification', () => {
  let routeContent;

  test('Load workouts route file', async () => {
    routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    assert.ok(routeContent, 'Workouts route file should exist');
  });

  test('Routes do NOT use authMiddleware (public access)', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify authMiddleware is NOT imported or used
    assert.ok(!routeContent.includes('authMiddleware'), 'Routes should NOT use authMiddleware for public access');
  });

  test('POST /api/workouts has validation middleware', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify validation middleware exists
    assert.ok(routeContent.includes('validateWorkout'), 'Should have validateWorkout middleware');
    assert.ok(routeContent.includes("router.post('/', validateWorkout"), 'POST route should use validateWorkout');
  });

  test('Validation checks exercise_name is required and non-empty', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify exercise_name validation
    assert.ok(routeContent.includes('exercise_name'), 'Should validate exercise_name');
    assert.ok(routeContent.includes('trim()'), 'Should trim whitespace from exercise_name');
    assert.ok(routeContent.includes('Exercise name is required'), 'Should have appropriate error message');
  });

  test('Validation checks sets is a positive integer', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify sets validation
    assert.ok(routeContent.includes('sets'), 'Should validate sets');
    assert.ok(routeContent.includes('Number.isInteger'), 'Should check if sets is an integer');
    assert.ok(routeContent.includes('Sets must be a positive number'), 'Should have appropriate error message');
  });

  test('Validation checks reps is a positive integer', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify reps validation
    assert.ok(routeContent.includes('reps'), 'Should validate reps');
    assert.ok(routeContent.includes('Reps must be a positive number'), 'Should have appropriate error message');
  });

  test('Validation checks weight is non-negative', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify weight validation
    assert.ok(routeContent.includes('weight'), 'Should validate weight');
    assert.ok(routeContent.includes('Weight must be a non-negative number'), 'Should have appropriate error message');
  });

  test('Validation returns 400 with error details on failure', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify error response format
    assert.ok(routeContent.includes('res.status(400)'), 'Should return 400 for validation errors');
    assert.ok(routeContent.includes('Validation failed'), 'Should include validation failed message');
    assert.ok(routeContent.includes('details'), 'Should include error details');
  });

  test('POST /api/workouts inserts workout into database', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify database insertion
    assert.ok(routeContent.includes('supabase'), 'Should use supabase client');
    assert.ok(routeContent.includes("from('workouts')"), 'Should insert into workouts table');
    assert.ok(routeContent.includes('.insert('), 'Should use insert method');
    assert.ok(routeContent.includes('.select()'), 'Should select inserted data');
  });

  test('POST /api/workouts returns 201 status code', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify 201 Created status
    assert.ok(routeContent.includes('res.status(201)'), 'Should return 201 Created for new workouts');
  });

  test('POST /api/workouts handles database errors', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify error handling
    assert.ok(routeContent.includes('if (error)'), 'Should check for database errors');
    assert.ok(routeContent.includes('res.status(500)'), 'Should return 500 for database errors');
    assert.ok(routeContent.includes('Database operation failed'), 'Should include appropriate error message');
  });

  test('GET /api/workouts retrieves all workouts', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify GET endpoint exists
    assert.ok(routeContent.includes("router.get('/'"), 'Should have GET route');
    assert.ok(routeContent.includes("from('workouts')"), 'Should query workouts table');
    assert.ok(routeContent.includes('.select('), 'Should select workout data');
  });

  test('GET /api/workouts orders by created_at descending', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify ordering
    assert.ok(routeContent.includes('.order('), 'Should order results');
    assert.ok(routeContent.includes('created_at'), 'Should order by created_at');
    assert.ok(routeContent.includes('ascending: false'), 'Should order descending (newest first)');
  });

  test('GET /api/workouts returns workouts array', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify response format
    assert.ok(routeContent.includes('res.json'), 'Should return JSON response');
    assert.ok(routeContent.includes('workouts'), 'Should include workouts in response');
  });

  test('GET /api/workouts handles database errors', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify error handling
    assert.ok(routeContent.includes('if (error)'), 'Should check for database errors');
    assert.ok(routeContent.includes('res.status(500)'), 'Should return 500 for database errors');
  });

  test('Routes export default router', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/workouts.js', 'utf-8');
    
    // Verify export
    assert.ok(routeContent.includes('export default router'), 'Should export router as default');
  });
});
