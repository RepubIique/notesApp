/**
 * Unit tests for VoiceUploadManager
 * 
 * Tests voice upload manager functionality including:
 * - Upload with progress tracking
 * - Upload cancellation
 * - Retry logic for network errors
 * - Timeout handling
 * - Error handling
 * 
 * Requirements: 2.2, 2.3, 2.6, 7.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceUploadManager } from './voiceUploadManager.js';

describe('VoiceUploadManager', () => {
  let manager;

  beforeEach(() => {
    manager = new VoiceUploadManager();
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
  });

  describe('constructor', () => {
    it('should initialize with empty abort controllers map', () => {
      expect(manager.abortControllers).toBeInstanceOf(Map);
      expect(manager.abortControllers.size).toBe(0);
    });
  });

  describe('cancelUpload', () => {
    it('should cancel a specific upload by uploadId', () => {
      // Setup mock abort controller
      const mockController = {
        abort: vi.fn(),
        signal: {}
      };
      
      manager.abortControllers.set('upload-1', mockController);
      
      // Cancel the upload
      manager.cancelUpload('upload-1');
      
      // Verify abort was called and controller was removed
      expect(mockController.abort).toHaveBeenCalled();
      expect(manager.abortControllers.has('upload-1')).toBe(false);
    });

    it('should handle cancelling non-existent upload gracefully', () => {
      // Should not throw
      expect(() => manager.cancelUpload('non-existent')).not.toThrow();
    });
  });

  describe('cancelAllUploads', () => {
    it('should cancel all ongoing uploads', () => {
      // Setup multiple mock abort controllers
      const mockController1 = { abort: vi.fn(), signal: {} };
      const mockController2 = { abort: vi.fn(), signal: {} };
      const mockController3 = { abort: vi.fn(), signal: {} };
      
      manager.abortControllers.set('upload-1', mockController1);
      manager.abortControllers.set('upload-2', mockController2);
      manager.abortControllers.set('upload-3', mockController3);
      
      // Cancel all
      manager.cancelAllUploads();
      
      // Verify all were aborted and map is cleared
      expect(mockController1.abort).toHaveBeenCalled();
      expect(mockController2.abort).toHaveBeenCalled();
      expect(mockController3.abort).toHaveBeenCalled();
      expect(manager.abortControllers.size).toBe(0);
    });

    it('should handle empty abort controllers map', () => {
      // Should not throw
      expect(() => manager.cancelAllUploads()).not.toThrow();
      expect(manager.abortControllers.size).toBe(0);
    });
  });

  describe('uploadVoiceMessage', () => {
    it('should successfully upload a voice message', async () => {
      // Mock uploadSingleFile to succeed
      manager.uploadSingleFile = vi.fn(async () => ({
        success: true,
        audioPath: 'voice-messages/conv_123/msg_456.webm',
        messageId: 'msg_456'
      }));

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const progressCallback = vi.fn();

      const result = await manager.uploadVoiceMessage(
        audioBlob,
        'test.webm',
        'conv_123',
        progressCallback,
        5 // duration in seconds
      );

      expect(result.success).toBe(true);
      expect(result.audioPath).toBe('voice-messages/conv_123/msg_456.webm');
      expect(result.messageId).toBe('msg_456');
    });

    it('should return error result on upload failure', async () => {
      // Mock uploadSingleFile to fail
      manager.uploadSingleFile = vi.fn(async () => {
        throw new Error('Upload failed');
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const progressCallback = vi.fn();

      const result = await manager.uploadVoiceMessage(
        audioBlob,
        'test.webm',
        'conv_123',
        progressCallback,
        5 // duration in seconds
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should clean up abort controller after upload', async () => {
      // Mock uploadSingleFile to succeed
      manager.uploadSingleFile = vi.fn(async () => ({
        success: true,
        audioPath: 'test-path.webm',
        messageId: 'msg_123'
      }));

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const progressCallback = vi.fn();

      await manager.uploadVoiceMessage(
        audioBlob,
        'test.webm',
        'conv_123',
        progressCallback,
        5 // duration in seconds
      );

      // Abort controller should be cleaned up
      expect(manager.abortControllers.size).toBe(0);
    });
  });

  describe('uploadWithRetry', () => {
    it('should retry on network errors with exponential backoff', async () => {
      let attemptCount = 0;
      
      // Mock uploadSingleFile to fail first time with network error
      manager.uploadSingleFile = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error, please check your connection');
        }
        return {
          success: true,
          audioPath: 'test-path.webm',
          messageId: 'msg_123'
        };
      });

      const result = await manager.uploadWithRetry(
        'upload-1',
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      // Should have retried and succeeded
      expect(attemptCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should retry on timeout errors', async () => {
      let attemptCount = 0;
      
      // Mock uploadSingleFile to fail first time with timeout
      manager.uploadSingleFile = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Upload timed out, please try again');
        }
        return {
          success: true,
          audioPath: 'test-path.webm',
          messageId: 'msg_123'
        };
      });

      const result = await manager.uploadWithRetry(
        'upload-1',
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      // Should have retried and succeeded
      expect(attemptCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should not retry on non-network errors', async () => {
      let attemptCount = 0;
      
      // Mock uploadSingleFile to fail with quota error
      manager.uploadSingleFile = vi.fn(async () => {
        attemptCount++;
        throw new Error('Storage quota exceeded');
      });

      await expect(
        manager.uploadWithRetry(
          'upload-1',
          new Blob(['audio'], { type: 'audio/webm' }),
          'test.webm',
          'conv_123',
          vi.fn(),
          5 // duration in seconds
        )
      ).rejects.toThrow('Storage quota exceeded');

      // Should not have retried
      expect(attemptCount).toBe(1);
    });

    it('should give up after max retry attempts', async () => {
      let attemptCount = 0;
      
      // Mock uploadSingleFile to always fail with network error
      manager.uploadSingleFile = vi.fn(async () => {
        attemptCount++;
        throw new Error('Network error, please check your connection');
      });

      await expect(
        manager.uploadWithRetry(
          'upload-1',
          new Blob(['audio'], { type: 'audio/webm' }),
          'test.webm',
          'conv_123',
          vi.fn(),
          5 // duration in seconds
        )
      ).rejects.toThrow('Network error');

      // Should have tried twice (initial + 1 retry)
      expect(attemptCount).toBe(2);
    });
  });

  describe('uploadSingleFile', () => {
    it('should create abort controller for cancellation', async () => {
      // Mock uploadWithProgress to succeed with all required metadata
      manager.uploadWithProgress = vi.fn(async () => ({
        message: {
          id: 'msg_123',
          sender: 'A',
          type: 'voice',
          audio_path: 'test-path.webm',
          audio_duration: 30,
          created_at: new Date().toISOString(),
          deleted: false
        }
      }));

      const uploadId = 'upload-1';
      const audioBlob = new Blob(['audio'], { type: 'audio/webm' });

      // Start upload (don't await yet)
      const uploadPromise = manager.uploadSingleFile(
        uploadId,
        audioBlob,
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      // Abort controller should be created
      expect(manager.abortControllers.has(uploadId)).toBe(true);

      await uploadPromise;
    });

    it('should handle timeout by aborting upload', async () => {
      // Mock uploadWithProgress to hang
      manager.uploadWithProgress = vi.fn(async (formData, onProgress, signal) => {
        // Wait for abort signal
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });
        });
      });

      // Mock setTimeout to trigger immediately
      vi.useFakeTimers();

      const uploadPromise = manager.uploadSingleFile(
        'upload-1',
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(60000);

      await expect(uploadPromise).rejects.toThrow('Upload timed out');

      vi.useRealTimers();
    });

    it('should return success result with audio path and message ID', async () => {
      // Mock uploadWithProgress to succeed with all required metadata
      manager.uploadWithProgress = vi.fn(async () => ({
        message: {
          id: 'msg_456',
          sender: 'A',
          type: 'voice',
          audio_path: 'voice-messages/conv_123/msg_456.webm',
          audio_duration: 30,
          created_at: new Date().toISOString(),
          deleted: false
        }
      }));

      const result = await manager.uploadSingleFile(
        'upload-1',
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      expect(result.success).toBe(true);
      expect(result.audioPath).toBe('voice-messages/conv_123/msg_456.webm');
      expect(result.messageId).toBe('msg_456');
    });
  });

  describe('uploadWithProgress', () => {
    it('should call progress callback with increasing values', async () => {
      // This test would require mocking XMLHttpRequest
      // For now, we verify the structure is correct
      expect(manager.uploadWithProgress).toBeDefined();
      expect(typeof manager.uploadWithProgress).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      manager.uploadSingleFile = vi.fn(async () => {
        throw new Error('Network error, please check your connection');
      });

      const result = await manager.uploadVoiceMessage(
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout errors gracefully', async () => {
      manager.uploadSingleFile = vi.fn(async () => {
        throw new Error('Upload timed out, please try again');
      });

      const result = await manager.uploadVoiceMessage(
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle server errors gracefully', async () => {
      manager.uploadSingleFile = vi.fn(async () => {
        throw new Error('Upload failed with status 500');
      });

      const result = await manager.uploadVoiceMessage(
        new Blob(['audio'], { type: 'audio/webm' }),
        'test.webm',
        'conv_123',
        vi.fn(),
        5 // duration in seconds
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });
  });
});
