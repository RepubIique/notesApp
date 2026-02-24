/**
 * UploadManager - Manages concurrent image uploads with progress tracking
 * 
 * Handles batch uploads with a concurrency limit, progress tracking,
 * error handling, and automatic retry for network errors.
 * 
 * Requirements: 2.1, 5.3, 5.4, 5.5, 7.3, 7.4, 8.4
 */

import { imageAPI } from './api.js';

/**
 * @typedef {import('../types/upload').UploadResult} UploadResult
 * @typedef {import('../types/upload').UploadProgress} UploadProgress
 */

/**
 * Maximum number of concurrent uploads
 */
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Timeout for each upload in milliseconds (60 seconds)
 */
const UPLOAD_TIMEOUT = 60000;

/**
 * Manages concurrent uploads to the backend with progress tracking
 */
export class UploadManager {
  constructor() {
    /**
     * Map of fileId to AbortController for cancellation support
     * @type {Map<string, AbortController>}
     */
    this.abortControllers = new Map();
  }

  /**
   * Upload multiple images with concurrency control
   * 
   * @param {Array<{fileId: string, blob: Blob, fileName: string}>} files - Files to upload
   * @param {(fileId: string, progress: UploadProgress) => void} onProgress - Progress callback
   * @returns {Promise<UploadResult[]>} Results for each file
   */
  async uploadImages(files, onProgress) {
    const results = [];
    const queue = [...files];
    const inProgress = new Set();

    /**
     * Process a single file upload
     * @param {{fileId: string, blob: Blob, fileName: string}} fileData
     * @returns {Promise<UploadResult>}
     */
    const processUpload = async (fileData) => {
      const { fileId, blob, fileName } = fileData;
      
      try {
        // Mark as uploading
        onProgress(fileId, {
          fileId,
          fileName,
          progress: 0,
          status: 'uploading'
        });

        // Attempt upload with retry on network error
        const result = await this.uploadWithRetry(fileId, blob, fileName, onProgress);
        
        // Mark as complete
        onProgress(fileId, {
          fileId,
          fileName,
          progress: 100,
          status: 'complete'
        });

        return result;
      } catch (error) {
        // Mark as error
        onProgress(fileId, {
          fileId,
          fileName,
          progress: 0,
          status: 'error',
          errorMessage: error.message
        });

        return {
          fileId,
          success: false,
          error: error.message
        };
      } finally {
        inProgress.delete(fileId);
        this.abortControllers.delete(fileId);
      }
    };

    /**
     * Start next upload from queue if under concurrency limit
     */
    const startNext = async () => {
      if (queue.length === 0 || inProgress.size >= MAX_CONCURRENT_UPLOADS) {
        return;
      }

      const fileData = queue.shift();
      inProgress.add(fileData.fileId);
      
      const result = await processUpload(fileData);
      results.push(result);
      
      // Start next upload
      await startNext();
    };

    // Start initial batch of uploads (up to MAX_CONCURRENT_UPLOADS)
    const initialBatch = Math.min(MAX_CONCURRENT_UPLOADS, files.length);
    const promises = [];
    
    for (let i = 0; i < initialBatch; i++) {
      promises.push(startNext());
    }

    // Wait for all uploads to complete
    await Promise.all(promises);

    return results;
  }

  /**
   * Upload a single file with automatic retry on network errors
   * 
   * @param {string} fileId - Unique file identifier
   * @param {Blob} blob - File blob to upload
   * @param {string} fileName - Original file name
   * @param {(fileId: string, progress: UploadProgress) => void} onProgress - Progress callback
   * @returns {Promise<UploadResult>}
   */
  async uploadWithRetry(fileId, blob, fileName, onProgress) {
    let lastError = null;
    const maxAttempts = 2; // Initial attempt + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.uploadSingleFile(fileId, blob, fileName, onProgress);
        return result;
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors, not on other errors (quota, permissions, etc.)
        const isNetworkError = 
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('fetch') ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK';

        if (isNetworkError && attempt < maxAttempts) {
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // Don't retry for non-network errors or if max attempts reached
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Upload a single file to the backend
   * 
   * @param {string} fileId - Unique file identifier
   * @param {Blob} blob - File blob to upload
   * @param {string} fileName - Original file name
   * @param {(fileId: string, progress: UploadProgress) => void} onProgress - Progress callback
   * @returns {Promise<UploadResult>}
   */
  async uploadSingleFile(fileId, blob, fileName, onProgress) {
    // Create AbortController for cancellation support
    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    // Create File object from Blob
    const file = new File([blob], fileName, { type: blob.type });

    // Create FormData
    const formData = new FormData();
    formData.append('image', file);

    // Setup timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, UPLOAD_TIMEOUT);

    try {
      // Use XMLHttpRequest for progress tracking
      const result = await this.uploadWithProgress(
        formData,
        fileId,
        fileName,
        onProgress,
        abortController.signal
      );

      clearTimeout(timeoutId);

      return {
        fileId,
        success: true,
        imagePath: result.message.image_path
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        throw new Error('Upload timed out, please try again');
      }

      throw error;
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   * 
   * @param {FormData} formData - Form data with image
   * @param {string} fileId - Unique file identifier
   * @param {string} fileName - Original file name
   * @param {(fileId: string, progress: UploadProgress) => void} onProgress - Progress callback
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<any>} Upload response
   */
  uploadWithProgress(formData, fileId, fileName, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(fileId, {
            fileId,
            fileName,
            progress,
            status: 'uploading'
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error, please check your connection'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Get API URL and token
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('auth_token');

      // Open and send request
      xhr.open('POST', `${API_URL}/api/images`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Cancel a specific upload
   * 
   * @param {string} fileId - ID of the file to cancel
   */
  cancelUpload(fileId) {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }
  }

  /**
   * Cancel all ongoing uploads
   */
  cancelAllUploads() {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}

// Export singleton instance
export const uploadManager = new UploadManager();
