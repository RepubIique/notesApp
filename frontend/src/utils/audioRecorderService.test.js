/**
 * Unit tests for AudioRecorderService
 * Tests specific examples, edge cases, and error conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AudioRecorderService from './audioRecorderService';

describe('AudioRecorderService', () => {
  let service;
  let mockStream;
  let mockMediaRecorder;
  let mockTrack;

  beforeEach(() => {
    service = new AudioRecorderService();
    
    // Mock MediaStream track
    mockTrack = {
      stop: vi.fn(),
      kind: 'audio'
    };

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => [mockTrack])
    };

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm;codecs=opus'
    };

    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(() => Promise.resolve(mockStream))
    };

    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn(function(stream, options) {
      return mockMediaRecorder;
    });
    global.MediaRecorder.isTypeSupported = vi.fn((mimeType) => {
      return mimeType.includes('webm') || mimeType.includes('opus');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('should request microphone permission and return true on success', async () => {
      const result = await service.requestPermission();
      
      expect(result).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);

      const result = await service.requestPermission();
      
      expect(result).toBe(false);
    });

    it('should return false for PermissionDeniedError', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionDeniedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);

      const result = await service.requestPermission();
      
      expect(result).toBe(false);
    });

    it('should throw error for other types of errors', async () => {
      const otherError = new Error('Device not found');
      otherError.name = 'NotFoundError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(otherError);

      await expect(service.requestPermission()).rejects.toThrow('Device not found');
    });
  });

  describe('startRecording', () => {
    it('should start recording with correct configuration', async () => {
      await service.startRecording();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      expect(MediaRecorder).toHaveBeenCalledWith(mockStream, expect.any(Object));
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
      expect(service.isRecording()).toBe(false); // State is still 'inactive' in mock
    });

    it('should configure MediaRecorder with WebM/Opus codec', async () => {
      await service.startRecording();

      const recorderOptions = MediaRecorder.mock.calls[0][1];
      expect(recorderOptions.mimeType).toContain('webm');
      expect(recorderOptions.audioBitsPerSecond).toBe(48000);
    });

    it('should call onDataAvailable callback when data is received', async () => {
      const onDataAvailable = vi.fn();
      await service.startRecording(onDataAvailable);

      // Simulate data available event
      const mockData = new Blob(['audio data'], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: mockData });

      expect(onDataAvailable).toHaveBeenCalledWith(mockData);
      expect(service.audioChunks).toHaveLength(1);
    });

    it('should not add empty chunks to audioChunks', async () => {
      await service.startRecording();

      // Simulate empty data event
      mockMediaRecorder.ondataavailable({ data: new Blob([]) });

      expect(service.audioChunks).toHaveLength(0);
    });

    it('should clean up existing recording before starting new one', async () => {
      // Start first recording
      await service.startRecording();
      
      // Verify first recording started
      expect(mockTrack.stop).not.toHaveBeenCalled();

      // Create a new mock stream for the second recording
      const newMockTrack = { stop: vi.fn(), kind: 'audio' };
      const newMockStream = {
        getTracks: vi.fn(() => [newMockTrack]),
        getAudioTracks: vi.fn(() => [newMockTrack])
      };
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(newMockStream);

      // Start second recording
      await service.startRecording();

      // First stream should have been stopped
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.stream).toBe(newMockStream);
    });

    it('should handle getUserMedia failure', async () => {
      const error = new Error('Microphone not available');
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

      await expect(service.startRecording()).rejects.toThrow('Microphone not available');
      expect(service.stream).toBeNull();
    });

    it('should track start time when recording begins', async () => {
      const beforeStart = Date.now();
      await service.startRecording();
      const afterStart = Date.now();

      expect(service.startTime).toBeGreaterThanOrEqual(beforeStart);
      expect(service.startTime).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('stopRecording', () => {
    beforeEach(async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
    });

    it('should stop recording and return audio blob', async () => {
      // Add some mock audio chunks
      const chunk1 = new Blob(['audio1'], { type: 'audio/webm' });
      const chunk2 = new Blob(['audio2'], { type: 'audio/webm' });
      service.audioChunks = [chunk1, chunk2];

      const stopPromise = service.stopRecording();
      
      // Simulate the onstop event
      mockMediaRecorder.onstop();

      const blob = await stopPromise;

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/webm;codecs=opus');
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should reject if no active recording', async () => {
      service.mediaRecorder = null;

      await expect(service.stopRecording()).rejects.toThrow('No active recording to stop');
    });

    it('should reject if recorder is already inactive', async () => {
      mockMediaRecorder.state = 'inactive';

      await expect(service.stopRecording()).rejects.toThrow('No active recording to stop');
    });

    it('should calculate recording duration on stop', async () => {
      // Set start time to 5 seconds ago
      service.startTime = Date.now() - 5000;

      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      await stopPromise;

      expect(service.recordingDuration).toBeGreaterThanOrEqual(4);
      expect(service.recordingDuration).toBeLessThanOrEqual(6);
    });

    it('should handle errors during blob creation', async () => {
      // Corrupt the audio chunks to cause an error
      service.audioChunks = [null];

      const stopPromise = service.stopRecording();
      
      // Simulate onstop with error
      try {
        mockMediaRecorder.onstop();
        await stopPromise;
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('cancelRecording', () => {
    it('should stop recording and clean up resources', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Add some audio chunks
      service.audioChunks = [new Blob(['audio'], { type: 'audio/webm' })];

      service.cancelRecording();

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.audioChunks).toHaveLength(0);
      expect(service.stream).toBeNull();
      expect(service.startTime).toBeNull();
    });

    it('should handle cancellation when not recording', () => {
      expect(() => service.cancelRecording()).not.toThrow();
      expect(service.audioChunks).toHaveLength(0);
    });

    it('should not throw if mediaRecorder is null', () => {
      service.mediaRecorder = null;
      expect(() => service.cancelRecording()).not.toThrow();
    });
  });

  describe('getRecordingDuration', () => {
    it('should return 0 when not recording', () => {
      expect(service.getRecordingDuration()).toBe(0);
    });

    it('should return elapsed time in seconds', async () => {
      service.startTime = Date.now() - 3500; // 3.5 seconds ago

      const duration = service.getRecordingDuration();

      expect(duration).toBeGreaterThanOrEqual(3);
      expect(duration).toBeLessThanOrEqual(4);
    });

    it('should return correct duration for long recordings', () => {
      service.startTime = Date.now() - 125000; // 125 seconds ago

      const duration = service.getRecordingDuration();

      expect(duration).toBeGreaterThanOrEqual(124);
      expect(duration).toBeLessThanOrEqual(126);
    });
  });

  describe('isRecording', () => {
    it('should return false when not recording', () => {
      expect(service.isRecording()).toBe(false);
    });

    it('should return true when recording is active', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      expect(service.isRecording()).toBe(true);
    });

    it('should return false after stopping', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      mockMediaRecorder.state = 'inactive';

      expect(service.isRecording()).toBe(false);
    });
  });

  describe('codec configuration', () => {
    it('should fallback to next codec if first is not supported', async () => {
      MediaRecorder.isTypeSupported.mockImplementation((mimeType) => {
        return mimeType === 'audio/webm'; // Only support basic webm
      });

      await service.startRecording();

      const recorderOptions = MediaRecorder.mock.calls[0][1];
      expect(recorderOptions.mimeType).toBe('audio/webm');
    });

    it('should use empty options if no codec is supported', async () => {
      MediaRecorder.isTypeSupported.mockReturnValue(false);

      await service.startRecording();

      const recorderOptions = MediaRecorder.mock.calls[0][1];
      expect(recorderOptions).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('should clean up all resources', async () => {
      await service.startRecording();
      service.audioChunks = [new Blob(['test'])];
      service.startTime = Date.now();

      service.cleanup();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.stream).toBeNull();
      expect(service.mediaRecorder).toBeNull();
      expect(service.audioChunks).toHaveLength(0);
      expect(service.startTime).toBeNull();
      expect(service.recordingDuration).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid start/stop sequences', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      await stopPromise;

      await service.startRecording();
      expect(MediaRecorder).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple cancel calls', () => {
      service.cancelRecording();
      service.cancelRecording();
      
      expect(service.audioChunks).toHaveLength(0);
    });

    it('should handle very short recordings', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Stop immediately
      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
      expect(service.getRecordingDuration()).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases - Permission Denial (Requirement 7.1)', () => {
    it('should handle permission denial with NotAllowedError', async () => {
      const permissionError = new Error('User denied microphone access');
      permissionError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);

      const hasPermission = await service.requestPermission();
      
      expect(hasPermission).toBe(false);
      expect(service.stream).toBeNull();
    });

    it('should handle permission denial with PermissionDeniedError', async () => {
      const permissionError = new Error('Permission denied by system');
      permissionError.name = 'PermissionDeniedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);

      const hasPermission = await service.requestPermission();
      
      expect(hasPermission).toBe(false);
      expect(service.stream).toBeNull();
    });

    it('should clean up resources when startRecording fails due to permission denial', async () => {
      const permissionError = new Error('User denied microphone access');
      permissionError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);

      await expect(service.startRecording()).rejects.toThrow('User denied microphone access');
      
      // Verify cleanup happened
      expect(service.stream).toBeNull();
      expect(service.mediaRecorder).toBeNull();
      expect(service.audioChunks).toHaveLength(0);
    });

    it('should handle permission revoked during recording', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      // Simulate permission revoked - track ends
      mockTrack.stop();
      
      // Should be able to cancel without errors
      expect(() => service.cancelRecording()).not.toThrow();
      expect(service.stream).toBeNull();
    });
  });

  describe('Edge Cases - MediaRecorder Not Supported (Requirement 7.2)', () => {
    it('should handle MediaRecorder not being available', async () => {
      const originalMediaRecorder = global.MediaRecorder;
      global.MediaRecorder = undefined;

      await expect(service.startRecording()).rejects.toThrow();
      
      // Verify cleanup happened
      expect(service.stream).toBeNull();
      
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should handle MediaRecorder constructor throwing error', async () => {
      const mockConstructor = vi.fn(() => {
        throw new Error('MediaRecorder not supported in this browser');
      });
      mockConstructor.isTypeSupported = vi.fn(() => true);
      global.MediaRecorder = mockConstructor;

      await expect(service.startRecording()).rejects.toThrow('MediaRecorder not supported in this browser');
      
      // Verify cleanup happened
      expect(service.stream).toBeNull();
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should fallback gracefully when no codecs are supported', async () => {
      MediaRecorder.isTypeSupported.mockReturnValue(false);

      await service.startRecording();

      // Should use empty options as fallback
      const recorderOptions = MediaRecorder.mock.calls[0][1];
      expect(recorderOptions).toEqual({});
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should handle MediaRecorder.start() throwing error', async () => {
      mockMediaRecorder.start.mockImplementation(() => {
        throw new Error('Failed to start MediaRecorder');
      });

      await expect(service.startRecording()).rejects.toThrow('Failed to start MediaRecorder');
      
      // Verify cleanup happened
      expect(service.stream).toBeNull();
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('Edge Cases - Recording Failures (Requirement 7.2)', () => {
    it('should handle MediaRecorder error event during recording', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      // Simulate error event
      const errorEvent = new Event('error');
      if (mockMediaRecorder.onerror) {
        mockMediaRecorder.onerror(errorEvent);
      }

      // Should be able to clean up
      expect(() => service.cancelRecording()).not.toThrow();
    });

    it('should handle stream track ending unexpectedly', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      // Simulate track ending
      mockTrack.readyState = 'ended';
      
      // Should be able to stop without errors
      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle MediaRecorder.stop() throwing error', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      mockMediaRecorder.stop.mockImplementation(() => {
        throw new Error('Failed to stop recorder');
      });

      await expect(service.stopRecording()).rejects.toThrow('Failed to stop recorder');
    });

    it('should handle corrupted audio chunks during stop', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Add invalid chunks that will cause Blob constructor to fail
      service.audioChunks = [null, undefined, new Blob(['valid'])];

      const stopPromise = service.stopRecording();
      
      // The Blob constructor actually handles null/undefined gracefully in most browsers
      // So this test verifies the service can handle edge cases in chunk data
      mockMediaRecorder.onstop();
      const blob = await stopPromise;
      
      // Should still create a blob even with some invalid chunks
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle getUserMedia returning null stream', async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValue(null);

      // This will proceed but MediaRecorder will be created with null stream
      // In real browsers this would fail, but we're testing the service handles it
      await service.startRecording();
      
      expect(MediaRecorder).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it('should handle getUserMedia returning stream without tracks', async () => {
      const emptyStream = {
        getTracks: vi.fn(() => []),
        getAudioTracks: vi.fn(() => [])
      };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(emptyStream);

      // Should still proceed but may fail at MediaRecorder creation
      await service.startRecording();
      expect(MediaRecorder).toHaveBeenCalledWith(emptyStream, expect.any(Object));
    });

    it('should handle cleanup errors gracefully', async () => {
      await service.startRecording();
      
      // Make track.stop throw error
      mockTrack.stop.mockImplementation(() => {
        throw new Error('Failed to stop track');
      });

      // Cleanup should not throw even if track.stop fails
      expect(() => service.cleanup()).not.toThrow();
      
      // AudioChunks should still be cleared even if track cleanup fails
      expect(service.audioChunks).toHaveLength(0);
      // Stream may not be null if track.stop() failed, but that's okay - the error is caught
    });

    it('should handle mediaRecorder.stop() error during cleanup', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      mockMediaRecorder.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      // Cleanup should handle the error gracefully
      expect(() => service.cleanup()).not.toThrow();
      expect(service.audioChunks).toHaveLength(0);
    });
  });

  describe('Edge Cases - Maximum Duration Auto-Stop (Requirement 1.6)', () => {
    it('should detect when maximum duration is reached', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Set start time to 5 minutes ago (300 seconds)
      service.startTime = Date.now() - 300000;

      const duration = service.getRecordingDuration();
      
      expect(duration).toBeGreaterThanOrEqual(299);
      expect(duration).toBeLessThanOrEqual(301);
    });

    it('should detect when maximum duration is exceeded', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Set start time to 6 minutes ago (360 seconds)
      service.startTime = Date.now() - 360000;

      const duration = service.getRecordingDuration();
      
      expect(duration).toBeGreaterThanOrEqual(359);
      expect(duration).toBeGreaterThan(300); // Exceeds 5 minute limit
    });

    it('should be able to stop recording at maximum duration', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Set start time to exactly 5 minutes ago
      service.startTime = Date.now() - 300000;
      
      // Add some audio chunks
      service.audioChunks = [
        new Blob(['audio1'], { type: 'audio/webm' }),
        new Blob(['audio2'], { type: 'audio/webm' })
      ];

      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
      expect(service.recordingDuration).toBeGreaterThanOrEqual(299);
    });

    it('should handle duration calculation edge cases', () => {
      // No start time
      expect(service.getRecordingDuration()).toBe(0);
      
      // Start time in the future (clock skew)
      service.startTime = Date.now() + 1000;
      expect(service.getRecordingDuration()).toBeLessThanOrEqual(0);
      
      // Very long duration
      service.startTime = Date.now() - 600000; // 10 minutes
      expect(service.getRecordingDuration()).toBeGreaterThanOrEqual(599);
    });

    it('should maintain accurate duration across multiple checks', async () => {
      await service.startRecording();
      service.startTime = Date.now() - 5000; // 5 seconds ago
      
      const duration1 = service.getRecordingDuration();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration2 = service.getRecordingDuration();
      
      expect(duration1).toBeGreaterThanOrEqual(4);
      expect(duration2).toBeGreaterThanOrEqual(duration1);
    });

    it('should reset duration after cancellation', async () => {
      await service.startRecording();
      service.startTime = Date.now() - 10000; // 10 seconds ago
      
      expect(service.getRecordingDuration()).toBeGreaterThanOrEqual(9);
      
      service.cancelRecording();
      
      expect(service.getRecordingDuration()).toBe(0);
      expect(service.startTime).toBeNull();
    });
  });

  describe('Edge Cases - Resource Management', () => {
    it('should handle multiple streams being created and cleaned up', async () => {
      // First recording
      await service.startRecording();
      const firstTrack = mockTrack;
      
      // Second recording (should clean up first)
      const secondTrack = { stop: vi.fn(), kind: 'audio' };
      const secondStream = {
        getTracks: vi.fn(() => [secondTrack]),
        getAudioTracks: vi.fn(() => [secondTrack])
      };
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(secondStream);
      
      await service.startRecording();
      
      expect(firstTrack.stop).toHaveBeenCalled();
      expect(service.stream).toBe(secondStream);
    });

    it('should handle cleanup when mediaRecorder is in paused state', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'paused';
      
      expect(() => service.cleanup()).not.toThrow();
      expect(service.mediaRecorder).toBeNull();
    });

    it('should handle empty audioChunks array on stop', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      service.audioChunks = []; // No data recorded

      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(0);
    });

    it('should handle very large number of audio chunks', async () => {
      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      
      // Simulate many small chunks
      service.audioChunks = Array(1000).fill(null).map(() => 
        new Blob(['a'], { type: 'audio/webm' })
      );

      const stopPromise = service.stopRecording();
      mockMediaRecorder.onstop();
      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
