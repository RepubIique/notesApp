import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Validation middleware for workout data
const validateWorkout = (req, res, next) => {
  const { exercise_name, sets, reps, weight } = req.body;
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

  // Validate weight (required, non-negative number)
  if (weight === undefined || weight === null) {
    errors.weight = 'Weight must be a non-negative number';
  } else {
    const weightNum = Number(weight);
    if (isNaN(weightNum) || weightNum < 0) {
      errors.weight = 'Weight must be a non-negative number';
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
    const { exercise_name, sets, reps, weight, notes } = req.body;

    // Insert workout into database
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        exercise_name: exercise_name.trim(),
        sets: Number(sets),
        reps: Number(reps),
        weight: Number(weight),
        notes: notes || ''
      })
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

export default router;
