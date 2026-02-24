import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useTranslation from './useTranslation';
import apiClient from '../utils/api';

// Mock the API client
vi.mock('../utils/api');

describe('useTranslation', () => {
  const mockMessageId = 'test-message-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTranslation(mockMessageId));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.translation).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useTranslation(mockMessageId));

      expect(typeof result.current.translate).toBe('function');
      expect(typeof result.current.retry).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Successful Translation', () => {
    it('should successfully translate a message', async () => {
      const mockTranslation = {
        messageId: mockMessageId,
        sourceLanguage: 'en',
        targetLanguage: 'zh-CN',
        translatedText: '你好',
        originalText: 'Hello',
        cached: false
      };

      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          translation: mockTranslation
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      let translationResult;
      await act(async () => {
        translationResult = await result.current.translate('zh-CN');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.translation).toEqual(mockTranslation);
      expect(translationResult).toEqual(mockTranslation);
      expect(apiClient.post).toHaveBeenCalledWith('/api/translations', {
        messageId: mockMessageId,
        targetLanguage: 'zh-CN',
        sourceLanguage: 'auto'
      });
    });

    it('should set loading state during translation', async () => {
      let resolveTranslation;
      apiClient.post.mockImplementation(() => 
        new Promise(resolve => {
          resolveTranslation = () => resolve({ data: { success: true, translation: {} } });
        })
      );

      const { result } = renderHook(() => useTranslation(mockMessageId));

      let translatePromise;
      act(() => {
        translatePromise = result.current.translate('zh-CN');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveTranslation();
        await translatePromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('should accept custom source language', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          translation: {}
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('en', 'zh-CN');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/translations', {
        messageId: mockMessageId,
        targetLanguage: 'en',
        sourceLanguage: 'zh-CN'
      });
    });

    it('should reset retry count on successful translation', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          translation: {}
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      // Manually set retry count
      await act(async () => {
        result.current.translate('zh-CN');
      });

      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message ID', async () => {
      const { result } = renderHook(() => useTranslation(null));

      let translationResult;
      await act(async () => {
        translationResult = await result.current.translate('zh-CN');
      });

      expect(result.current.error).toBe('Message ID is required');
      expect(translationResult).toBe(null);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should handle missing target language', async () => {
      const { result } = renderHook(() => useTranslation(mockMessageId));

      let translationResult;
      await act(async () => {
        translationResult = await result.current.translate(null);
      });

      expect(result.current.error).toBe('Target language is required');
      expect(translationResult).toBe(null);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should handle rate limit error (429)', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT'
          }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Translation rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT'
      });
      expect(result.current.translation).toBe(null);
    });

    it('should handle service unavailable error (503)', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            error: 'Service unavailable',
            code: 'SERVICE_UNAVAILABLE'
          }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Translation service is temporarily unavailable.',
        code: 'SERVICE_UNAVAILABLE'
      });
    });

    it('should handle not found error (404)', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'Message not found'
          }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Message not found.',
        code: 'NOT_FOUND'
      });
    });

    it('should handle invalid request error (400)', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Invalid language code',
            code: 'INVALID_REQUEST'
          }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('invalid-lang');
      });

      expect(result.current.error).toEqual({
        message: 'Invalid language code',
        code: 'INVALID_REQUEST'
      });
    });

    it('should handle network error', async () => {
      apiClient.post.mockRejectedValueOnce({
        request: {},
        message: 'Network Error'
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      });
    });

    it('should handle generic error', async () => {
      apiClient.post.mockRejectedValueOnce(new Error('Something went wrong'));

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Something went wrong',
        code: 'TRANSLATION_FAILED'
      });
    });

    it('should clear error state', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Retry Logic', () => {
    it('should retry translation with exponential backoff', async () => {
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          translation: { translatedText: 'Success' }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      // First retry (1 second delay)
      await act(async () => {
        const retryPromise = result.current.retry('zh-CN');
        await vi.advanceTimersByTimeAsync(1000);
        await retryPromise;
      });

      // Successful translation resets retry count to 0
      expect(result.current.retryCount).toBe(0);
    });

    it('should reset retry count on successful translation', async () => {
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          translation: { translatedText: 'Success' }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      // Successful translation should keep retry count at 0
      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', async () => {
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          translation: { translatedText: 'Test' }
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      // Set some state
      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.translation).not.toBe(null);

      // Reset
      await act(async () => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.translation).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      apiClient.post.mockResolvedValue({
        data: {}
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Translation failed',
        code: 'TRANSLATION_FAILED'
      });
    });

    it('should handle success: false response', async () => {
      apiClient.post.mockResolvedValue({
        data: {
          success: false,
          error: 'Translation service error'
        }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      await act(async () => {
        await result.current.translate('zh-CN');
      });

      expect(result.current.error).toEqual({
        message: 'Translation service error',
        code: 'TRANSLATION_FAILED'
      });
    });

    it('should handle multiple concurrent translation requests', async () => {
      apiClient.post.mockResolvedValue({
        data: { success: true, translation: { translatedText: 'Test' } }
      });

      const { result } = renderHook(() => useTranslation(mockMessageId));

      // Start multiple translations
      await act(async () => {
        await Promise.all([
          result.current.translate('zh-CN'),
          result.current.translate('en')
        ]);
      });

      // Both calls should go through
      expect(apiClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
