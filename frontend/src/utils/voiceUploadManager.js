/**
 * VoiceUploadManager - Manages voice message uploads with progress tracking
 * 
 * Handles voice message uploads with progress tracking, error handling,
 * automatic retry for network errors, and timeout handling.
 * 
 * Requirements: 2.2, 2.3, 2.6, 7.4
 */

/**
 * @typedef {Object} VoiceUploadResult
 * @property {boolean} success - Whether upload succeeded
 * @property {string} [audioPath] - Supabase storage path
 * @property {string} [messageId] - Created message ID
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} VoiceUploadProgress
 * @property {number} progress - Upload progress (0-100)
 * @property {string} status - Upload status: 'uploading' | 'complete' | 'error'
 * @property {string} [errorMessage] - Error message if status is 'error'
 */

/**
 * Timeout for each upload in milliseconds (60 seconds)
 */
const UPLOAD_TIMEOUT = 60000;

/**
 * Manages voice message uploads to the backend with progress tracking
 */
export class VoiceUploadManager {
  constructor() {
    /**
     * Map of uploadId to AbortController for cancellation support
     * @type {Map<string, AbortController>}
     */
    this.abortControllers = new Map();
  }

  /**
   * Upload a voice message with progress tracking
   * 
   * @param {Blob} audioBlob - Audio blob to upload
   * @param {string} fileName - File name for the audio
   * @param {string} conversationId - Conversation ID
   * @param {(progress: number) => void} onProgress - Progress callback (0-100)
   * @param {number} duration - Audio duration in seconds
   * @returns {Promise<VoiceUploadResult>}
   */
  async uploadVoiceMessage(audioBlob, fileName, conversationId, onProgress, duration) {
    const uploadId = `${conversationId}_${Date.now()}`;
    
    try {
      // Attempt upload with retry on network error
      const result = await this.uploadWithRetry(
        uploadId,
        audioBlob,
        fileName,
        conversationId,
        onProgress,
        duration
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.abortControllers.delete(uploadId);
    }
  }

  /**
   * Upload with automatic retry on network errors (exponential backoff)
   * 
   * @param {string} uploadId - Unique upload identifier
   * @param {Blob} audioBlob - Audio blob to upload
   * @param {string} fileName - File name
   * @param {string} conversationId - Conversation ID
   * @param {(progress: number) => void} onProgress - Progress callback
   * @param {number} duration - Audio duration in seconds
   * @returns {Promise<VoiceUploadResult>}
   */
  async uploadWithRetry(uploadId, audioBlob, fileName, conversationId, onProgress, duration) {
    let lastError = null;
    const maxAttempts = 2; // Initial attempt + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.uploadSingleFile(
          uploadId,
          audioBlob,
          fileName,
          conversationId,
          onProgress,
          duration
        );
        return result;
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors, not on other errors (quota, permissions, etc.)
        const isNetworkError = 
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('timeout') ||
          error.message.toLowerCase().includes('timed out') ||
          error.message.toLowerCase().includes('fetch') ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK';

        if (isNetworkError && attempt < maxAttempts) {
          // Exponential backoff: 1s, 2s
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
   * Upload a single voice message file to the backend
   * 
   * @param {string} uploadId - Unique upload identifier
   * @param {Blob} audioBlob - Audio blob to upload
   * @param {string} fileName - File name
   * @param {string} conversationId - Conversation ID
   * @param {(progress: number) => void} onProgress - Progress callback
   * @param {number} duration - Audio duration in seconds
   * @returns {Promise<VoiceUploadResult>}
   */
  async uploadSingleFile(uploadId, audioBlob, fileName, conversationId, onProgress, duration) {
    // Create AbortController for cancellation support
    const abortController = new AbortController();
    this.abortControllers.set(uploadId, abortController);

    // Create File object from Blob
    const file = new File([audioBlob], fileName, { type: audioBlob.type });

    // Create FormData
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('conversationId', conversationId);
    formData.append('duration', Math.round(duration)); // Add duration in seconds

    // Setup timeout (60 seconds)
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, UPLOAD_TIMEOUT);

    try {
      // Use XMLHttpRequest for progress tracking
      const result = await this.uploadWithProgress(
        formData,
        onProgress,
        abortController.signal
      );

      clearTimeout(timeoutId);

      // Validate response contains all required metadata (Requirement 5.1)
      if (!result.message || !result.message.id || !result.message.sender || !result.message.created_at) {
        throw new Error('Server response missing required message metadata');
      }

      return {
        success: true,
        audioPath: result.message.audio_path,
        messageId: result.message.id,
        // Additional metadata available in result.message:
        // - sender: message sender (A or B)
        // - type: message type ('voice')
        // - created_at: ISO timestamp
        // - deleted: deletion flag
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
   * @param {FormData} formData - Form data with audio and conversationId
   * @param {(progress: number) => void} onProgress - Progress callback
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<any>} Upload response
   */
  uploadWithProgress(formData, onProgress, signal) {
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
          onProgress(progress);
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
      xhr.open('POST', `${API_URL}/api/voice-messages`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Cancel a specific upload
   * 
   * @param {string} uploadId - ID of the upload to cancel
   */
  cancelUpload(uploadId) {
    const controller = this.abortControllers.get(uploadId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(uploadId);
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
export const voiceUploadManager = new VoiceUploadManager();
