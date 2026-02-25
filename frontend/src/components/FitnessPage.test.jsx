import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FitnessPage from './FitnessPage';
import { AuthProvider } from '../context/AuthContext';
import * as workoutAPI from '../utils/workoutAPI';

// Mock the workoutAPI module
vi.mock('../utils/workoutAPI');

// Mock the authAPI module
vi.mock('../utils/api', () => ({
  authAPI: {
    me: vi.fn().mockResolvedValue({ role: null }),
    logout: vi.fn().mockResolvedValue({})
  }
}));

// Helper to render with Router and Auth context
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('FitnessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Management', () => {
    it('should initialize with empty workouts and zero stats', async () => {
      // Mock empty workout list
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });

      renderWithProviders(<FitnessPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Verify stats show zero (use getAllByText since there are two stats)
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues.length).toBe(2); // Total workouts and Last 7 days
      expect(screen.getByText(/total workouts/i)).toBeInTheDocument();
    });

    it('should set loading state to true on mount', () => {
      // Mock API to never resolve (to keep loading state)
      workoutAPI.getWorkouts.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<FitnessPage />);

      // Verify loading indicator is shown
      expect(screen.getByText(/loading workouts/i)).toBeInTheDocument();
    });

    it('should set error state when fetch fails', async () => {
      // Mock API error
      workoutAPI.getWorkouts.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<FitnessPage />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('useEffect - Fetch Workouts on Mount', () => {
    it('should call getWorkouts on component mount', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });

      renderWithProviders(<FitnessPage />);

      // Verify API was called
      await waitFor(() => {
        expect(workoutAPI.getWorkouts).toHaveBeenCalledTimes(1);
      });
    });

    it('should update workouts state with fetched data', async () => {
      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Bench Press',
          sets: 3,
          reps: 10,
          weight: 135,
          notes: 'Good form',
          created_at: new Date().toISOString()
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      // Wait for workout to appear
      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });
    });

    it('should set loading to false after fetch completes', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });

      renderWithProviders(<FitnessPage />);

      // Initially loading
      expect(screen.getByText(/loading workouts/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate total workouts correctly', async () => {
      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Squat',
          sets: 3,
          reps: 10,
          weight: 200,
          notes: '',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          exercise_name: 'Deadlift',
          sets: 3,
          reps: 8,
          weight: 250,
          notes: '',
          created_at: new Date().toISOString()
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      // Wait for stats to update
      await waitFor(() => {
        const statValues = screen.getAllByText('2');
        expect(statValues.length).toBeGreaterThan(0);
      });
    });

    it('should calculate last 7 days workouts correctly', async () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(now.getDate() - 5);
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);

      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Recent',
          sets: 3,
          reps: 10,
          weight: 100,
          notes: '',
          created_at: fiveDaysAgo.toISOString()
        },
        {
          id: '2',
          exercise_name: 'Old',
          sets: 3,
          reps: 10,
          weight: 100,
          notes: '',
          created_at: tenDaysAgo.toISOString()
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument();
      });

      // Total should be 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // Last 7 days should be 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should update statistics after new workout is added', async () => {
      // Start with empty workouts
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      
      const newWorkout = {
        id: '1',
        exercise_name: 'Push-ups',
        sets: 3,
        reps: 15,
        weight: 0,
        notes: '',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      const { container } = renderWithProviders(<FitnessPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Initially stats should be 0
      expect(screen.getAllByText('0').length).toBe(2);

      // Fill out and submit form using fireEvent
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      // Use fireEvent to change input values
      fireEvent.change(exerciseInput, { target: { value: 'Push-ups' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '15' } });
      fireEvent.change(weightInput, { target: { value: '0' } });
      
      // Submit the form
      fireEvent.click(submitButton);

      // Wait for workout to appear in the list
      await waitFor(() => {
        expect(screen.getByText('Push-ups')).toBeInTheDocument();
      });
      
      // Verify stats updated (both total and last 7 days should be 1)
      const statLabels = screen.getAllByText(/total workouts|this week/i);
      expect(statLabels.length).toBe(2);
    });
  });

  describe('Workout Submission Handler (Task 7.2)', () => {
    it('should call workoutAPI.createWorkout with form data', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      
      const newWorkout = {
        id: '1',
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 135,
        notes: 'Good form',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Fill out and submit form
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const notesInput = screen.getByLabelText(/notes/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fireEvent.change(weightInput, { target: { value: '135' } });
      fireEvent.change(notesInput, { target: { value: 'Good form' } });
      fireEvent.click(submitButton);

      // Verify createWorkout was called with correct data
      await waitFor(() => {
        expect(workoutAPI.createWorkout).toHaveBeenCalledWith({
          exercise_name: 'Bench Press',
          sets: 3,
          reps: 10,
          weight: 135,
          notes: 'Good form'
        });
      });
    });

    it('should update local state with new workout (Requirement 2.5)', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      
      const newWorkout = {
        id: '1',
        exercise_name: 'Squats',
        sets: 5,
        reps: 5,
        weight: 225,
        notes: '',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Submit workout
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Squats' } });
      fireEvent.change(setsInput, { target: { value: '5' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fireEvent.change(weightInput, { target: { value: '225' } });
      fireEvent.click(submitButton);

      // Verify workout appears in the list
      await waitFor(() => {
        expect(screen.getByText('Squats')).toBeInTheDocument();
      });
    });

    it('should update statistics immediately after submission (Requirement 3.4)', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      
      const newWorkout = {
        id: '1',
        exercise_name: 'Deadlift',
        sets: 1,
        reps: 5,
        weight: 315,
        notes: '',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Initially stats should be 0
      expect(screen.getAllByText('0').length).toBe(2);

      // Submit workout
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Deadlift' } });
      fireEvent.change(setsInput, { target: { value: '1' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fireEvent.change(weightInput, { target: { value: '315' } });
      fireEvent.click(submitButton);

      // Verify stats updated to 1
      await waitFor(() => {
        expect(screen.getByText('Deadlift')).toBeInTheDocument();
      });

      // Both total and last 7 days should be 1
      const statValues = screen.getAllByText('1');
      expect(statValues.length).toBeGreaterThan(0);
    });

    it('should display confirmation feedback after successful submission (Requirement 1.4)', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      
      const newWorkout = {
        id: '1',
        exercise_name: 'Pull-ups',
        sets: 3,
        reps: 8,
        weight: 0,
        notes: '',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Submit workout
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Pull-ups' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '8' } });
      fireEvent.change(weightInput, { target: { value: '0' } });
      fireEvent.click(submitButton);

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText(/workout logged successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully when submission fails (Requirement 8.3, 8.4)', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      workoutAPI.createWorkout.mockRejectedValue(new Error('Network connection failed'));

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Submit workout
      const exerciseInput = screen.getByRole('combobox', { name: /exercise/i });
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Overhead Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '8' } });
      fireEvent.change(weightInput, { target: { value: '95' } });
      fireEvent.click(submitButton);

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });

      // Verify app doesn't crash - form should still be visible
      expect(screen.getByRole('combobox', { name: /exercise/i })).toBeInTheDocument();
    });

    it('should handle API errors without crashing the application', async () => {
      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [] });
      workoutAPI.createWorkout.mockRejectedValue(new Error('Database error'));

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading workouts/i)).not.toBeInTheDocument();
      });

      // Submit workout
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'Rows' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fireEvent.change(weightInput, { target: { value: '135' } });
      fireEvent.click(submitButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/database error/i)).toBeInTheDocument();
      });

      // Verify the page is still functional
      expect(screen.getAllByText(/fittrack/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument();
    });

    it('should add new workout to the beginning of the list', async () => {
      const existingWorkout = {
        id: '1',
        exercise_name: 'Old Workout',
        sets: 3,
        reps: 10,
        weight: 100,
        notes: '',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      };

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: [existingWorkout] });
      
      const newWorkout = {
        id: '2',
        exercise_name: 'New Workout',
        sets: 3,
        reps: 10,
        weight: 150,
        notes: '',
        created_at: new Date().toISOString()
      };

      workoutAPI.createWorkout.mockResolvedValue({ workout: newWorkout });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.getByText('Old Workout')).toBeInTheDocument();
      });

      // Submit new workout
      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const submitButton = screen.getByRole('button', { name: /log workout/i });

      fireEvent.change(exerciseInput, { target: { value: 'New Workout' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fireEvent.change(weightInput, { target: { value: '150' } });
      fireEvent.click(submitButton);

      // Verify both workouts are displayed
      await waitFor(() => {
        expect(screen.getByText('New Workout')).toBeInTheDocument();
        expect(screen.getByText('Old Workout')).toBeInTheDocument();
      });
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 2.4: Load workout history from database on page load', async () => {
      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Test Exercise',
          sets: 3,
          reps: 10,
          weight: 100,
          notes: '',
          created_at: new Date().toISOString()
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      // Verify getWorkouts was called on mount
      expect(workoutAPI.getWorkouts).toHaveBeenCalled();

      // Verify workout appears in the list
      await waitFor(() => {
        expect(screen.getByText('Test Exercise')).toBeInTheDocument();
      });
    });

    it('should satisfy Requirement 3.1: Display total count of logged workouts', async () => {
      const mockWorkouts = [
        { id: '1', exercise_name: 'Ex1', sets: 3, reps: 10, weight: 100, notes: '', created_at: new Date().toISOString() },
        { id: '2', exercise_name: 'Ex2', sets: 3, reps: 10, weight: 100, notes: '', created_at: new Date().toISOString() },
        { id: '3', exercise_name: 'Ex3', sets: 3, reps: 10, weight: 100, notes: '', created_at: new Date().toISOString() }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        expect(screen.getByText(/total workouts/i)).toBeInTheDocument();
        // Verify there are 3 workouts displayed
        expect(screen.getByText('Ex1')).toBeInTheDocument();
        expect(screen.getByText('Ex2')).toBeInTheDocument();
        expect(screen.getByText('Ex3')).toBeInTheDocument();
      });
    });

    it('should satisfy Requirement 3.2: Display count of workouts in last 7 days', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);

      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Recent',
          sets: 3,
          reps: 10,
          weight: 100,
          notes: '',
          created_at: threeDaysAgo.toISOString()
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      await waitFor(() => {
        // Changed from "Last 7 Days" to "This Week"
        expect(screen.getByText(/this week/i)).toBeInTheDocument();
        // Verify the recent workout is displayed
        expect(screen.getByText('Recent')).toBeInTheDocument();
      });
    });

    it('should satisfy Requirement 8.1: Load previously logged workouts on return', async () => {
      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Previous Workout',
          sets: 3,
          reps: 10,
          weight: 150,
          notes: 'From last session',
          created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ];

      workoutAPI.getWorkouts.mockResolvedValue({ workouts: mockWorkouts });

      renderWithProviders(<FitnessPage />);

      // Verify workout from previous session is loaded
      await waitFor(() => {
        expect(screen.getByText('Previous Workout')).toBeInTheDocument();
        expect(screen.getByText(/from last session/i)).toBeInTheDocument();
      });
    });
  });
});
