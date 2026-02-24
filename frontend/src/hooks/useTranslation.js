import { useState, useCallback } from 'react';
import apiClient from '../utils/api';

/**
 * Custom hook for managing message translation
 * @param {string} messageId - The ID of the message to translate
 * @returns {Object} Translation state and functions
 */
function useTranslation(messageId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Translate a message to the target language
   * @param {string} targetLanguage - Target language code ('en', 'zh-CN', 'zh-TW')
   * @param {string} [sourceLanguage='auto'] - Source language code or 'auto' for detection
   * @returns {Promise<Object|null>} Translation data or null on error
   */
  const translate = useCallback(async (targetLanguage, sourceLanguage = 'auto') => {
    if (!messageId) {
      setError('Message ID is required');
      return null;
    }

    if (!targetLanguage) {
      setError('Target language is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/translations', {
        messageId,
        targetLanguage,
        sourceLanguage
      });

      if (response.data.success) {
        setTranslation(response.data.translation);
        setRetryCount(0); // Reset retry count on success
        return response.data.translation;
      } else {
        throw new Error(response.data.error || 'Translation failed');
      }
    } catch (err) {
      // Handle different error types
      let errorMessage = 'Translation failed. Please try again.';
      let errorCode = 'TRANSLATION_FAILED';

      if (err.response) {
        // HTTP error response from server
        const status = err.response.status;
        const data = err.response.data;

        if (status === 429) {
          errorMessage = 'Translation rate limit exceeded. Please try again later.';
          errorCode = 'RATE_LIMIT';
        } else if (status === 503) {
          errorMessage = 'Translation service is temporarily unavailable.';
          errorCode = 'SERVICE_UNAVAILABLE';
        } else if (status === 404) {
          errorMessage = 'Message not found.';
          errorCode = 'NOT_FOUND';
        } else if (status === 400) {
          errorMessage = data.error || 'Invalid translation request.';
          errorCode = 'INVALID_REQUEST';
        } else if (data && data.error) {
          errorMessage = data.error;
          errorCode = data.code || 'TRANSLATION_FAILED';
        }
      } else if (err.request) {
        // Network error - no response received
        errorMessage = 'Network error. Please check your connection.';
        errorCode = 'NETWORK_ERROR';
      } else {
        // Other errors
        errorMessage = err.message || errorMessage;
      }

      setError({ message: errorMessage, code: errorCode });
      return null;
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  /**
   * Retry the last translation attempt
   * Implements exponential backoff for network errors
   * @param {string} targetLanguage - Target language code
   * @param {string} [sourceLanguage='auto'] - Source language code
   * @returns {Promise<Object|null>} Translation data or null on error
   */
  const retry = useCallback(async (targetLanguage, sourceLanguage = 'auto') => {
    // Limit retry attempts to prevent infinite loops
    if (retryCount >= 3) {
      setError({
        message: 'Maximum retry attempts reached. Please try again later.',
        code: 'MAX_RETRIES'
      });
      return null;
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    setRetryCount(prev => prev + 1);
    return translate(targetLanguage, sourceLanguage);
  }, [retryCount, translate]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all translation state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setTranslation(null);
    setRetryCount(0);
  }, []);

  return {
    translate,
    retry,
    clearError,
    reset,
    loading,
    error,
    translation,
    retryCount
  };
}

export default useTranslation;
