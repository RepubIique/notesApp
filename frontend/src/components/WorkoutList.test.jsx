import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkoutList from './WorkoutList';

// Mock WorkoutItem component
vi.mock('./WorkoutItem', () => ({
  default: ({ workout }) => (
    <div data-testid={`workout-${workout.id}`}>
      {workout.exercise_name} - {workout.sets}x{workout.reps} @ {workout.weight}kg
    </div>
  )
}));

describe('WorkoutList', () => {
  it('displays loading indicator when loading is true', () => {
    render(<WorkoutList workouts={[]} loading={true} />);
    expect(screen.getByText(/Loading workouts/i)).toBeInTheDocument();
  });

  it('displays empty state when no workouts exist', () => {
    render(<WorkoutList workouts={[]} loading={false} />);
    expect(screen.getByText(/No workouts yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Start logging your workouts/i)).toBeInTheDocument();
  });

  it('displays empty state when workouts is null', () => {
    render(<WorkoutList workouts={null} loading={false} />);
    expect(screen.getByText(/No workouts yet/i)).toBeInTheDocument();
  });

  it('renders array of WorkoutItem components', () => {
    const workouts = [
      {
        id: '1',
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 135,
        created_at: '2024-01-01T10:00:00Z'
      },
      {
        id: '2',
        exercise_name: 'Squats',
        sets: 4,
        reps: 8,
        weight: 225,
        created_at: '2024-01-01T11:00:00Z'
      },
      {
        id: '3',
        exercise_name: 'Deadlift',
        sets: 5,
        reps: 5,
        weight: 315,
        created_at: '2024-01-01T12:00:00Z'
      }
    ];

    render(<WorkoutList workouts={workouts} loading={false} />);

    // All workouts should be rendered
    expect(screen.getByTestId('workout-1')).toBeInTheDocument();
    expect(screen.getByTestId('workout-2')).toBeInTheDocument();
    expect(screen.getByTestId('workout-3')).toBeInTheDocument();

    // Verify workout details are passed correctly
    expect(screen.getByText(/Bench Press - 3x10 @ 135kgs/)).toBeInTheDocument();
    expect(screen.getByText(/Squats - 4x8 @ 225kgs/)).toBeInTheDocument();
    expect(screen.getByText(/Deadlift - 5x5 @ 315kgs/)).toBeInTheDocument();
  });
});
