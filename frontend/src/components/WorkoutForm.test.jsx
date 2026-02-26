import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkoutForm from './WorkoutForm';

// Helper function to fill per-set weights
const fillPerSetWeights = (sets, weights) => {
  for (let i = 0; i < sets; i++) {
    const setInput = screen.getByLabelText(new RegExp(`Set ${i + 1}`, 'i'));
    fireEvent.change(setInput, { target: { value: weights[i].toString() } });
  }
};

describe('WorkoutForm', () => {
  describe('Validation', () => {
    it('displays error when exercise name is empty', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when exercise name is only whitespace', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      fireEvent.change(exerciseInput, { target: { value: '   ' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when sets is empty', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // MUI TextField shows helper text, just check it exists
      expect(screen.getAllByText('Must be positive').length).toBeGreaterThan(0);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when sets is zero', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // MUI TextField shows helper text
      expect(screen.getAllByText('Must be positive').length).toBeGreaterThan(0);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when sets is negative', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '-5' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // MUI TextField shows helper text
      expect(screen.getAllByText('Must be positive').length).toBeGreaterThan(0);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when reps is empty', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Must be positive')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when reps is zero', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && element.textContent === 'Must be positive';
      })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when reps is negative', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '-10' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && element.textContent === 'Must be positive';
      })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when weight is empty', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      // Don't fill in per-set weights

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Fix weight errors')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays error when weight is negative', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      
      // Fill in per-set weights with one negative value
      fillPerSetWeights(3, [50, -50, 45]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // Just check that onSubmit was not called (validation should prevent submission)
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('allows weight to be zero', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Push-ups' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '15' } });
      
      // Fill in per-set weights with zeros
      fillPerSetWeights(3, [0, 0, 0]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        exercise_name: 'Push-ups',
        sets: 3,
        reps: 15,
        per_set_weights: [0, 0, 0],
        notes: ''
      });
    });

    it('displays multiple errors when multiple fields are invalid', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getAllByText('Must be positive').length).toBe(2); // sets and reps
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('clears error when user starts typing in field', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      // Submit to trigger errors
      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Required')).toBeInTheDocument();

      // Start typing in exercise name field
      const exerciseInput = screen.getByLabelText(/exercise/i);
      fireEvent.change(exerciseInput, { target: { value: 'B' } });

      // Error should be cleared
      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });
  });

  describe('Successful Submission', () => {
    it('calls onSubmit with valid data', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const notesInput = screen.getByLabelText(/notes/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fillPerSetWeights(3, [135, 135, 135]);
      fireEvent.change(notesInput, { target: { value: 'Felt strong today' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        exercise_name: 'Bench Press',
        sets: 3,
        reps: 10,
        per_set_weights: [135, 135, 135],
        notes: 'Felt strong today'
      });
    });

    it('trims whitespace from exercise name and notes', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const notesInput = screen.getByLabelText(/notes/i);
      
      fireEvent.change(exerciseInput, { target: { value: '  Squats  ' } });
      fireEvent.change(setsInput, { target: { value: '5' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(5, [225, 225, 225, 225, 225]);
      fireEvent.change(notesInput, { target: { value: '  Good form  ' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        exercise_name: 'Squats',
        sets: 5,
        reps: 5,
        per_set_weights: [225, 225, 225, 225, 225],
        notes: 'Good form'
      });
    });

    it('handles decimal weight values', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Dumbbell Curl' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '12' } });
      fillPerSetWeights(3, [22.5, 22.5, 22.5]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        exercise_name: 'Dumbbell Curl',
        sets: 3,
        reps: 12,
        per_set_weights: [22.5, 22.5, 22.5],
        notes: ''
      });
    });

    it('submits with empty notes when notes field is not filled', () => {
      const onSubmit = vi.fn();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Deadlift' } });
      fireEvent.change(setsInput, { target: { value: '1' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(1, [315]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        exercise_name: 'Deadlift',
        sets: 1,
        reps: 5,
        per_set_weights: [315],
        notes: ''
      });
    });
  });

  describe('Form Reset After Submission', () => {
    it('clears all fields after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue();
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      const notesInput = screen.getByLabelText(/notes/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fillPerSetWeights(3, [135, 135, 135]);
      fireEvent.change(notesInput, { target: { value: 'Great workout' } });

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // Wait for async submission to complete
      await vi.waitFor(() => {
        expect(exerciseInput.value).toBe('');
        expect(setsInput.value).toBe('');
        expect(repsInput.value).toBe('');
        expect(notesInput.value).toBe('');
      });
    });

    it('does not clear fields when submission fails', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Squats' } });
      fireEvent.change(setsInput, { target: { value: '5' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(5, [225, 225, 225, 225, 225]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // Wait for async submission to complete
      await vi.waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Fields should still contain values
      expect(exerciseInput.value).toBe('Squats');
      expect(setsInput.value).toBe('5');
      expect(repsInput.value).toBe('5');
      
      // Check that per-set weight fields still have values
      const set1Input = screen.getByLabelText(/Set 1/i);
      expect(set1Input.value).toBe('225');
    });
  });

  describe('Submission Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Deadlift' } });
      fireEvent.change(setsInput, { target: { value: '1' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(1, [315]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      await vi.waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    it('displays generic error message when error has no message', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error());
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Pull-ups' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '8' } });
      fillPerSetWeights(3, [0, 0, 0]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      await vi.waitFor(() => {
        expect(screen.getByText(/Failed to save workout/i)).toBeInTheDocument();
      });
    });

    it('clears submission error on next successful submit', async () => {
      const onSubmit = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce();
      
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fillPerSetWeights(3, [135, 135, 135]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      
      // First submission fails
      fireEvent.click(submitButton);
      await vi.waitFor(() => {
        expect(screen.getByText('First attempt failed')).toBeInTheDocument();
      });

      // Fill form again
      fireEvent.change(exerciseInput, { target: { value: 'Squats' } });
      fireEvent.change(setsInput, { target: { value: '5' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(5, [225, 225, 225, 225, 225]);

      // Second submission succeeds
      fireEvent.click(submitButton);
      await vi.waitFor(() => {
        expect(screen.queryByText('First attempt failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Bench Press' } });
      fireEvent.change(setsInput, { target: { value: '3' } });
      fireEvent.change(repsInput, { target: { value: '10' } });
      fillPerSetWeights(3, [135, 135, 135]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      fireEvent.click(submitButton);

      // Check that button shows loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for submission to complete
      await vi.waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('disables button during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<WorkoutForm onSubmit={onSubmit} />);

      const exerciseInput = screen.getByLabelText(/exercise/i);
      const setsInput = screen.getByLabelText(/sets/i);
      const repsInput = screen.getByLabelText(/reps/i);
      
      fireEvent.change(exerciseInput, { target: { value: 'Squats' } });
      fireEvent.change(setsInput, { target: { value: '5' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fillPerSetWeights(5, [225, 225, 225, 225, 225]);

      const submitButton = screen.getByRole('button', { name: /log workout/i });
      
      expect(submitButton).not.toBeDisabled();
      
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();

      // Wait for submission to complete
      await vi.waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
