import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { FitnessCenter as FitnessCenterIcon } from '@mui/icons-material';
import WorkoutItem from './WorkoutItem';

function WorkoutList({ workouts, loading }) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {workouts.map((workout) => (
        <WorkoutItem key={workout.id} workout={workout} />
      ))}
    </Box>
  );
}

export default WorkoutList;
