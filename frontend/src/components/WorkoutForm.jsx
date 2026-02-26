import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Box,
  Autocomplete
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const COMMON_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Push-ups',
  'Dips',
  'Lunges',
  'Leg Press',
  'Leg Curl',
  'Leg Extension',
  'Calf Raise',
  'Bicep Curl',
  'Tricep Extension',
  'Lateral Raise',
  'Front Raise',
  'Shrugs',
  'Face Pull',
  'Cable Fly',
  'Dumbbell Press',
  'Incline Press',
  'Decline Press',
  'Romanian Deadlift',
  'Hip Thrust',
  'Plank',
  'Sit-ups',
  'Russian Twist',
  'Lat Pulldown',
  'Cable Row'
];

export default function WorkoutForm({ onSubmit }) {
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [perSetWeights, setPerSetWeights] = useState([]);
  const [perSetWeightErrors, setPerSetWeightErrors] = useState([]);
  const [difficultyRating, setDifficultyRating] = useState(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync perSetWeights array with sets count
  useEffect(() => {
    const setsNum = parseInt(sets, 10);
    if (!isNaN(setsNum) && setsNum > 0) {
      setPerSetWeights(prev => {
        const newWeights = [...prev];
        // Add empty strings for new sets
        while (newWeights.length < setsNum) {
          newWeights.push('');
        }
        // Remove excess weights if sets decreased
        while (newWeights.length > setsNum) {
          newWeights.pop();
        }
        return newWeights;
      });
      // Sync error array as well
      setPerSetWeightErrors(prev => {
        const newErrors = [...prev];
        while (newErrors.length < setsNum) {
          newErrors.push('');
        }
        while (newErrors.length > setsNum) {
          newErrors.pop();
        }
        return newErrors;
      });
    } else {
      // Clear perSetWeights if sets is invalid
      setPerSetWeights([]);
      setPerSetWeightErrors([]);
    }
  }, [sets]);

  const handleFieldChange = (field, value, setter) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedName = exerciseName.trim();
    if (!trimmedName) newErrors.exercise_name = 'Required';
    
    const setsNum = parseInt(sets, 10);
    if (!sets || isNaN(setsNum) || setsNum <= 0) newErrors.sets = 'Must be positive';
    
    const repsNum = parseInt(reps, 10);
    if (!reps || isNaN(repsNum) || repsNum <= 0) newErrors.reps = 'Must be positive';
    
    // Validate per-set weights
    let hasPerSetWeightError = false;
    const newPerSetWeightErrors = perSetWeights.map((w, index) => {
      if (w === '') {
        hasPerSetWeightError = true;
        return 'Required';
      }
      const weightNum = parseFloat(w);
      if (isNaN(weightNum)) {
        hasPerSetWeightError = true;
        return 'Invalid';
      }
      if (weightNum < 0) {
        hasPerSetWeightError = true;
        return 'Must be ≥ 0';
      }
      return '';
    });
    
    if (hasPerSetWeightError) {
      setPerSetWeightErrors(newPerSetWeightErrors);
      newErrors.per_set_weights = 'Fix weight errors';
    }

    return newErrors;
  };

  const handleRatingSelect = (rating) => {
    setDifficultyRating(rating);
  };

  const handleRatingClear = () => {
    setDifficultyRating(null);
  };

  const resetForm = () => {
    setExerciseName('');
    setSets('');
    setReps('');
    setPerSetWeights([]);
    setPerSetWeightErrors([]);
    setDifficultyRating(null);
    setNotes('');
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    const workoutData = {
      exercise_name: exerciseName.trim(),
      sets: parseInt(sets, 10),
      reps: parseInt(reps, 10),
      per_set_weights: perSetWeights.map(w => parseFloat(w)),
      notes: notes.trim()
    };

    // Include difficulty_rating if selected
    if (difficultyRating !== null) {
      workoutData.difficulty_rating = difficultyRating;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(workoutData);
      resetForm();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save workout' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {errors.submit && (
        <Alert severity="error">{errors.submit}</Alert>
      )}

      <Autocomplete
        id="exercise-name"
        freeSolo
        options={COMMON_EXERCISES}
        value={exerciseName}
        onChange={(event, newValue) => {
          handleFieldChange('exercise_name', newValue || '', setExerciseName);
        }}
        onInputChange={(event, newInputValue) => {
          handleFieldChange('exercise_name', newInputValue, setExerciseName);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Exercise"
            placeholder="e.g., Bench Press"
            error={!!errors.exercise_name}
            helperText={errors.exercise_name}
            variant="outlined"
          />
        )}
        fullWidth
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <TextField
            id="sets"
            label="Sets"
            type="number"
            value={sets}
            onChange={(e) => handleFieldChange('sets', e.target.value, setSets)}
            placeholder="3"
            error={!!errors.sets}
            helperText={errors.sets}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            id="reps"
            label="Reps"
            type="number"
            value={reps}
            onChange={(e) => handleFieldChange('reps', e.target.value, setReps)}
            placeholder="10"
            error={!!errors.reps}
            helperText={errors.reps}
            fullWidth
            variant="outlined"
          />
        </Grid>
      </Grid>

      {sets && parseInt(sets, 10) > 0 && (
        <Box>
          <Box sx={{ mb: 1 }}>
            <Box component="span" sx={{ fontWeight: 500, fontSize: '0.875rem', color: 'text.secondary' }}>
              Weight per Set (kg)
            </Box>
          </Box>
          <Grid container spacing={1}>
            {perSetWeights.map((weight, index) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                <TextField
                  label={`Set ${index + 1}`}
                  type="number"
                  value={weight}
                  onChange={(e) => {
                    const newWeights = [...perSetWeights];
                    newWeights[index] = e.target.value;
                    setPerSetWeights(newWeights);
                    // Clear error for this field when user types
                    if (perSetWeightErrors[index]) {
                      const newErrors = [...perSetWeightErrors];
                      newErrors[index] = '';
                      setPerSetWeightErrors(newErrors);
                      // Clear general per_set_weights error
                      if (errors.per_set_weights) {
                        setErrors(prev => {
                          const updated = { ...prev };
                          delete updated.per_set_weights;
                          return updated;
                        });
                      }
                    }
                  }}
                  placeholder="0"
                  size="small"
                  fullWidth
                  variant="outlined"
                  error={!!perSetWeightErrors[index]}
                  helperText={perSetWeightErrors[index]}
                  slotProps={{ 
                    htmlInput: { step: 0.5, min: 0 }
                  }}
                />
              </Grid>
            ))}
          </Grid>
          {errors.per_set_weights && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="error">{errors.per_set_weights}</Alert>
            </Box>
          )}
        </Box>
      )}

      <Box>
        <Box sx={{ mb: 1 }}>
          <Box component="span" sx={{ fontWeight: 500, fontSize: '0.875rem', color: 'text.secondary' }}>
            Difficulty (RPE 1-10) - Optional
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
            <Button
              key={rating}
              variant={difficultyRating === rating ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleRatingSelect(rating)}
              sx={{ minWidth: 40 }}
            >
              {rating}
            </Button>
          ))}
          {difficultyRating && (
            <Button
              variant="text"
              size="small"
              onClick={handleRatingClear}
            >
              Clear
            </Button>
          )}
        </Box>
        <Box sx={{ mt: 0.5 }}>
          <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            1-3: Easy | 4-6: Moderate | 7-8: Hard | 9-10: Very Hard
          </Box>
        </Box>
      </Box>

      <TextField
        id="notes"
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="How did it feel?"
        multiline
        rows={2}
        fullWidth
        variant="outlined"
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        fullWidth
      >
        {isSubmitting ? 'Saving...' : 'Log Workout'}
      </Button>
    </Box>
  );
}
