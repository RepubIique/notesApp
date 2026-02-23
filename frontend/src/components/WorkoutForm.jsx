import { useState } from 'react';
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
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    const weightNum = parseFloat(weight);
    if (weight === '' || isNaN(weightNum) || weightNum < 0) newErrors.weight = 'Must be 0 or more';

    return newErrors;
  };

  const resetForm = () => {
    setExerciseName('');
    setSets('');
    setReps('');
    setWeight('');
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
      weight: parseFloat(weight),
      notes: notes.trim()
    };

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
        <Grid size={{ xs: 4 }}>
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
        <Grid size={{ xs: 4 }}>
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
        <Grid size={{ xs: 4 }}>
          <TextField
            id="weight"
            label="Weight (KG)"
            type="number"
            value={weight}
            onChange={(e) => handleFieldChange('weight', e.target.value, setWeight)}
            placeholder="135"
            error={!!errors.weight}
            helperText={errors.weight}
            fullWidth
            variant="outlined"
            inputProps={{ step: 0.5 }}
          />
        </Grid>
      </Grid>

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
