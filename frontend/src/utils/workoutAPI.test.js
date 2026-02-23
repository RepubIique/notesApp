import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios before importing the module
const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet
    }))
  }
}));

// Import after mocking
const { createWorkout, getWorkouts } = await import('./workoutAPI');

describe('workoutAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkout', () => {
    it('should successfully create a workout', async () => {
      const workoutData = {
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 135,
        notes: 'Felt strong today'
      };

      const mockResponse = {
        data: {
          workout: {
            id: '123',
            ...workoutData,
            created_at: '2024-01-01T12:00:00Z'
          }
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await createWorkout(workoutData);

      expect(mockPost).toHaveBeenCalledWith('/api/workouts', workoutData);
      expect(result).toEqual(mockResponse.data);
      expect(result.workout.id).toBe('123');
    });

    it('should handle server error responses', async () => {
      const workoutData = {
        exercise_name: 'Squat',
        sets: 5,
        reps: 5,
        weight: 225
      };

      const mockError = {
        response: {
          data: {
            message: 'Database operation failed'
          }
        }
      };

      mockPost.mockRejectedValue(mockError);

      await expect(createWorkout(workoutData)).rejects.toThrow('Database operation failed');
    });

    it('should handle network errors (no response)', async () => {
      const workoutData = {
        exercise_name: 'Deadlift',
        sets: 1,
        reps: 5,
        weight: 315
      };

      const mockError = {
        request: {}
      };

      mockPost.mockRejectedValue(mockError);

      await expect(createWorkout(workoutData)).rejects.toThrow(
        'Unable to connect to server. Please check your connection.'
      );
    });

    it('should handle unexpected errors', async () => {
      const workoutData = {
        exercise_name: 'Pull-ups',
        sets: 3,
        reps: 8,
        weight: 0
      };

      const mockError = new Error('Something went wrong');

      mockPost.mockRejectedValue(mockError);

      await expect(createWorkout(workoutData)).rejects.toThrow(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should handle validation errors from server', async () => {
      const invalidWorkoutData = {
        exercise_name: '',
        sets: -1,
        reps: 0,
        weight: -5
      };

      const mockError = {
        response: {
          data: {
            error: 'Validation failed',
            message: 'Invalid workout data'
          }
        }
      };

      mockPost.mockRejectedValue(mockError);

      await expect(createWorkout(invalidWorkoutData)).rejects.toThrow('Invalid workout data');
    });
  });

  describe('getWorkouts', () => {
    it('should successfully fetch all workouts', async () => {
      const mockWorkouts = [
        {
          id: '1',
          exercise_name: 'Bench Press',
          sets: 3,
          reps: 10,
          weight: 135,
          notes: 'Good session',
          created_at: '2024-01-02T12:00:00Z'
        },
        {
          id: '2',
          exercise_name: 'Squat',
          sets: 5,
          reps: 5,
          weight: 225,
          notes: '',
          created_at: '2024-01-01T12:00:00Z'
        }
      ];

      const mockResponse = {
        data: {
          workouts: mockWorkouts
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await getWorkouts();

      expect(mockGet).toHaveBeenCalledWith('/api/workouts');
      expect(result).toEqual(mockResponse.data);
      expect(result.workouts).toHaveLength(2);
      expect(result.workouts[0].exercise_name).toBe('Bench Press');
    });

    it('should return empty array when no workouts exist', async () => {
      const mockResponse = {
        data: {
          workouts: []
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await getWorkouts();

      expect(result.workouts).toEqual([]);
    });

    it('should handle server error responses', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Database connection failed'
          }
        }
      };

      mockGet.mockRejectedValue(mockError);

      await expect(getWorkouts()).rejects.toThrow('Database connection failed');
    });

    it('should handle network errors (no response)', async () => {
      const mockError = {
        request: {}
      };

      mockGet.mockRejectedValue(mockError);

      await expect(getWorkouts()).rejects.toThrow(
        'Unable to connect to server. Please check your connection.'
      );
    });

    it('should handle unexpected errors', async () => {
      const mockError = new Error('Unexpected error');

      mockGet.mockRejectedValue(mockError);

      await expect(getWorkouts()).rejects.toThrow(
        'An unexpected error occurred. Please try again.'
      );
    });
  });
});
