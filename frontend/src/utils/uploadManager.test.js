/**
 * Unit tests for UploadManager
 * 
 * Tests upload manager functionality including:
 * - Concurrent upload limit enforcement
 * - Upload cancellation
 * - Error handling structure
 * 
 * Requirements: 2.5, 7.3, 7.4, 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadManager } from './uploadManager.js';

describe('UploadManager', () => {
  let manager;

  beforeEach(() => {
    manager = new UploadManager();
    
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
    it('should cancel a specific upload by fileId', () => {
      // Setup mock abort controller
      const mockController = {
        abort: vi.fn(),
        signal: {}
      };
      
      manager.abortControllers.set('file-1', mockController);
      
      // Cancel the upload
      manager.cancelUpload('file-1');
      
      // Verify abort was called and controller was removed
      expect(mockController.abort).toHaveBeenCalled();
      expect(manager.abortControllers.has('file-1')).toBe(false);
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
      
      manager.abortControllers.set('file-1', mockController1);
      manager.abortControllers.set('file-2', mockController2);
      manager.abortControllers.set('file-3', mockController3);
      
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

  describe('uploadImages - concurrency control', () => {
    it('should respect MAX_CONCURRENT_UPLOADS constant', async () => {
      // Track concurrent uploads
      let currentConcurrent = 0;
      let maxConcurrent = 0;
      
      // Mock uploadSingleFile to track concurrency
      manager.uploadSingleFile = vi.fn(async (fileId) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        
        // Simulate upload time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        currentConcurrent--;
        
        return {
          fileId,
          success: true,
          imagePath: `path-${fileId}.jpg`
        };
      });

      // Create 6 files to upload (more than concurrency limit of 3)
      const files = Array.from({ length: 6 }, (_, i) => ({
        fileId: `file-${i}`,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        fileName: `test${i}.jpg`
      }));

      const progressCallback = vi.fn();
      await manager.uploadImages(files, progressCallback);

      // Verify concurrency never exceeded 3
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(maxConcurrent).toBeGreaterThan(0);
    });
  });

  describe('uploadWithRetry', () => {
    it('should retry on network errors', async () => {
      let attemptCount = 0;
      
      // Mock uploadSingleFile to fail first time with network error
      manager.uploadSingleFile = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          // Use error message that matches network error detection
          const error = new Error('Network timeout');
          throw error;
        }
        return {
          fileId: 'file-1',
          success: true,
          imagePath: 'test-path.jpg'
        };
      });

      const result = await manager.uploadWithRetry(
        'file-1',
        new Blob(['test'], { type: 'image/jpeg' }),
        'test.jpg',
        vi.fn()
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
          'file-1',
          new Blob(['test'], { type: 'image/jpeg' }),
          'test.jpg',
          vi.fn()
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
        throw new Error('Network timeout');
      });

      await expect(
        manager.uploadWithRetry(
          'file-1',
          new Blob(['test'], { type: 'image/jpeg' }),
          'test.jpg',
          vi.fn()
        )
      ).rejects.toThrow('Network timeout');

      // Should have tried twice (initial + 1 retry)
      expect(attemptCount).toBe(2);
    });
  });

  describe('uploadImages - error handling', () => {
    it('should continue uploading remaining files when one fails', async () => {
      let uploadCount = 0;
      
      // Mock uploadSingleFile to fail on second upload
      manager.uploadSingleFile = vi.fn(async (fileId) => {
        uploadCount++;
        
        if (fileId === 'file-2') {
          throw new Error('Upload failed');
        }
        
        return {
          fileId,
          success: true,
          imagePath: `path-${fileId}.jpg`
        };
      });

      const files = [
        {
          fileId: 'file-1',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          fileName: 'test1.jpg'
        },
        {
          fileId: 'file-2',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          fileName: 'test2.jpg'
        },
        {
          fileId: 'file-3',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          fileName: 'test3.jpg'
        }
      ];

      const progressCallback = vi.fn();
      const results = await manager.uploadImages(files, progressCallback);

      // Should have results for all files
      expect(results).toHaveLength(3);
      
      // First and third should succeed
      expect(results.find(r => r.fileId === 'file-1').success).toBe(true);
      expect(results.find(r => r.fileId === 'file-3').success).toBe(true);
      
      // Second should fail
      const failedResult = results.find(r => r.fileId === 'file-2');
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBeDefined();
    });

    it('should call progress callback with error status on failure', async () => {
      // Mock uploadSingleFile to fail
      manager.uploadSingleFile = vi.fn(async () => {
        throw new Error('Upload failed');
      });

      const files = [
        {
          fileId: 'file-1',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          fileName: 'test1.jpg'
        }
      ];

      const progressCallback = vi.fn();
      await manager.uploadImages(files, progressCallback);

      // Find error status call
      const errorCall = progressCallback.mock.calls.find(
        call => call[1].status === 'error'
      );
      
      expect(errorCall).toBeDefined();
      expect(errorCall[1].errorMessage).toBe('Upload failed');
    });
  });
});
