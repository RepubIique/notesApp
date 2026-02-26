import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkoutItem from './WorkoutItem';

describe('WorkoutItem', () => {
  const mockOnDelete = vi.fn();

  describe('Legacy weight display', () => {
    it('displays single weight chip with ScaleIcon when per_set_weights is NULL', () => {
      const legacyWorkout = {
        id: '1',
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 50,
        per_set_weights: null,
        difficulty_rating: null,
        notes: '',
        created_at: '2024-01-01T10:00:00Z'
      };

      render(<WorkoutItem workout={legacyWorkout} onDelete={mockOnDelete} />);

      // Verify legacy weight is displayed
      expect(screen.getByText('50 kg')).toBeInTheDocument();
      
      // Verify per-set weights section is not displayed
      expect(screen.queryByText('Weight per Set:')).not.toBeInTheDocument();
    });

    it('displays single weight chip when per_set_weights is undefined', () => {
      const legacyWorkout = {
        id: '2',
        exercise_name: 'Squats',
        sets: 4,
        reps: 8,
        weight: 100,
        notes: 'Legacy workout',
        created_at: '2024-01-01T11:00:00Z'
      };

      render(<WorkoutItem workout={legacyWorkout} onDelete={mockOnDelete} />);

      // Verify legacy weight is displayed
      expect(screen.getByText('100 kg')).toBeInTheDocument();
      
      // Verify per-set weights section is not displayed
      expect(screen.queryByText('Weight per Set:')).not.toBeInTheDocument();
    });

    it('maintains existing styling for legacy workouts', () => {
      const legacyWorkout = {
        id: '3',
        exercise_name: 'Deadlift',
        sets: 5,
        reps: 5,
        weight: 150,
        per_set_weights: null,
        notes: '',
        created_at: '2024-01-01T12:00:00Z'
      };

      const { container } = render(<WorkoutItem workout={legacyWorkout} onDelete={mockOnDelete} />);

      // Verify the weight chip exists with proper styling
      const weightChip = screen.getByText('150 kg').closest('.MuiChip-root');
      expect(weightChip).toBeInTheDocument();
    });
  });

  describe('Per-set weights display', () => {
    it('displays per-set weights when per_set_weights array is provided', () => {
      const perSetWorkout = {
        id: '4',
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 40,
        per_set_weights: [40, 50, 45],
        difficulty_rating: null,
        notes: '',
        created_at: '2024-01-01T13:00:00Z'
      };

      render(<WorkoutItem workout={perSetWorkout} onDelete={mockOnDelete} />);

      // Verify per-set weights section is displayed
      expect(screen.getByText('Weight per Set')).toBeInTheDocument();
      expect(screen.getByText('Set 1: 40kg')).toBeInTheDocument();
      expect(screen.getByText('Set 2: 50kg')).toBeInTheDocument();
      expect(screen.getByText('Set 3: 45kg')).toBeInTheDocument();

      // Verify legacy weight chip is not displayed in stats section
      expect(screen.queryByText('40 kg')).not.toBeInTheDocument();
    });

    it('does not display legacy weight chip when per_set_weights is present', () => {
      const perSetWorkout = {
        id: '5',
        exercise_name: 'Squats',
        sets: 2,
        reps: 12,
        weight: 60,
        per_set_weights: [60, 65],
        notes: '',
        created_at: '2024-01-01T14:00:00Z'
      };

      render(<WorkoutItem workout={perSetWorkout} onDelete={mockOnDelete} />);

      // Verify per-set weights are displayed
      expect(screen.getByText('Set 1: 60kg')).toBeInTheDocument();
      expect(screen.getByText('Set 2: 65kg')).toBeInTheDocument();

      // Verify legacy weight chip is not in the stats section
      const statsSection = screen.getByText('2 sets').closest('.MuiBox-root');
      expect(statsSection).not.toHaveTextContent('60 kg');
    });
  });

  describe('Backward compatibility', () => {
    it('displays legacy workouts correctly without errors', () => {
      const legacyWorkout = {
        id: '6',
        exercise_name: 'Pull-ups',
        sets: 3,
        reps: 10,
        weight: 0,
        per_set_weights: null,
        difficulty_rating: null,
        notes: 'Bodyweight exercise',
        created_at: '2024-01-01T15:00:00Z'
      };

      render(<WorkoutItem workout={legacyWorkout} onDelete={mockOnDelete} />);

      // Verify all elements are displayed correctly
      expect(screen.getByText('Pull-ups')).toBeInTheDocument();
      expect(screen.getByText('3 sets')).toBeInTheDocument();
      expect(screen.getByText('10 reps')).toBeInTheDocument();
      expect(screen.getByText('0 kg')).toBeInTheDocument();
      expect(screen.getByText('Bodyweight exercise')).toBeInTheDocument();
    });
  });

  describe('Difficulty rating display', () => {
    it('displays difficulty rating prominently when present', () => {
      const workoutWithRating = {
        id: '7',
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 50,
        per_set_weights: null,
        difficulty_rating: 8,
        notes: '',
        created_at: '2024-01-01T16:00:00Z'
      };

      render(<WorkoutItem workout={workoutWithRating} onDelete={mockOnDelete} />);

      // Verify difficulty rating is displayed
      expect(screen.getByText(/RPE 8 - Hard/)).toBeInTheDocument();
    });

    it('does not display difficulty rating when null', () => {
      const workoutWithoutRating = {
        id: '8',
        exercise_name: 'Squats',
        sets: 3,
        reps: 10,
        weight: 100,
        per_set_weights: null,
        difficulty_rating: null,
        notes: '',
        created_at: '2024-01-01T17:00:00Z'
      };

      render(<WorkoutItem workout={workoutWithoutRating} onDelete={mockOnDelete} />);

      // Verify difficulty rating is not displayed
      expect(screen.queryByText(/RPE/)).not.toBeInTheDocument();
    });
  });

  describe('Layout and visual hierarchy', () => {
    it('displays per-set weights with proper spacing and layout', () => {
      const perSetWorkout = {
        id: '9',
        exercise_name: 'Bench Press',
        sets: 4,
        reps: 10,
        weight: 40,
        per_set_weights: [40, 45, 50, 45],
        difficulty_rating: 7,
        notes: 'Progressive overload',
        created_at: '2024-01-01T18:00:00Z'
      };

      render(<WorkoutItem workout={perSetWorkout} onDelete={mockOnDelete} />);

      // Verify all per-set weights are displayed
      expect(screen.getByText('Set 1: 40kg')).toBeInTheDocument();
      expect(screen.getByText('Set 2: 45kg')).toBeInTheDocument();
      expect(screen.getByText('Set 3: 50kg')).toBeInTheDocument();
      expect(screen.getByText('Set 4: 45kg')).toBeInTheDocument();

      // Verify difficulty rating is displayed
      expect(screen.getByText(/RPE 7 - Hard/)).toBeInTheDocument();

      // Verify notes are displayed
      expect(screen.getByText('Progressive overload')).toBeInTheDocument();
    });

    it('maintains clean layout with all elements present', () => {
      const fullWorkout = {
        id: '10',
        exercise_name: 'Deadlift',
        sets: 3,
        reps: 5,
        weight: 100,
        per_set_weights: [100, 110, 105],
        difficulty_rating: 9,
        notes: 'Heavy day',
        created_at: '2024-01-01T19:00:00Z'
      };

      const { container } = render(<WorkoutItem workout={fullWorkout} onDelete={mockOnDelete} />);

      // Verify all sections are present
      expect(screen.getByText('Deadlift')).toBeInTheDocument();
      expect(screen.getByText(/RPE 9 - Very Hard/)).toBeInTheDocument();
      expect(screen.getByText('3 sets')).toBeInTheDocument();
      expect(screen.getByText('5 reps')).toBeInTheDocument();
      expect(screen.getByText('Weight per Set')).toBeInTheDocument();
      expect(screen.getByText('Set 1: 100kg')).toBeInTheDocument();
      expect(screen.getByText('Set 2: 110kg')).toBeInTheDocument();
      expect(screen.getByText('Set 3: 105kg')).toBeInTheDocument();
      expect(screen.getByText('Heavy day')).toBeInTheDocument();

      // Verify Card component is rendered
      expect(container.querySelector('.MuiCard-root')).toBeInTheDocument();
    });

    it('handles workouts with many sets without layout issues', () => {
      const manySetWorkout = {
        id: '11',
        exercise_name: 'Bicep Curls',
        sets: 8,
        reps: 12,
        weight: 15,
        per_set_weights: [15, 15, 17.5, 17.5, 20, 20, 17.5, 15],
        difficulty_rating: 6,
        notes: '',
        created_at: '2024-01-01T20:00:00Z'
      };

      render(<WorkoutItem workout={manySetWorkout} onDelete={mockOnDelete} />);

      // Verify all 8 sets are displayed
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByText(new RegExp(`Set ${i}:`))).toBeInTheDocument();
      }

      // Verify layout accommodates all chips
      expect(screen.getByText('Weight per Set')).toBeInTheDocument();
    });
  });
});
