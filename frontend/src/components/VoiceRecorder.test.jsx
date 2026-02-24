import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceRecorder from './VoiceRecorder';
import { useVoiceRecording } from '../context/VoiceRecordingContext';

// Mock the VoiceRecordingContext
vi.mock('../context/VoiceRecordingContext');

// Mock Material-UI icons
vi.mock('@mui/icons-material', () => ({
  Mic: () => <div data-testid="mic-icon">Mic</div>,
  Stop: () => <div data-testid="stop-icon">Stop</div>,
  Close: () => <div data-testid="close-icon">Close</div>,
  FiberManualRecord: () => <div data-testid="record-icon">Record</div>,
  Send: () => <div data-testid="send-icon">Send</div>,
  Replay: () => <div data-testid="replay-icon">Replay</div>,
  PlayArrow: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>
}));

describe('VoiceRecorder Component', () => {
  let mockStartRecording;
  let mockStopRecording;
  let mockCancelRecording;
  let mockClearError;
  let mockOnRecordingComplete;
  let mockOnCancel;

  beforeEach(() => {
    // Reset mocks
    mockStartRecording = vi.fn().mockResolvedValue(undefined);
    mockStopRecording = vi.fn();
    mockCancelRecording = vi.fn();
    mockClearError = vi.fn();
    mockOnRecordingComplete = vi.fn();
    mockOnCancel = vi.fn();

    // Default mock implementation
    useVoiceRecording.mockReturnValue({
      isRecording: false,
      duration: 0,
      recordingBlob: null,
      error: null,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      cancelRecording: mockCancelRecording,
      clearError: mockClearError
    });

    // Mock navigator.permissions
    global.navigator.permissions = {
      query: vi.fn().mockResolvedValue({
        state: 'prompt',
        addEventListener: vi.fn()
      })
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render record button when not recording', () => {
      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument();
    });

    it('should have record button enabled initially', () => {
      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const recordButton = screen.getByTitle('Record voice message');
      expect(recordButton).not.toBeDisabled();
    });
  });

  describe('Recording State', () => {
    it('should display stop and cancel buttons when recording', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 5,
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('mic-icon')).not.toBeInTheDocument();
    });

    it('should display duration timer during recording', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 65, // 1 minute 5 seconds
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('should display recording indicator with pulsing animation', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 5,
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('record-icon')).toBeInTheDocument();
    });

    it('should format duration correctly for various times', () => {
      const testCases = [
        { duration: 0, expected: '00:00' },
        { duration: 5, expected: '00:05' },
        { duration: 59, expected: '00:59' },
        { duration: 60, expected: '01:00' },
        { duration: 125, expected: '02:05' },
        { duration: 299, expected: '04:59' }
      ];

      testCases.forEach(({ duration, expected }) => {
        useVoiceRecording.mockReturnValue({
          isRecording: true,
          duration,
          recordingBlob: null,
          error: null,
          startRecording: mockStartRecording,
          stopRecording: mockStopRecording,
          cancelRecording: mockCancelRecording,
          clearError: mockClearError
        });

        const { rerender } = render(
          <VoiceRecorder
            onRecordingComplete={mockOnRecordingComplete}
            onCancel={mockOnCancel}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();

        rerender(<div />); // Unmount
      });
    });
  });

  describe('Button Interactions', () => {
    it('should call startRecording when record button is clicked', async () => {
      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const recordButton = screen.getByTitle('Record voice message');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockStartRecording).toHaveBeenCalledTimes(1);
      });
    });

    it('should call stopRecording when stop button is clicked', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 5,
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const stopButton = screen.getByTitle('Stop recording');
      fireEvent.click(stopButton);

      expect(mockStopRecording).toHaveBeenCalledTimes(1);
    });

    it('should call cancelRecording and onCancel when cancel button is clicked', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 5,
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByTitle('Cancel recording');
      fireEvent.click(cancelButton);

      expect(mockCancelRecording).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Permission Handling', () => {
    it('should display error message when microphone permission is denied', async () => {
      // Mock permission denied
      global.navigator.permissions.query.mockResolvedValue({
        state: 'denied',
        addEventListener: vi.fn()
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
      });
    });

    it('should handle permission request failure gracefully', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockStartRecording.mockRejectedValue(permissionError);

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const recordButton = screen.getByTitle('Record voice message');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockStartRecording).toHaveBeenCalled();
      });
    });
  });

  describe('Error Display', () => {
    it('should display error message when error is present', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: false,
        duration: 0,
        recordingBlob: null,
        error: 'Recording failed. Please try again.',
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Recording failed. Please try again.')).toBeInTheDocument();
    });

    it('should clear error when starting new recording', async () => {
      useVoiceRecording.mockReturnValue({
        isRecording: false,
        duration: 0,
        recordingBlob: null,
        error: 'Previous error',
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      const recordButton = screen.getByTitle('Record voice message');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe('Maximum Duration Handling', () => {
    it('should show max duration warning when approaching limit', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 280, // 4:40, which is 93% of 300 seconds
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
          maxDuration={300}
        />
      );

      expect(screen.getByText('(max: 05:00)')).toBeInTheDocument();
    });

    it('should auto-stop recording at max duration', () => {
      const { rerender } = render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
          maxDuration={300}
        />
      );

      // Update to max duration
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 300,
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      rerender(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
          maxDuration={300}
        />
      );

      expect(mockStopRecording).toHaveBeenCalled();
    });
  });

  describe('Recording Completion', () => {
    it('should enter preview mode when recording is finalized', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      useVoiceRecording.mockReturnValue({
        isRecording: false,
        duration: 10,
        recordingBlob: mockBlob,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      const { container } = render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      // Should enter preview mode with play button
      await waitFor(() => {
        expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      });
      
      // Should have Send and Re-record buttons (check by icon or role)
      expect(screen.getByTestId('send-icon')).toBeInTheDocument();
      expect(screen.getByTestId('replay-icon')).toBeInTheDocument();
      
      // Should NOT call onRecordingComplete yet
      expect(mockOnRecordingComplete).not.toHaveBeenCalled();
    });

    it('should call onRecordingComplete when Send button is clicked in preview mode', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      useVoiceRecording.mockReturnValue({
        isRecording: false,
        duration: 10,
        recordingBlob: mockBlob,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for preview mode
      await waitFor(() => {
        expect(screen.getByTestId('send-icon')).toBeInTheDocument();
      });

      // Find and click the Send button (it's the parent of the send icon)
      const sendIcon = screen.getByTestId('send-icon');
      const sendButton = sendIcon.closest('button');
      fireEvent.click(sendButton);

      // Now it should call onRecordingComplete
      expect(mockOnRecordingComplete).toHaveBeenCalledWith(mockBlob, 10);
    });

    it('should not call onRecordingComplete when still recording', () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 10,
        recordingBlob: mockBlob,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(mockOnRecordingComplete).not.toHaveBeenCalled();
    });
  });

  describe('Custom Max Duration', () => {
    it('should respect custom maxDuration prop', () => {
      useVoiceRecording.mockReturnValue({
        isRecording: true,
        duration: 55, // 91% of 60 seconds
        recordingBlob: null,
        error: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
        clearError: mockClearError
      });

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onCancel={mockOnCancel}
          maxDuration={60}
        />
      );

      expect(screen.getByText('(max: 01:00)')).toBeInTheDocument();
    });
  });
});
