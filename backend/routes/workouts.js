import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Validation middleware for workout data
const validateWorkout = (req, res, next) => {
  const { exercise_name, sets, reps, weight, per_set_weights, difficulty_rating } = req.body;
  const errors = {};

  // Validate exercise_name (required, non-empty string)
  if (!exercise_name || typeof exercise_name !== 'string' || exercise_name.trim().length === 0) {
    errors.exercise_name = 'Exercise name is required';
  }

  // Validate sets (required, positive integer)
  if (sets === undefined || sets === null) {
    errors.sets = 'Sets must be a positive number';
  } else {
    const setsNum = Number(sets);
    if (isNaN(setsNum) || !Number.isInteger(setsNum) || setsNum <= 0) {
      errors.sets = 'Sets must be a positive number';
    }
  }

  // Validate reps (required, positive integer)
  if (reps === undefined || reps === null) {
    errors.reps = 'Reps must be a positive number';
  } else {
    const repsNum = Number(reps);
    if (isNaN(repsNum) || !Number.isInteger(repsNum) || repsNum <= 0) {
      errors.reps = 'Reps must be a positive number';
    }
  }

  // Validate per_set_weights if provided
  if (per_set_weights !== undefined && per_set_weights !== null) {
    if (!Array.isArray(per_set_weights)) {
      errors.per_set_weights = 'Per-set weights must be an array';
    } else {
      const setsNum = Number(sets);
      if (!isNaN(setsNum) && per_set_weights.length !== setsNum) {
        errors.per_set_weights = `Per-set weights array length (${per_set_weights.length}) must match number of sets (${setsNum})`;
      }
      
      // Validate each weight value
      for (let i = 0; i < per_set_weights.length; i++) {
        const w = Number(per_set_weights[i]);
        if (isNaN(w) || w < 0) {
          errors.per_set_weights = `All per-set weights must be non-negative numbers (invalid value at index ${i})`;
          break;
        }
      }
    }
  }
  
  // Validate legacy weight field
  // Note: Both weight and per_set_weights can be provided (hybrid submission)
  // When both are provided, per_set_weights takes precedence in the POST handler
  if (per_set_weights !== undefined && per_set_weights !== null) {
    // If per_set_weights is provided, weight is optional
    // But if weight is provided, validate it
    if (weight !== undefined && weight !== null) {
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 0) {
        errors.weight = 'Weight must be a non-negative number';
      }
    }
  } else if (per_set_weights === undefined || per_set_weights === null) {
    // If per_set_weights is not provided, weight is required
    if (weight === undefined || weight === null) {
      errors.weight = 'Weight must be a non-negative number';
    } else {
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 0) {
        errors.weight = 'Weight must be a non-negative number';
      }
    }
  }

  // Validate difficulty_rating if provided
  if (difficulty_rating !== undefined && difficulty_rating !== null) {
    const ratingNum = Number(difficulty_rating);
    if (isNaN(ratingNum) || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 10) {
      errors.difficulty_rating = 'Difficulty rating must be an integer between 1 and 10';
    }
  }

  // If there are validation errors, return 400 with error details
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// POST /api/workouts - Create a new workout entry
router.post('/', validateWorkout, async (req, res) => {
  try {
    const { exercise_name, sets, reps, weight, per_set_weights, difficulty_rating, notes } = req.body;

    // Prepare workout data
    const workoutData = {
      exercise_name: exercise_name.trim(),
      sets: Number(sets),
      reps: Number(reps),
      notes: notes || ''
    };

    // Handle per-set weights or legacy weight
    if (per_set_weights && Array.isArray(per_set_weights)) {
      workoutData.per_set_weights = per_set_weights.map(w => Number(w));
      // Set legacy weight to first per-set weight for backward compatibility
      workoutData.weight = Number(per_set_weights[0]);
    } else {
      workoutData.weight = Number(weight);
      workoutData.per_set_weights = null;
    }

    // Add difficulty rating if provided
    if (difficulty_rating !== undefined && difficulty_rating !== null) {
      workoutData.difficulty_rating = Number(difficulty_rating);
    }

    // Insert workout into database
    const { data, error } = await supabase
      .from('workouts')
      .insert(workoutData)
      .select()
      .single();

    if (error) {
      console.error('Database error creating workout:', error);
      return res.status(500).json({
        error: 'Database operation failed',
        message: 'Unable to save workout. Please try again.'
      });
    }

    // Return created workout
    res.status(201).json({ workout: data });
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({
      error: 'Database operation failed',
      message: 'Unable to save workout. Please try again.'
    });
  }
});

// GET /api/workouts - Retrieve all workout entries
router.get('/', async (req, res) => {
  try {
    // Query all workouts ordered by created_at descending
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching workouts:', error);
      return res.status(500).json({
        error: 'Database operation failed',
        message: 'Unable to fetch workouts. Please try again.'
      });
    }

    // Return workouts array
    res.json({ workouts: data || [] });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({
      error: 'Database operation failed',
      message: 'Unable to fetch workouts. Please try again.'
    });
  }
});

// DELETE /api/workouts/:id - Delete a workout entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is provided
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid workout ID'
      });
    }

    // Delete workout from database
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting workout:', error);
      return res.status(500).json({
        error: 'Database operation failed',
        message: 'Unable to delete workout. Please try again.'
      });
    }

    // Return success response
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({
      error: 'Database operation failed',
      message: 'Unable to delete workout. Please try again.'
    });
  }
});

export default router;
