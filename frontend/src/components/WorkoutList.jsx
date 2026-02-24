import React from 'react';
import { Box, CircularProgress, Typography, Alert, Snackbar } from '@mui/material';
import { FitnessCenter as FitnessCenterIcon } from '@mui/icons-material';
import WorkoutItem from './WorkoutItem';
import { deleteWorkout } from '../utils/workoutAPI';

function WorkoutList({ workouts, loading, onWorkoutDeleted }) {
  const [error, setError] = React.useState(null);
  const [successMessage, setSuccessMessage] = React.useState(null);

  const handleDelete = async (workoutId) => {
    try {
      await deleteWorkout(workoutId);
      setSuccessMessage('Workout deleted successfully');
      // Notify parent component to refresh the list
      if (onWorkoutDeleted) {
        onWorkoutDeleted(workoutId);
      }
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw to let WorkoutItem handle the loading state
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccessMessage(null);
  };
  // Show loading indicator during data fetch
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading workouts...
        </Typography>
      </Box>
    );
  }

  // Display empty state message when no workouts exist
  if (!workouts || workouts.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center' }}>
        <FitnessCenterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          No workouts yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
          Start logging your workouts to track your progress!
        </Typography>
      </Box>
    );
  }

  // Render array of WorkoutItem components
  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {workouts.map((workout) => (
          <WorkoutItem key={workout.id} workout={workout} onDelete={handleDelete} />
        ))}
      </Box>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={3000} 
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default WorkoutList;
