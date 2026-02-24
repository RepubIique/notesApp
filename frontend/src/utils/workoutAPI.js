import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a separate axios client for workout operations (no auth required)
const workoutClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Create a new workout entry
 * @param {Object} workoutData - The workout data
 * @param {string} workoutData.exercise_name - Name of the exercise
 * @param {number} workoutData.sets - Number of sets (positive integer)
 * @param {number} workoutData.reps - Number of reps (positive integer)
 * @param {number} workoutData.weight - Weight used (non-negative number)
 * @param {string} [workoutData.notes] - Optional notes about the workout
 * @returns {Promise<{workout: Object}>} The created workout with id and created_at
 * @throws {Error} Network error or validation error with details
 */
export const createWorkout = async (workoutData) => {
  try {
    const response = await workoutClient.post('/api/workouts', workoutData);
    return response.data;
  } catch (error) {
    // Handle network errors gracefully
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message || 'Failed to create workout');
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
};

/**
 * Get all workout entries
 * @returns {Promise<{workouts: Array}>} Array of all workouts in reverse chronological order
 * @throws {Error} Network error
 */
export const getWorkouts = async () => {
  try {
    const response = await workoutClient.get('/api/workouts');
    return response.data;
  } catch (error) {
    // Handle network errors gracefully
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message || 'Failed to fetch workouts');
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
};

/**
 * Delete a workout entry
 * @param {number} workoutId - The ID of the workout to delete
 * @returns {Promise<{message: string}>} Success message
 * @throws {Error} Network error or validation error
 */
export const deleteWorkout = async (workoutId) => {
  try {
    const response = await workoutClient.delete(`/api/workouts/${workoutId}`);
    return response.data;
  } catch (error) {
    // Handle network errors gracefully
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message || 'Failed to delete workout');
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
};
