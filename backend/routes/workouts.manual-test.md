# Manual Testing Guide for Workout Routes

This guide provides manual tests to verify the workout API endpoints work correctly.

## Prerequisites

1. Ensure the database migration has been run: `backend/migrations/006_create_workouts_table.sql`
2. Ensure the backend server is running: `npm start` in the `backend` directory
3. Have a tool like `curl`, Postman, or Thunder Client ready

## Test 1: Create a Valid Workout (POST /api/workouts)

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Bench Press",
    "sets": 3,
    "reps": 10,
    "weight": 135,
    "notes": "Felt strong today"
  }'
```

**Expected Response (201 Created):**
```json
{
  "workout": {
    "id": "uuid-here",
    "exercise_name": "Bench Press",
    "sets": 3,
    "reps": 10,
    "weight": 135,
    "notes": "Felt strong today",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

## Test 2: Create Workout with Zero Weight (Valid)

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Bodyweight Squats",
    "sets": 5,
    "reps": 20,
    "weight": 0
  }'
```

**Expected Response (201 Created):**
Should succeed because weight can be 0 (non-negative).

## Test 3: Validation Error - Empty Exercise Name

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "",
    "sets": 3,
    "reps": 10,
    "weight": 135
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "exercise_name": "Exercise name is required"
  }
}
```

## Test 4: Validation Error - Negative Sets

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Deadlift",
    "sets": -1,
    "reps": 5,
    "weight": 225
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "sets": "Sets must be a positive number"
  }
}
```

## Test 5: Validation Error - Zero Reps

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Squat",
    "sets": 3,
    "reps": 0,
    "weight": 185
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "reps": "Reps must be a positive number"
  }
}
```

## Test 6: Validation Error - Negative Weight

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Overhead Press",
    "sets": 3,
    "reps": 8,
    "weight": -95
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "weight": "Weight must be a non-negative number"
  }
}
```

## Test 7: Validation Error - Multiple Invalid Fields

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "   ",
    "sets": 0,
    "reps": -5,
    "weight": -100
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "exercise_name": "Exercise name is required",
    "sets": "Sets must be a positive number",
    "reps": "Reps must be a positive number",
    "weight": "Weight must be a non-negative number"
  }
}
```

## Test 8: Validation Error - Missing Required Fields

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Pull-ups"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "sets": "Sets must be a positive number",
    "reps": "Reps must be a positive number",
    "weight": "Weight must be a non-negative number"
  }
}
```

## Test 9: Get All Workouts (GET /api/workouts)

**Request:**
```bash
curl http://localhost:3000/api/workouts
```

**Expected Response (200 OK):**
```json
{
  "workouts": [
    {
      "id": "uuid-1",
      "exercise_name": "Bench Press",
      "sets": 3,
      "reps": 10,
      "weight": 135,
      "notes": "Felt strong today",
      "created_at": "2024-01-01T12:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "exercise_name": "Bodyweight Squats",
      "sets": 5,
      "reps": 20,
      "weight": 0,
      "notes": "",
      "created_at": "2024-01-01T11:00:00.000Z"
    }
  ]
}
```

**Note:** Workouts should be ordered by `created_at` in descending order (newest first).

## Test 10: Get Workouts When Empty

**Prerequisites:** Clear all workouts from the database first.

**Request:**
```bash
curl http://localhost:3000/api/workouts
```

**Expected Response (200 OK):**
```json
{
  "workouts": []
}
```

## Test 11: Workout with Optional Notes Field

**Request:**
```bash
curl -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_name": "Running",
    "sets": 1,
    "reps": 1,
    "weight": 0
  }'
```

**Expected Response (201 Created):**
Should succeed with empty notes field.

## Verification Checklist

- [ ] Valid workout creation returns 201 status
- [ ] Created workout includes all fields (id, exercise_name, sets, reps, weight, notes, created_at)
- [ ] Empty exercise name is rejected with appropriate error
- [ ] Negative/zero sets are rejected
- [ ] Negative/zero reps are rejected
- [ ] Negative weight is rejected
- [ ] Zero weight is accepted (bodyweight exercises)
- [ ] Multiple validation errors are returned together
- [ ] Missing required fields are caught
- [ ] GET endpoint returns all workouts
- [ ] Workouts are ordered by created_at descending
- [ ] Empty workout list returns empty array
- [ ] Notes field is optional
- [ ] No authentication is required for any endpoint

## Requirements Validated

- **1.1**: Workouts can be created without authentication ✓
- **1.2**: Captures exercise name, sets, reps, weight, and optional notes ✓
- **1.5**: Validates exercise name is non-empty ✓
- **1.6**: Validates sets and reps are positive integers ✓
- **1.7**: Validates weight is non-negative ✓
