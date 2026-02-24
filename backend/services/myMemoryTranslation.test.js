import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { translateText, TranslationAPIError } from './myMemoryTranslation.js';

describe('MyMemory Translation API Integration', () => {
  let originalFetch;
  let mockFetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = global.fetch;
    
    // Create mock fetch
    mockFetch = mock.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('Input validation', () => {
    it('throws error for empty text', async () => {
      await assert.rejects(
        async () => await translateText('', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400,
          message: 'Text to translate is required'
        }
      );
    });

    it('throws error for whitespace-only text', async () => {
      await assert.rejects(
        async () => await translateText('   ', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400
        }
      );
    });

    it('throws error for null text', async () => {
      await assert.rejects(
        async () => await translateText(null, 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400
        }
      );
    });

    it('throws error for undefined text', async () => {
      await assert.rejects(
        async () => await translateText(undefined, 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400
        }
      );
    });

    it('throws error for invalid source language', async () => {
      await assert.rejects(
        async () => await translateText('Hello', 'invalid', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400,
          message: 'Invalid source language. Must be one of: en, zh-CN, zh-TW'
        }
      );
    });

    it('throws error for missing source language', async () => {
      await assert.rejects(
        async () => await translateText('Hello', null, 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400
        }
      );
    });

    it('throws error for invalid target language', async () => {
      await assert.rejects(
        async () => await translateText('Hello', 'en', 'invalid'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400,
          message: 'Invalid target language. Must be one of: en, zh-CN, zh-TW'
        }
      );
    });

    it('throws error for missing target language', async () => {
      await assert.rejects(
        async () => await translateText('Hello', 'en', null),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400
        }
      );
    });
  });

  describe('Successful translation', () => {
    it('translates English to Chinese (simplified)', async () => {
      // Mock successful API response
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '你好世界',
            match: 1
          },
          quotaFinished: false,
          responseStatus: 200
        })
      }));

      const result = await translateText('Hello world', 'en', 'zh-CN');
      
      assert.strictEqual(result, '你好世界');
      assert.strictEqual(mockFetch.mock.calls.length, 1);
      
      // Verify API was called with correct parameters
      const callUrl = mockFetch.mock.calls[0].arguments[0];
      assert.ok(callUrl.includes('q=Hello%20world'));
      assert.ok(callUrl.includes('langpair=en|zh-CN'));
    });

    it('translates English to Chinese (traditional)', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '你好世界',
            match: 1
          },
          quotaFinished: false,
          responseStatus: 200
        })
      }));

      const result = await translateText('Hello world', 'en', 'zh-TW');
      
      assert.strictEqual(result, '你好世界');
      
      const callUrl = mockFetch.mock.calls[0].arguments[0];
      assert.ok(callUrl.includes('langpair=en|zh-TW'));
    });

    it('translates Chinese to English', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: 'Hello world',
            match: 1
          },
          quotaFinished: false,
          responseStatus: 200
        })
      }));

      const result = await translateText('你好世界', 'zh-CN', 'en');
      
      assert.strictEqual(result, 'Hello world');
      
      const callUrl = mockFetch.mock.calls[0].arguments[0];
      assert.ok(callUrl.includes('langpair=zh-CN|en'));
    });

    it('handles text with special characters', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '你好！你好吗？',
            match: 1
          },
          quotaFinished: false,
          responseStatus: 200
        })
      }));

      const result = await translateText('Hello! How are you?', 'en', 'zh-CN');
      
      assert.strictEqual(result, '你好！你好吗？');
    });

    it('trims whitespace from translated text', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '  你好世界  ',
            match: 1
          },
          quotaFinished: false,
          responseStatus: 200
        })
      }));

      const result = await translateText('Hello world', 'en', 'zh-CN');
      
      assert.strictEqual(result, '你好世界');
    });
  });

  describe('Rate limit handling', () => {
    it('throws RATE_LIMIT error for 403 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'RATE_LIMIT',
          statusCode: 429,
          message: 'Translation rate limit exceeded. Please try again later.'
        }
      );
    });

    it('throws RATE_LIMIT error for 429 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 429,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'RATE_LIMIT',
          statusCode: 429
        }
      );
    });

    it('throws RATE_LIMIT error when quotaFinished is true', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: 'Translation'
          },
          quotaFinished: true,
          responseStatus: 403
        })
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'RATE_LIMIT',
          statusCode: 429,
          message: 'Translation rate limit exceeded. Please try again later.'
        }
      );
    });
  });

  describe('Service unavailable handling', () => {
    it('throws SERVICE_UNAVAILABLE error for 500 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503,
          message: 'Translation service is temporarily unavailable.'
        }
      );
    });

    it('throws SERVICE_UNAVAILABLE error for 502 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 502,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503
        }
      );
    });

    it('throws SERVICE_UNAVAILABLE error for 503 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 503,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503
        }
      );
    });

    it('throws SERVICE_UNAVAILABLE error for 504 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 504,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503
        }
      );
    });
  });

  describe('Bad request handling', () => {
    it('throws INVALID_INPUT error for 400 status', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({})
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_INPUT',
          statusCode: 400,
          message: 'Invalid translation request. Please check language codes.'
        }
      );
    });
  });

  describe('Network error handling', () => {
    it('throws NETWORK_ERROR for fetch failure', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.reject(new TypeError('fetch failed'))
      );

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'NETWORK_ERROR',
          statusCode: 503,
          message: 'Network error. Please check your connection.'
        }
      );
    });

    it('throws NETWORK_ERROR for timeout', async () => {
      mockFetch.mock.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        })
      );

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'NETWORK_ERROR',
          statusCode: 503,
          message: 'Translation request timed out. Please try again.'
        }
      );
    });
  });

  describe('Invalid response handling', () => {
    it('throws INVALID_RESPONSE for non-JSON response', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_RESPONSE',
          statusCode: 500,
          message: 'Failed to parse translation API response'
        }
      );
    });

    it('throws INVALID_RESPONSE for null response data', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => null
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_RESPONSE',
          statusCode: 500,
          message: 'Invalid response format from translation API'
        }
      );
    });

    it('throws INVALID_RESPONSE for missing responseData', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          quotaFinished: false
        })
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_RESPONSE',
          statusCode: 500,
          message: 'Translation API did not return translated text'
        }
      );
    });

    it('throws INVALID_RESPONSE for missing translatedText', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {},
          quotaFinished: false
        })
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_RESPONSE',
          statusCode: 500,
          message: 'Translation API did not return translated text'
        }
      );
    });

    it('throws INVALID_RESPONSE for empty translated text', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '   '
          },
          quotaFinished: false
        })
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'INVALID_RESPONSE',
          statusCode: 500,
          message: 'Translation API returned empty text'
        }
      );
    });
  });

  describe('Requirements validation', () => {
    // Requirement 3.3: Call MyMemory API with message text and language parameters
    it('calls MyMemory API with correct parameters', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '你好'
          },
          quotaFinished: false
        })
      }));

      await translateText('Hello', 'en', 'zh-CN');
      
      const callUrl = mockFetch.mock.calls[0].arguments[0];
      assert.ok(callUrl.includes('api.mymemory.translated.net/get'));
      assert.ok(callUrl.includes('q=Hello'));
      assert.ok(callUrl.includes('langpair=en|zh-CN'));
    });

    // Requirement 3.4: Return translated text to client
    it('returns translated text from API', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          responseData: {
            translatedText: '你好世界'
          },
          quotaFinished: false
        })
      }));

      const result = await translateText('Hello world', 'en', 'zh-CN');
      assert.strictEqual(result, '你好世界');
    });

    // Requirement 3.5: Return appropriate error response on API failure
    it('returns appropriate error for API failures', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 500
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          name: 'TranslationAPIError',
          code: 'SERVICE_UNAVAILABLE'
        }
      );
    });

    // Requirement 6.1: Display user-friendly error for service unavailable
    it('provides user-friendly error message for service unavailable', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 503
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          message: 'Translation service is temporarily unavailable.'
        }
      );
    });

    // Requirement 6.2: Display message for rate limit exceeded
    it('provides message for rate limit exceeded', async () => {
      mockFetch.mock.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 429
      }));

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          message: 'Translation rate limit exceeded. Please try again later.'
        }
      );
    });

    // Requirement 6.3: Display message for network errors
    it('provides message for network errors', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.reject(new TypeError('fetch failed'))
      );

      await assert.rejects(
        async () => await translateText('Hello', 'en', 'zh-CN'),
        {
          message: 'Network error. Please check your connection.'
        }
      );
    });
  });
});
