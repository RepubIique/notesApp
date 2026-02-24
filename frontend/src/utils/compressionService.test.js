/**
 * Unit tests for CompressionService
 * 
 * Tests compression worker integration, error handling, and fallback behavior.
 * Requirements: 3.1, 7.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { compressionService } from './compressionService';

// Mock Worker API for testing
class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(data) {
    // Store for verification
    this.lastMessage = data;
  }

  terminate() {
    // Mock terminate
  }

  // Helper to simulate worker response
  simulateResponse(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Helper to simulate worker error
  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

describe('CompressionService', () => {
  let originalWorker;

  beforeEach(() => {
    // Save original Worker
    originalWorker = global.Worker;
    
    // Mock Worker constructor
    global.Worker = vi.fn(function() {
      return new MockWorker();
    });
    
    // Clean up any existing worker
    compressionService.terminate();
  });

  afterEach(() => {
    compressionService.terminate();
    
    // Restore original Worker
    global.Worker = originalWorker;
  });

  it('should initialize worker on first compression request', () => {
    expect(compressionService.worker).toBeNull();
    
    // Create a mock image file
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Start compression (will initialize worker)
    compressionService.compressImage('test-1', mockFile);
    
    expect(compressionService.worker).not.toBeNull();
    expect(global.Worker).toHaveBeenCalled();
  });

  it('should handle multiple compression requests', () => {
    const mockFile1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const mockFile2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    
    compressionService.compressImage('file-1', mockFile1);
    compressionService.compressImage('file-2', mockFile2);
    
    expect(compressionService.pendingRequests.size).toBe(2);
    expect(compressionService.pendingRequests.has('file-1')).toBe(true);
    expect(compressionService.pendingRequests.has('file-2')).toBe(true);
  });

  it('should clean up pending requests on terminate', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    compressionService.compressImage('test-1', mockFile);
    expect(compressionService.pendingRequests.size).toBe(1);
    
    compressionService.terminate();
    
    expect(compressionService.pendingRequests.size).toBe(0);
    expect(compressionService.worker).toBeNull();
  });

  it('should not create multiple workers', () => {
    compressionService.initWorker();
    const firstWorker = compressionService.worker;
    
    compressionService.initWorker();
    const secondWorker = compressionService.worker;
    
    expect(firstWorker).toBe(secondWorker);
  });

  it('should handle successful compression response', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const compressionPromise = compressionService.compressImage('test-1', mockFile);
    
    // Simulate worker response
    const mockBlob = new Blob(['compressed'], { type: 'image/jpeg' });
    compressionService.worker.simulateResponse({
      type: 'success',
      fileId: 'test-1',
      compressedBlob: mockBlob,
      originalSize: 1000,
      compressedSize: 500,
      usedOriginal: false,
      compressionRatio: 0.5,
    });
    
    const result = await compressionPromise;
    
    expect(result.compressedBlob).toBe(mockBlob);
    expect(result.originalSize).toBe(1000);
    expect(result.compressedSize).toBe(500);
    expect(result.usedOriginal).toBe(false);
    expect(result.compressionRatio).toBe(0.5);
  });

  it('should handle compression error response', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const compressionPromise = compressionService.compressImage('test-1', mockFile);
    
    // Simulate worker error response
    compressionService.worker.simulateResponse({
      type: 'error',
      fileId: 'test-1',
      error: 'Compression failed',
    });
    
    await expect(compressionPromise).rejects.toThrow('Compression failed');
  });

  it('should handle worker error event', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const compressionPromise = compressionService.compressImage('test-1', mockFile);
    
    // Simulate worker error event
    compressionService.worker.simulateError(new Error('Worker crashed'));
    
    await expect(compressionPromise).rejects.toThrow('Worker error');
  });

  it('should send correct message to worker', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const options = { maxWidthOrHeight: 1920, initialQuality: 0.85 };
    
    compressionService.compressImage('test-1', mockFile, options);
    
    expect(compressionService.worker.lastMessage).toEqual({
      type: 'compress',
      fileId: 'test-1',
      file: mockFile,
      options,
    });
  });
});
