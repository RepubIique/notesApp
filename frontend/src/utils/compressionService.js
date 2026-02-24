/**
 * CompressionService - Interface for image compression using Web Worker
 * 
 * Provides a clean API for compressing images without blocking the main thread.
 * Manages worker lifecycle and message passing.
 * 
 * Requirements: 3.1, 3.2, 3.3, 8.1
 */

class CompressionService {
  constructor() {
    this.worker = null;
    this.pendingRequests = new Map();
  }

  /**
   * Initialize the compression worker
   */
  initWorker() {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      new URL('../workers/compressionWorker.js', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event) => {
      const { type, fileId, compressedBlob, originalSize, compressedSize, usedOriginal, compressionRatio, error } = event.data;
      
      const request = this.pendingRequests.get(fileId);
      if (!request) {
        return;
      }

      this.pendingRequests.delete(fileId);

      if (type === 'success') {
        request.resolve({
          compressedBlob,
          originalSize,
          compressedSize,
          usedOriginal,
          compressionRatio,
          error,
        });
      } else if (type === 'error') {
        request.reject(new Error(error || 'Compression failed'));
      }
    };

    this.worker.onerror = (error) => {
      console.error('Compression worker error:', error);
      // Reject all pending requests
      for (const [fileId, request] of this.pendingRequests.entries()) {
        request.reject(new Error('Worker error: ' + error.message));
        this.pendingRequests.delete(fileId);
      }
    };
  }

  /**
   * Compress an image file
   * 
   * @param {string} fileId - Unique identifier for this compression request
   * @param {File} file - Image file to compress
   * @param {Object} options - Compression options (optional)
   * @returns {Promise<Object>} Compression result with compressedBlob and metadata
   */
  compressImage(fileId, file, options = {}) {
    this.initWorker();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(fileId, { resolve, reject });

      this.worker.postMessage({
        type: 'compress',
        fileId,
        file,
        options,
      });
    });
  }

  /**
   * Terminate the worker and clean up resources
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const compressionService = new CompressionService();
