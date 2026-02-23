import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  CalendarToday as CalendarIcon,
  LocalFireDepartment as FireIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';

function StatsDisplay({ stats }) {
  const getStreakInfo = () => {
    if (stats.last7Days >= 5) return { icon: <FireIcon />, text: 'On Fire!', color: 'error' };
    if (stats.last7Days >= 3) return { icon: <FitnessCenterIcon />, text: 'Strong', color: 'success' };
    return { icon: <CalendarIcon />, text: 'Getting Started', color: 'info' };
  };

  const streak = getStreakInfo();

  return (
    <Grid container spacing={2}>
      {/* Total Workouts */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderWidth: 2,
            borderColor: 'primary.light',
            '&:hover': { borderColor: 'primary.main' },
            transition: 'border-color 0.2s'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h3" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
              {stats.totalWorkouts}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, display: 'block' }}>
              Total Workouts
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Last 7 Days */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderWidth: 2,
            borderColor: 'success.light',
            '&:hover': { borderColor: 'success.main' },
            transition: 'border-color 0.2s'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h3" component="div" color="success.main" sx={{ fontWeight: 'bold' }}>
              {stats.last7Days}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, display: 'block' }}>
              This Week
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Streak Indicator */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderWidth: 2,
            borderColor: `${streak.color}.light`,
            '&:hover': { borderColor: `${streak.color}.main` },
            transition: 'border-color 0.2s'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Box sx={{ fontSize: 48, color: `${streak.color}.main` }}>
              {streak.icon}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, display: 'block' }}>
              {streak.text}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Tip */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderWidth: 2,
            borderColor: 'secondary.light',
            '&:hover': { borderColor: 'secondary.main' },
            transition: 'border-color 0.2s'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <LightbulbIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, display: 'block' }}>
              Track Daily
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default StatsDisplay;
