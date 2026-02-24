import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WorkoutForm from './WorkoutForm';
import WorkoutList from './WorkoutList';
import StatsDisplay from './StatsDisplay';
import { createWorkout, getWorkouts } from '../utils/workoutAPI';

export default function FitnessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // State management
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, last7Days: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auto-logout when accessing Fitness page (for disguise feature)
  useEffect(() => {
    if (user) {
      logout();
    }
  }, [user, logout]);

  // Calculate statistics from workout data
  const calculateStats = (workoutData) => {
    const totalWorkouts = workoutData.length;
    
    // Calculate workouts in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7Days = workoutData.filter(workout => {
      const workoutDate = new Date(workout.created_at);
      return workoutDate >= sevenDaysAgo;
    }).length;

    return { totalWorkouts, last7Days };
  };

  // Fetch workouts on component mount
  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getWorkouts();
        setWorkouts(data.workouts);
        setStats(calculateStats(data.workouts));
      } catch (err) {
        setError(err.message || 'Failed to load workouts');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, []);

  // Handle workout submission from WorkoutForm
  const handleWorkoutSubmit = async (workoutData) => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      // Create workout via API
      const result = await createWorkout(workoutData);
      
      // Update local state with new workout
      const updatedWorkouts = [result.workout, ...workouts];
      setWorkouts(updatedWorkouts);
      
      // Recalculate statistics
      setStats(calculateStats(updatedWorkouts));
      
      // Show success message
      setSuccessMessage('Workout logged successfully! 💪');
    } catch (err) {
      setError(err.message || 'Failed to save workout');
      throw err; // Re-throw to let WorkoutForm handle it
    }
  };

  const handleTabChange = (event, newValue) => {
    if (newValue === '/chat' && !user) {
      // Redirect to login if trying to access chat without authentication
      navigate('/login');
    } else {
      navigate(newValue);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* App Bar with Navigation */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mr: { xs: 1, sm: 2 }
            }}
            onClick={() => navigate('/')}
          >
            <FitnessCenterIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              FitTrack
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tabs value={location.pathname} onChange={handleTabChange} sx={{ minHeight: 48 }}>
            <Tab label="Fitness" value="/" sx={{ minWidth: { xs: 80, sm: 120 }, px: { xs: 1, sm: 2 } }} />
            <Tab label="Login" value="/chat" sx={{ minWidth: { xs: 80, sm: 120 }, px: { xs: 1, sm: 2 } }} />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={3000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Stats Display */}
        <Box sx={{ mb: 4 }}>
          <StatsDisplay stats={stats} />
        </Box>

        {/* Two Column Layout */}
        <Grid container spacing={3}>
          {/* Left: Workout Form */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Log New Workout
                </Typography>
              </Box>
              <WorkoutForm onSubmit={handleWorkoutSubmit} />
            </Paper>
          </Grid>

          {/* Right: Workout History */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Recent Workouts
                </Typography>
              </Box>
              <Box sx={{ maxHeight: 600, overflowY: 'auto', pr: 1 }}>
                <WorkoutList workouts={workouts} loading={loading} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
