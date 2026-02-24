import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Repeat as RepeatIcon,
  Scale as ScaleIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

function WorkoutItem({ workout, onDelete }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(workout.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      // Error is handled by parent component
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };
  // Format timestamp in readable format
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card 
        variant="outlined" 
        sx={{ 
          '&:hover': { 
            borderColor: 'primary.main',
            boxShadow: 1
          },
          transition: 'all 0.2s'
        }}
      >
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
              {workout.exercise_name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(workout.created_at)}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleDeleteClick}
                sx={{ 
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', color: 'error.dark' }
                }}
                aria-label="Delete workout"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        
        {/* Stats chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: workout.notes ? 2 : 0 }}>
          <Chip 
            icon={<FitnessCenterIcon />}
            label={`${workout.sets} sets`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip 
            icon={<RepeatIcon />}
            label={`${workout.reps} reps`}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip 
            icon={<ScaleIcon />}
            label={`${workout.weight} kgs`}
            size="small"
            color="warning"
            variant="outlined"
          />
        </Box>

        {/* Notes */}
        {workout.notes && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {workout.notes}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <Dialog
      open={deleteDialogOpen}
      onClose={handleDeleteCancel}
      aria-labelledby="delete-dialog-title"
    >
      <DialogTitle id="delete-dialog-title">
        Delete Workout?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this workout log for {workout.exercise_name}? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDeleteCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button 
          onClick={handleDeleteConfirm} 
          color="error" 
          variant="contained"
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

export default WorkoutItem;
